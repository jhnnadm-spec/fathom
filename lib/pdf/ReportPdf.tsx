/**
 * The downloadable PDF version of a company page. Same content as the website,
 * laid out for reading offline: every point carries a [number] that matches
 * the numbered source list at the end, and AI-written points also show the
 * exact words from the report they came from.
 *
 * Live market data (share price, market value, news) comes from TradingView
 * widgets, which may only be shown on the website, so the PDF points there.
 */
import path from "node:path";
import { Circle, ClipPath, Defs, Document, Font, G, Line, Link, Page, Path, Rect, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import { cloneElement, Fragment, isValidElement, type ReactElement, type ReactNode } from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import type { CheckedClaim, SavedExplanation, TopicId } from "../explain/types";
import { formatDate, formatMoney, formatPerDollar, formatPercent, formatPerShare, formatShare } from "../financials/format";
import type { Comparison } from "../financials/metrics";
import { plainText, termsIn, type Statement } from "../financials/templates";
import { lookupTerm } from "../glossary";
import type { CompanyReport } from "../report/company";
import { leftOutNames } from "../report/outline";

// ---------------------------------------------------------------- fonts and colours

const FONTS = path.join(process.cwd(), "lib", "pdf", "fonts");
Font.register({
  family: "Figtree",
  fonts: [
    { src: path.join(FONTS, "figtree-400.woff"), fontWeight: 400 },
    { src: path.join(FONTS, "figtree-600.woff"), fontWeight: 600 },
    { src: path.join(FONTS, "figtree-700.woff"), fontWeight: 700 },
  ],
});
Font.register({ family: "Bricolage", src: path.join(FONTS, "bricolage-700.woff"), fontWeight: 700 });
Font.registerHyphenationCallback((word) => [word]); // never split words across lines

const C = {
  ink: "#0A2A3A",
  muted: "#55707E",
  line: "#DCE8EE",
  mist: "#F2F8FA",
  ocean: "#0B4F6C",
  mid: "#2F8FB3",
  shallow: "#7FC4D8",
  surface: "#CDE7F0",
  label: "#2F7A99",
};

const s = StyleSheet.create({
  page: { paddingTop: 44, paddingBottom: 64, paddingHorizontal: 48, fontFamily: "Figtree", fontSize: 10.5, color: C.ink, lineHeight: 1.45 },
  footer: { position: "absolute", bottom: 26, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: C.muted, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8 },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 26 },
  brand: { flexDirection: "row", alignItems: "center", gap: 7 },
  brandName: { fontFamily: "Bricolage", fontWeight: 700, fontSize: 16 },
  title: { fontFamily: "Bricolage", fontWeight: 700, fontSize: 28, lineHeight: 1.15 },
  chip: { alignSelf: "flex-start", backgroundColor: "#E1F0F5", color: C.ocean, fontWeight: 600, fontSize: 10, paddingVertical: 3, paddingHorizontal: 7, borderRadius: 5, marginTop: 8 },
  meta: { color: C.muted, fontSize: 10, marginTop: 5 },
  box: { backgroundColor: C.mist, borderRadius: 8, padding: 12, marginTop: 16, fontSize: 9.5, color: C.muted },
  strong: { fontWeight: 700, color: C.ink },
  level: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 26, marginBottom: 4, paddingBottom: 6, borderBottomWidth: 2, borderBottomColor: C.ink },
  levelDot: { width: 10, height: 10, borderRadius: 3 },
  levelName: { fontFamily: "Bricolage", fontWeight: 700, fontSize: 18 },
  levelHint: { color: C.muted, fontSize: 10, marginLeft: 4 },
  h2: { fontSize: 9, fontWeight: 700, color: C.label, letterSpacing: 1, textTransform: "uppercase", marginTop: 16, marginBottom: 2 },
  note: { color: C.muted, fontSize: 9, marginBottom: 6 },
  h3: { fontFamily: "Bricolage", fontWeight: 700, fontSize: 12, marginTop: 10, marginBottom: 4 },
  point: { flexDirection: "row", gap: 6, marginBottom: 6 },
  bullet: { width: 8, color: C.mid },
  ref: { fontSize: 7.5, color: C.mid },
  quote: { fontSize: 8.5, color: C.muted, marginTop: 2, fontStyle: "normal" },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 5 },
  th: { fontSize: 8.5, fontWeight: 600, color: C.muted },
  aiNote: { backgroundColor: C.mist, borderRadius: 6, padding: 8, marginTop: 6, fontSize: 8.5, color: C.muted },
  link: { color: C.ocean, textDecoration: "none" },
});

// ---------------------------------------------------------------- numbered sources

/** Hands out [1], [2]… in the order sources first appear, so the list at the end matches. */
class SourceList {
  readonly items: { label: string; url: string }[] = [];
  private seen = new Map<string, number>();
  ref(label: string, url: string): number {
    const base = url.split("#")[0]; // highlight links are long; the list shows the document itself
    const key = `${label}|${base}`;
    let n = this.seen.get(key);
    if (!n) {
      this.items.push({ label, url: base });
      n = this.items.length;
      this.seen.set(key, n);
    }
    return n;
  }
}

// ---------------------------------------------------------------- the document

export type PdfInput = {
  report: CompanyReport;
  explanation?: SavedExplanation;
  pageUrl: string; // the live page on the Fathom website
  createdAt: Date;
};

/** Called as a plain function (not <ReportPdf/>) so the PDF renderer receives the <Document> directly. */
export function ReportPdf({ report, explanation: e, pageUrl, createdAt }: PdfInput): ReactElement<DocumentProps> {
  // Everything below is built with plain function calls, top to bottom, so source numbers follow reading order.
  const src = new SourceList();
  const terms = new Set<string>();
  const ctx: Ctx = { report, e, src, terms };
  const created = formatDate(createdAt.toISOString().slice(0, 10));

  const body = (
    <>
      {cover(ctx, created, pageUrl)}
      {surface(ctx)}
      {below(ctx)}
      {deep(ctx, pageUrl)}
      {announcements(ctx)}
    </>
  );
  const glossary = glossarySection(ctx);
  const sources = sourcesSection(ctx);

  return (
    <Document title={`${report.company.name} (${report.company.ticker}) explained · Fathom`} author="Fathom" subject="Plain-English company report" creator="Fathom" producer="Fathom">
      <Page size="A4" style={s.page}>
        <View fixed style={s.footer}>
          <Text>Fathom · {report.company.ticker} · Not financial advice: for education only.</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
        {body}
        {glossary}
        {sources}
      </Page>
    </Document>
  );
}

type Ctx = { report: CompanyReport; e?: SavedExplanation; src: SourceList; terms: Set<string> };

// ---------------------------------------------------------------- building blocks

function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <ClipPath id="fathom-clip">
          <Rect x={6} y={6} width={88} height={88} rx={22} ry={22} />
        </ClipPath>
      </Defs>
      <G clipPath="url(#fathom-clip)">
        <Rect x={0} y={0} width={100} height={100} fill={C.surface} />
        <Path d="M0 30 Q25 24 50 30 T100 30 V100 H0 Z" fill={C.shallow} />
        <Path d="M0 52 Q25 46 50 52 T100 52 V100 H0 Z" fill={C.mid} />
        <Path d="M0 74 Q25 68 50 74 T100 74 V100 H0 Z" fill={C.ocean} />
      </G>
      <Line x1={66} y1={14} x2={66} y2={76} stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeDasharray="1 7" />
      <Circle cx={66} cy={82} r={6} fill="#FFFFFF" />
    </Svg>
  );
}

/** Unpack fragments and arrays into a flat list of blocks, dropping empty ones. */
function blocks(node: ReactNode): ReactNode[] {
  if (node === null || node === undefined || node === false || node === true || node === "") return [];
  if (Array.isArray(node)) return node.flatMap(blocks);
  if (isValidElement(node) && node.type === Fragment) return blocks((node.props as { children?: ReactNode }).children);
  return [node];
}

/** A heading is always kept on the same page as the first thing under it. */
function keepWithFirst(heading: ReactNode, children: ReactNode) {
  const [first, ...rest] = blocks(children);
  return (
    <>
      <View wrap={false}>
        {heading}
        {first}
      </View>
      {rest.map((b, i) => (isValidElement(b) ? cloneElement(b, { key: b.key ?? `b${i}` }) : b))}
    </>
  );
}

function section(title: string, note: string | undefined, children: ReactNode) {
  return (
    <View>
      {keepWithFirst(
        <>
          <Text style={s.h2}>{title}</Text>
          {note && <Text style={s.note}>{note}</Text>}
        </>,
        children,
      )}
    </View>
  );
}

function level(name: string, hint: string, color: string) {
  return (
    <View style={s.level} wrap={false} minPresenceAhead={120}>
      <View style={[s.levelDot, { backgroundColor: color }]} />
      <Text style={s.levelName}>{name}</Text>
      <Text style={s.levelHint}>{hint}</Text>
    </View>
  );
}

function point(text: string, refs: number[], quote?: string) {
  return (
    <View style={s.point} wrap={false} key={text}>
      <Text style={s.bullet}>•</Text>
      <View style={{ flex: 1 }}>
        <Text>
          {text} <Text style={s.ref}>{refs.map((r) => `[${r}]`).join("")}</Text>
        </Text>
        {quote && <Text style={s.quote}>From the report: “{quote}”</Text>}
      </View>
    </View>
  );
}

function statement(ctx: Ctx, st?: Statement) {
  if (!st) return null;
  termsIn(st.text).forEach((t) => ctx.terms.add(t));
  return point(plainText(st.text), st.sources.map((x) => ctx.src.ref(x.label, x.url)));
}

function statements(ctx: Ctx, ids: string[]) {
  const found = ids.map((id) => find(ctx.report, id)).filter(Boolean) as Statement[];
  if (found.length === 0) {
    return <Text style={s.note}>The company doesn&apos;t report these figures in SEC&apos;s standard data, so they&apos;re left out.</Text>;
  }
  return found.map((st) => statement(ctx, st));
}

function find(report: CompanyReport, id: string) {
  return report.statements.find((x) => x.id === id);
}

function claims(ctx: Ctx, list: CheckedClaim[]) {
  return list.map((c) => point(c.text, [ctx.src.ref(c.source.label, c.source.url)], c.quote));
}

function topic(ctx: Ctx, id: TopicId, title: string, empty?: string) {
  const list = ctx.e?.topics[id] ?? [];
  if (list.length === 0 && !empty) return null;
  return keepWithFirst(<Text style={s.h3}>{title}</Text>, list.length === 0 ? <Text style={s.note}>{empty}</Text> : claims(ctx, list));
}

function aiNote(e: SavedExplanation) {
  return (
    <Text style={s.aiNote}>
      Written by AI from the company&apos;s own reports on {formatDate(e.generatedAt.slice(0, 10))}. Every point was
      checked word-for-word against the report it cites; points that failed the check were removed.
    </Text>
  );
}

function notWritten() {
  return (
    <Text style={s.note}>
      The plain-English explanation of this part hasn&apos;t been written for this company yet. It can be requested on
      the company&apos;s Fathom page.
    </Text>
  );
}

type Cell = { text: string; width: string | number; align?: "left" | "right"; bold?: boolean; sub?: string };

function table(header: string[] | undefined, widths: (string | number)[], rows: (Cell[] | null)[]) {
  const head = header && (
    <View style={[s.tr, { borderBottomWidth: 1.5 }]}>
      {header.map((h, i) => (
        <Text key={h} style={[s.th, { width: widths[i], textAlign: i === 0 ? "left" : "right" }]}>
          {h}
        </Text>
      ))}
    </View>
  );
  const body = rows.filter(Boolean).map((r, i) => (
    <View key={i} style={s.tr} wrap={false}>
      {r!.map((c, j) => (
        <View key={j} style={{ width: c.width, paddingRight: 6 }}>
          <Text style={{ textAlign: c.align ?? "left", fontWeight: c.bold ? 600 : 400 }}>{c.text}</Text>
          {c.sub && <Text style={{ fontSize: 8, color: C.muted, textAlign: c.align ?? "left" }}>{c.sub}</Text>}
        </View>
      ))}
    </View>
  ));
  if (!head) return <>{body}</>;
  // Column titles always stay with the first row.
  return (
    <>
      <View wrap={false}>
        {head}
        {body[0]}
      </View>
      {body.slice(1)}
    </>
  );
}

// ---------------------------------------------------------------- page 1

function cover(ctx: Ctx, created: string, pageUrl: string) {
  const { company, annualReport, quarterlyReport } = ctx.report;
  return (
    <View>
      <View style={s.brandRow}>
        <View style={s.brand}>
          <LogoMark />
          <Text style={s.brandName}>Fathom</Text>
        </View>
        <Text style={{ fontSize: 9, color: C.muted }}>Company report · created {created}</Text>
      </View>
      <Text style={s.title}>{company.name}</Text>
      <Text style={s.chip}>
        {company.ticker}
        {company.exchanges[0] ? ` · ${company.exchanges[0]}` : ""}
      </Text>
      {company.industry && <Text style={s.meta}>Industry (SEC classification): {company.industry}</Text>}
      {(annualReport || quarterlyReport) && (
        <Text style={s.meta}>
          Based on {annualReport ? `the annual report (10-K) filed ${formatDate(annualReport.filingDate)}` : ""}
          {annualReport && quarterlyReport ? " and " : ""}
          {quarterlyReport ? `the quarterly report (10-Q) filed ${formatDate(quarterlyReport.filingDate)}` : ""}.
        </Text>
      )}
      <View style={s.box}>
        <Text>
          <Text style={s.strong}>Not financial advice. </Text>
          Fathom explains public information for education only. It does not recommend buying, selling or holding any
          investment, and does not give price targets.
        </Text>
        <Text style={{ marginTop: 6 }}>
          <Text style={s.strong}>How to read this. </Text>
          Three levels, from a 30-second summary to the detail. Numbers come straight from the company&apos;s reports to
          the SEC. Each point ends with a [number] that matches the source list at the end. The live page, with the share
          price chart and news, is at{" "}
          <Link src={pageUrl} style={s.link}>
            {pageUrl.replace(/^https?:\/\//, "")}
          </Link>
          .
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- level 1: Surface

function surface(ctx: Ctx) {
  const { e } = ctx;
  return (
    <View>
      {level("Surface", "The 30-second version", C.surface)}
      {e &&
        section(
          "In short",
          undefined,
          <>
            {claims(ctx, [...e.topics.whatItDoes.slice(0, 1), ...e.topics.howItMakesMoney.slice(0, 1)])}
            {e.topics.biggestRisks[0] && (
              <>
                <Text style={s.h3}>A key risk the company highlights</Text>
                {claims(ctx, e.topics.biggestRisks.slice(0, 1))}
              </>
            )}
          </>,
        )}
      {section("Is it growing?", undefined, <>{bigChange(ctx.report.numbers?.annual.revenue, "sales")}{statement(ctx, find(ctx.report, "revenue-year"))}</>)}
      {section("Is it making a profit?", undefined, <>{statements(ctx, ["net-income-year", "net-margin"])}</>)}
      {section(
        "Is it financially healthy?",
        undefined,
        <>
          {statement(ctx, find(ctx.report, "current-ratio") ?? find(ctx.report, "cash"))}
          {statement(ctx, find(ctx.report, "cash-vs-debt"))}
        </>,
      )}
      {section("Does the business produce cash?", undefined, <>{statements(ctx, ["free-cash-flow"])}</>)}
    </View>
  );
}

function bigChange(c: Comparison | undefined, noun: string) {
  if (!c || c.change === undefined) return null;
  const flat = Math.abs(c.change) < 0.005;
  return (
    <Text style={{ marginBottom: 4 }}>
      <Text style={{ fontFamily: "Bricolage", fontWeight: 700, fontSize: 18, color: C.ocean }}>
        {flat ? "About the same" : `${c.change > 0 ? "Up" : "Down"} ${formatPercent(c.change)}`}
      </Text>
      <Text style={{ color: C.muted }}>  {noun} vs the year before</Text>
    </Text>
  );
}

// ---------------------------------------------------------------- level 2: Below

function below(ctx: Ctx) {
  const { e, report } = ctx;
  const n = report.numbers;
  const leftOut = leftOutNames(n);
  return (
    <View>
      {level("Below", "The breakdown", C.shallow)}
      {section(
        "Business model and competitive edge",
        undefined,
        e ? (
          <>
            {topic(ctx, "whatItDoes", "What the company does")}
            {topic(ctx, "howItMakesMoney", "How it makes money")}
            {topic(ctx, "competitiveEdge", "What the company says gives it an edge", "The report doesn't describe this clearly, so it's left out.")}
            {topic(ctx, "marketPosition", "Where it says it stands in its industry")}
            {aiNote(e)}
          </>
        ) : (
          notWritten()
        ),
      )}
      {section(
        "Growth and profit",
        "From the income statement: what the company sold and what it kept.",
        <>
          {statement(ctx, find(report, "revenue-year"))}
          {n && revenueBars(n.revenueHistory)}
          {statements(ctx, ["revenue-quarter", "net-income-year", "gross-margin", "net-margin", "margin-trend", "eps"])}
        </>,
      )}
      {section(
        "Financial health",
        "From the balance sheet: what the company owns and what it owes.",
        <>{statements(ctx, ["cash", "long-term-debt", "cash-vs-debt", "current-ratio", "assets-vs-liabilities", "debt-to-equity", "negative-equity"])}</>,
      )}
      {section(
        "Cash flow",
        "From the cash flow statement: the actual cash in and out, not just accounting profit.",
        <>{statements(ctx, ["operating-cash-flow", "free-cash-flow", "fcf-vs-profit"])}</>,
      )}
      {section(
        "How management used the money",
        "Choices about reinvesting, rewarding shareholders and buying other companies.",
        <>{statements(ctx, ["capital-allocation"])}</>,
      )}
      {leftOut.length > 0 && (
        <Text style={s.box}>
          <Text style={s.strong}>Left out on purpose: </Text>
          {leftOut.join(", ")}. The company either doesn&apos;t report {leftOut.length > 1 ? "these" : "this"} in SEC&apos;s
          standard data, or the latest figure isn&apos;t available yet. Fathom leaves a number out rather than guess.
        </Text>
      )}
    </View>
  );
}

function revenueBars(history: { end: string; value: number }[]) {
  if (history.length < 2) return null;
  const max = Math.max(...history.map((f) => f.value));
  return (
    <View style={{ marginVertical: 6 }} wrap={false}>
      <Text style={s.th}>Revenue by year</Text>
      {history.map((f, i) => (
        <View key={f.end} style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
          <Text style={{ width: 92, fontSize: 9, color: C.muted }}>{formatDate(f.end)}</Text>
          <View style={{ flex: 1 }}>
            <View
              style={{
                width: `${Math.max(1, (f.value / max) * 100)}%`,
                height: 10,
                borderRadius: 2,
                backgroundColor: i === history.length - 1 ? C.ocean : C.mid,
              }}
            />
          </View>
          <Text style={{ width: 70, fontSize: 9, textAlign: "right" }}>{formatMoney(f.value)}</Text>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------- level 3: Deep

function deep(ctx: Ctx, pageUrl: string) {
  const { report, e } = ctx;
  return (
    <View>
      {level("Deep", "The detail", C.ocean)}
      {keyRatios(ctx)}
      {marginHistory(ctx)}
      {whatChanged(ctx)}
      {accountsCheck(ctx)}
      {section(
        "Industry, risks and what's coming up",
        undefined,
        e ? (
          <>
            {topic(ctx, "industryTrends", "Trends in its industry")}
            {topic(ctx, "demandDrivers", "What drives demand")}
            {topic(ctx, "biggestRisks", "Key risks the company highlights")}
            {topic(ctx, "newRisks", "New or changed risks", "The latest quarterly report doesn't describe any new or changed risks.")}
            {topic(ctx, "outlook", "What management expects", "The reports don't give a forward outlook.")}
            {topic(ctx, "upcoming", "What the company says is coming up")}
            {aiNote(e)}
          </>
        ) : (
          notWritten()
        ),
      )}
      {section(
        "Market value and valuation numbers",
        undefined,
        <Text>
          Market value (what the whole company is worth on the stock market) and the P/E ratio (the share price compared
          with a year of profit per share) change every trading day, so they aren&apos;t printed here. See them, with the
          share price chart, on the live page:{" "}
          <Link src={pageUrl} style={s.link}>
            {pageUrl.replace(/^https?:\/\//, "")}
          </Link>
          . Fathom doesn&apos;t give target prices or say whether to buy, sell or hold.
        </Text>,
      )}
      {section(
        "Read the original reports",
        undefined,
        <>
          {report.annualReport &&
            point(`Annual report (10-K) filed ${formatDate(report.annualReport.filingDate)}`, [ctx.src.ref(`10-K filed ${formatDate(report.annualReport.filingDate)}`, report.annualReport.url)])}
          {report.quarterlyReport &&
            point(`Quarterly report (10-Q) filed ${formatDate(report.quarterlyReport.filingDate)}`, [
              ctx.src.ref(`10-Q filed ${formatDate(report.quarterlyReport.filingDate)}`, report.quarterlyReport.url),
            ])}
        </>,
      )}
    </View>
  );
}

function keyRatios(ctx: Ctx) {
  const n = ctx.report.numbers;
  if (!n) return null;
  const r = n.ratios;
  const eps = n.annual.eps;
  const year = (end?: string) => (end ? `Year ended ${formatDate(end)}` : "");
  const on = (end?: string) => (end ? `On ${formatDate(end)}` : "");
  const row = (name: string, term: string, value: string | undefined, detail: string): Cell[] | null => {
    if (!value) return null;
    ctx.terms.add(term);
    return [
      { text: name, width: "36%", bold: true },
      { text: value, width: "20%", align: "right", bold: true },
      { text: detail, width: "44%", align: "right" },
    ];
  };
  return section(
    "Key ratios",
    "Worked out from SEC data. Each ratio only combines figures from the same period or date. Definitions are in “Terms used”.",
    table(undefined, [], [
      row("Return on equity", "return-on-equity", r.returnOnEquity && formatShare(r.returnOnEquity.value), year(r.returnOnEquity?.end)),
      row("Debt-to-equity", "debt-to-equity", r.debtToEquity && `${formatPerDollar(r.debtToEquity.value)} per $1`, on(r.debtToEquity?.end)),
      row("Current ratio", "current-ratio", r.currentRatio && r.currentRatio.value.toFixed(2), on(r.currentRatio?.end)),
      row("Assets per $1 owed", "total-liabilities", r.assetsToLiabilities && formatPerDollar(r.assetsToLiabilities.value), on(r.assetsToLiabilities?.end)),
      row("Gross margin", "gross-margin", n.margins.gross !== undefined ? formatShare(n.margins.gross) : undefined, year(n.margins.periodEnd)),
      row("Operating margin", "operating-margin", n.margins.operating !== undefined ? formatShare(n.margins.operating) : undefined, year(n.margins.periodEnd)),
      row("Profit margin", "profit-margin", n.margins.net !== undefined ? formatShare(n.margins.net) : undefined, year(n.margins.periodEnd)),
      row(
        "Earnings per share",
        "eps",
        eps && formatPerShare(eps.latest.value),
        eps ? `${year(eps.latest.end)}${eps.change !== undefined ? `, ${eps.change >= 0 ? "up" : "down"} ${formatPercent(eps.change)}` : ""}` : "",
      ),
      row("Free cash flow", "free-cash-flow", r.freeCashFlow && formatMoney(r.freeCashFlow.value), year(r.freeCashFlow?.end)),
    ]),
  );
}

function marginHistory(ctx: Ctx) {
  const rows = ctx.report.numbers?.marginHistory ?? [];
  if (rows.length < 2) return null;
  const pct = (v?: number) => (v === undefined ? "–" : formatShare(v));
  const w = ["34%", "22%", "22%", "22%"];
  return section(
    "Margins year by year",
    "How much of each dollar of sales the company kept, at each level of profit.",
    table(
      ["Year ended", "Gross margin", "Operating margin", "Profit margin"],
      w,
      rows.map((y) => [
        { text: formatDate(y.end), width: w[0] },
        { text: pct(y.gross), width: w[1], align: "right" },
        { text: pct(y.operating), width: w[2], align: "right" },
        { text: pct(y.net), width: w[3], align: "right" },
      ]),
    ),
  );
}

function whatChanged(ctx: Ctx) {
  const n = ctx.report.numbers;
  const w = ["34%", "22%", "22%", "22%"];
  const row = (name: string, c: Comparison | undefined, period: string): Cell[] | null => {
    if (!c) return null;
    const change =
      c.change === undefined ? "–" : Math.abs(c.change) < 0.005 ? "About the same" : `${c.change > 0 ? "Up" : "Down"} ${formatPercent(c.change)}`;
    return [
      { text: name, width: w[0], bold: true, sub: period === "On" ? `On ${formatDate(c.latest.end)}` : `${period} ended ${formatDate(c.latest.end)}` },
      { text: formatMoney(c.latest.value), width: w[1], align: "right" },
      { text: c.previous ? formatMoney(c.previous.value) : "–", width: w[2], align: "right" },
      { text: change, width: w[3], align: "right", bold: true },
    ];
  };
  return section(
    "What changed in a year",
    "Years are compared with the previous year, and quarters with the same quarter a year earlier, because many businesses are seasonal.",
    table(["Figure", "Latest", "A year earlier", "Change"], w, [
      row("Revenue", n?.annual.revenue, "Year"),
      row("Revenue", n?.quarter.revenue, "Quarter"),
      row("Net income", n?.annual.netIncome, "Year"),
      row("Net income", n?.quarter.netIncome, "Quarter"),
      row("Cash from operations", n?.annual.operatingCashFlow, "Year"),
      row("Cash", n?.balance.cash, "On"),
      row("Long-term debt", n?.balance.longTermDebt, "On"),
      row("Shareholders' equity", n?.balance.equity, "On"),
    ]),
  );
}

function accountsCheck(ctx: Ctx) {
  const g = ctx.report.governance;
  if (!g) return null;
  ctx.terms.add("auditor");
  ctx.terms.add("restatement");
  return section(
    "Accounts check",
    "Two official warning signs a company must announce: changing its auditor, and saying earlier accounts can't be relied on.",
    <>
      {g.events.length === 0 ? (
        <Text>No auditor changes or restatement notices were filed since {formatDate(g.since)}.</Text>
      ) : (
        g.events.map((ev) =>
          point(
            ev.kind === "auditor-change"
              ? `${formatDate(ev.filingDate)}: the company changed its auditor.`
              : `${formatDate(ev.filingDate)}: the company said earlier financial statements should no longer be relied on (restatement notice).`,
            [ctx.src.ref(`8-K filed ${formatDate(ev.filingDate)}`, ev.url)],
          ),
        )
      )}
      <Text style={[s.note, { marginTop: 4 }]}>
        An auditor change has many ordinary reasons; the filing explains why. This check only reports what was filed.
      </Text>
    </>,
  );
}

// ---------------------------------------------------------------- end matter

function announcements(ctx: Ctx) {
  const list = ctx.report.announcements;
  return section(
    "Official announcements (last four months)",
    "Major events the company reported to the SEC on form 8-K.",
    list.length === 0 ? (
      <Text style={s.note}>No major announcements filed in the last four months.</Text>
    ) : (
      <>{list.map((a) => point(`${formatDate(a.filingDate)}: ${a.events.join(" · ")}`, [ctx.src.ref(`8-K filed ${formatDate(a.filingDate)}`, a.url)]))}</>
    ),
  );
}

function glossarySection(ctx: Ctx) {
  const entries = [...ctx.terms].map((k) => lookupTerm(k)).filter(Boolean) as { term: string; definition: string }[];
  if (entries.length === 0) return null;
  entries.sort((a, b) => a.term.localeCompare(b.term));
  return section(
    "Terms used",
    undefined,
    <>
      {entries.map((t) => (
        <Text key={t.term} style={{ marginBottom: 4 }} wrap={false}>
          <Text style={s.strong}>{t.term}: </Text>
          {t.definition}
        </Text>
      ))}
    </>,
  );
}

function sourcesSection(ctx: Ctx) {
  return section(
    "Sources",
    "Fathom doesn't create financial data. Every figure and point above comes from these documents, filed by the company with the US Securities and Exchange Commission (SEC EDGAR). Figures are read from the financial data tagged in those reports.",
    <>
      {ctx.src.items.map((it, i) => (
        <View key={it.url + it.label} style={{ flexDirection: "row", marginBottom: 4 }} wrap={false}>
          <Text style={{ width: 26, color: C.muted }}>[{i + 1}]</Text>
          <View style={{ flex: 1 }}>
            <Text>{it.label}</Text>
            <Link src={it.url} style={[s.link, { fontSize: 8 }]}>
              {it.url}
            </Link>
          </View>
        </View>
      ))}
      <Text style={[s.note, { marginTop: 8 }]}>
        On the live page, share price, market value and news are shown through TradingView widgets; they are not
        included in this PDF.
      </Text>
    </>,
  );
}
