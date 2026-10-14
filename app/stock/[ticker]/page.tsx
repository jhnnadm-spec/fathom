import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { ResearchProgress } from "@/components/ResearchProgress";
import { ResearchStep } from "@/components/ResearchStep";
import { WatchButton } from "@/components/WatchButton";
import { Loader } from "@/components/Loader";
import { ExplainButton } from "@/components/ExplainButton";
import { CompanyNews, MarketData, PriceChart } from "@/components/MarketWidgets";
import { BillsGauge, Columns, Headline, Lines, PairBars, StackedBar } from "@/components/viz/Charts";
import { RichText } from "@/components/RichText";
import { SourceLink } from "@/components/SourceLink";
import { explanationState, type ExplanationState } from "@/lib/explain/ondemand";
import type { CheckedClaim, SavedExplanation } from "@/lib/explain/types";
import { formatDate, formatMoney, formatPercent, formatShare } from "@/lib/financials/format";
import type { Statement } from "@/lib/financials/templates";
import { lookupTerm } from "@/lib/glossary";
import { getCompanyReport, type CompanyReport } from "@/lib/report/company";
import { changeRows, keyRatioRows, marginTrends } from "@/lib/financials/explain-numbers";
import { MARKET_TERMS } from "@/lib/report/market-terms";
import { AREAS, claimsFor, leftOutNames, statementsFor, STEPS, SURFACE, type Block, type Item, type SurfaceRow } from "@/lib/report/outline";
import { getCompanyProfile, type CompanyProfile } from "@/lib/profile/wiki";
import { TermName } from "@/components/TermName";
import { ConceptMap } from "@/components/ConceptMap";
import { conceptMap } from "@/lib/report/concept-map";
import { billsGauge, cashVsDebt, compareFor, marginLines, moneyUses, pairFor, salesHistory, salesSplit, SERIES, shareFor } from "@/lib/report/visuals";
import { DotGrid, Meter, StatusBadge, TopicIcon } from "@/components/viz/Static";

export async function generateMetadata(props: PageProps<"/stock/[ticker]">): Promise<Metadata> {
  const { ticker } = await props.params;
  return { title: `${ticker.toUpperCase()} explained` };
}

export default function StockPage(props: PageProps<"/stock/[ticker]">) {
  return (
    <div>
      <Suspense fallback={<Loader label="Reading the latest reports from the SEC…" />}>
        <Report params={props.params} />
      </Suspense>
    </div>
  );
}

async function Report({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const report = await getCompanyReport(decodeURIComponent(ticker).toUpperCase());
  if (!report) notFound();
  const state: ExplanationState = report.support.supported
    ? await explanationState(report.company.ticker, report.explanationKey)
    : { status: "unavailable" };
  const e = state.explanation;
  const profile = report.support.supported ? await getCompanyProfile(report.company.cik) : undefined;

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-10 px-5 py-10 sm:py-14">
      <Header report={report} />
      {report.support.supported ? (
        <>
          <ExplainStatus ticker={report.company.ticker} state={state} />
          <ConceptMap nodes={conceptMap(report.numbers)} company={shortCompany(report.company.name)} />
          <Path report={report} e={e} level="surface" profile={profile} />
          <AllNumbers report={report} />
          <MoreInfo report={report} />
          {e && <AiNote e={e} />}
          <Disclaimer />
        </>
      ) : (
        <Unsupported reason={report.support.reason} name={report.company.name} />
      )}
    </div>
  );
}

/** "Coca Cola Co" → "Coca Cola", for use inside sentences. */
function shortCompany(name: string): string {
  return name.replace(/,?\s+(Inc\.?|Corp(oration)?\.?|Co\.?|Company|Ltd\.?|plc|Holdings?|Group)$/i, "").replace(/^The\s+/i, "");
}

// ---------------------------------------------------------------- header

function Header({ report }: { report: CompanyReport }) {
  const { company, annualReport, quarterlyReport } = report;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[15px] font-semibold text-ocean">
        {company.ticker}
        {company.exchanges[0] ? ` on ${company.exchanges[0]}` : ""}
        {company.industry ? <span className="font-normal text-muted">, {company.industry.toLowerCase()}</span> : null}
      </p>
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">{company.name}</h1>
      {(annualReport || quarterlyReport) && (
        <p className="text-[15px] text-muted">
          Based on {annualReport && <>the annual report (10-K) filed {formatDate(annualReport.filingDate)}</>}
          {annualReport && quarterlyReport && " and "}
          {quarterlyReport && <>the quarterly report (10-Q) filed {formatDate(quarterlyReport.filingDate)}</>}.
        </p>
      )}
      {report.support.supported && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <WatchButton ticker={company.ticker} name={company.name} />
          {/* A plain link: the browser downloads the file the server makes. */}
          <a
            href={`/stock/${encodeURIComponent(company.ticker)}/pdf`}
            download
            className="inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-ocean no-underline hover:underline"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v12" />
              <path d="m7 10 5 5 5-5" />
              <path d="M5 21h14" />
            </svg>
            Download PDF
          </a>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- shared pieces

function Card({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <section className="flex flex-col gap-4 border-t border-line pt-8">
      <div className="flex flex-col gap-1.5">
        <h2 className="font-display text-2xl font-bold">{title}</h2>
        {note && <p className="text-[15px] leading-relaxed text-muted">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Said({ statement, visual }: { statement?: Statement; visual?: ReactNode }) {
  if (!statement) return null;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[17px] leading-[1.65]">
        <RichText text={statement.text} />
      </p>
      {visual && <div className="my-2 rounded-xl bg-panel p-4">{visual}</div>}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {statement.sources.map((s) => (
          <SourceLink key={s.url} href={s.url} label={s.label} />
        ))}
      </div>
    </div>
  );
}

/** Above the levels: offer to write the explanation, or say it's on its way. */
function ExplainStatus({ ticker, state }: { ticker: string; state: ExplanationState }) {
  if (state.status === "unavailable") return null;
  if (state.status === "ready") {
    return state.stale ? <ExplainButton ticker={ticker} initial="none" update /> : null;
  }
  if (state.explanation && state.status === "queued") {
    return (
      <p className="rounded-2xl bg-panel px-5 py-4 text-[15px] leading-relaxed text-muted">
        A newer report has been filed. An updated explanation is in the queue; until then, the one below was written
        from the earlier report.
      </p>
    );
  }
  return <ExplainButton ticker={ticker} initial={state.status} update={Boolean(state.explanation)} />;
}

// ---------------------------------------------------------------- the three levels

type Level = "surface" | "below" | "deep";
type Ctx = { report: CompanyReport; e?: SavedExplanation; level: Level };

/** AI-written points. On Deep, each also shows the exact words from the report it came from. */
function Claims({ claims, quotes }: { claims: CheckedClaim[]; quotes?: boolean }) {
  return (
    <ul className="flex flex-col gap-5">
      {claims.map((c) => (
        <li key={c.text} className="flex flex-col gap-1">
          <p className="text-[17px] leading-[1.65]">{c.text}</p>
          {quotes && (
            <p className="my-1 border-l-2 border-line pl-3 text-[14px] leading-relaxed text-muted">
              From the report: &ldquo;{c.quote}&rdquo;
            </p>
          )}
          <SourceLink href={c.source.url} label={c.source.label} />
        </li>
      ))}
    </ul>
  );
}

function AiNote({ e }: { e: SavedExplanation }) {
  return (
    <p className="text-[13px] leading-relaxed text-muted">
      Points about the business, its industry and its risks were written by AI from the company&apos;s own reports on{" "}
      {formatDate(e.generatedAt.slice(0, 10))}. Every point was checked word-for-word against the report it links to;
      points that failed the check were removed. All numbers come straight from the reports, not from AI.
    </p>
  );
}

function NotWritten() {
  return (
    <p className="text-[16px] leading-relaxed text-muted">
      Not written yet for this company. Use the button at the top of the page to ask Fathom to write it.
    </p>
  );
}

/** Does this item have anything to show? (Used to hide empty rows and show "left out" notes.) */
function hasContent(item: Item, { report, e }: Ctx): boolean {
  switch (item.kind) {
    case "topic":
      return claimsFor(e, item).length > 0 || Boolean(e && item.empty);
    case "statements":
    case "firstOf":
      return statementsFor(report.statements, item).length > 0 || Boolean(item.kind === "statements" && item.none);
    case "block":
      return blockHasContent(item.block, report);
  }
}

function renderItem(item: Item, ctx: Ctx, key: string): ReactNode {
  const { report, e, level } = ctx;
  switch (item.kind) {
    case "topic": {
      const claims = claimsFor(e, item);
      if (claims.length === 0 && !(e && item.empty)) return null;
      const body = claims.length > 0 ? <Claims claims={claims} quotes={level === "deep"} /> : <p className="text-[16px] leading-relaxed text-muted">{item.empty}</p>;
      if (!item.title) return <div key={key}>{body}</div>;
      return (
        <div key={key} className="flex flex-col gap-3">
          <h3 className="flex items-center gap-2.5 font-display text-lg font-bold">
            <TopicIcon name={item.topic} />
            {item.title}
          </h3>
          {body}
        </div>
      );
    }
    case "statements":
    case "firstOf": {
      const found = statementsFor(report.statements, item);
      if (found.length === 0) {
        return item.kind === "statements" && item.none ? (
          <p key={key} className="text-[15px] text-muted">
            {item.none}
          </p>
        ) : null;
      }
      return found.map((s) => (
        <Said key={`${key}-${s.id}`} statement={s} visual={level === "surface" ? undefined : numberVisual(s.id, report)} />
      ));
    }
    case "block":
      return <BlockView key={key} block={item.block} report={report} />;
  }
}

/** The words for one Surface question, or a "not written yet" note for AI questions with no explanation. */
function rowWords(row: SurfaceRow, ctx: Ctx): ReactNode {
  const shown = row.items.filter((i) => hasContent(i, ctx));
  const needsAi = row.items.some((i) => i.kind === "topic");
  if (shown.length === 0) return needsAi && !ctx.e ? <NotWritten /> : null;
  return shown.map((i, k) => renderItem(i, ctx, `${row.label}-${k}`));
}

function textPanel(row: SurfaceRow, ctx: Ctx): ReactNode {
  const w = rowWords(row, ctx);
  if (!w) return null;
  return (
    <section key={row.label} className="flex flex-col gap-3 rounded-2xl bg-panel p-5">
      <h3 className="flex items-center gap-2.5 text-[14px] font-semibold text-ocean">
        <TopicIcon name={row.items[0].kind === "topic" ? row.items[0].topic : "accounts"} />
        <span>
          {row.label}
          {row.term && (
            <span className="font-normal text-muted">
              {" "}
              (<TermName k={row.term} />)
            </span>
          )}
        </span>
      </h3>
      {w}
    </section>
  );
}

function rowVisual(row: SurfaceRow, ctx: Ctx): ReactNode {
  const n = ctx.report.numbers;
  switch (row.visual) {
    case "salesSplit": {
      const d = salesSplit(n);
      if (!d) return null;
      const profit = d.segments.at(-1)!;
      return (
        <>
          <Headline value={`${profit.display} of every $100`} caption="of sales was left as profit (net profit margin)" />
          <StackedBar segments={d.segments} caption={`Where each $100 of sales went. ${d.period}.`} />
        </>
      );
    }
    case "salesGrowth": {
      const d = salesHistory(n);
      if (!d) return null;
      return (
        <>
          {d.change !== undefined && <Headline value={`${d.change >= 0 ? "+" : "−"}${formatPercent(d.change)}`} caption="sales compared with the year before (revenue growth)" />}
          <Columns bars={d.bars} color={SERIES.blue} highlight="#0B4F6C" />
        </>
      );
    }
    case "billsGauge": {
      const d = billsGauge(n);
      if (!d) return null;
      return (
        <>
          <Headline value={`$${d.value.toFixed(2)}`} caption="for every $1 of bills due within a year (current ratio)" />
          <BillsGauge value={d.value} />
        </>
      );
    }
    case "cashVsDebt": {
      const d = cashVsDebt(n);
      if (!d) return null;
      return (
        <PairBars
          items={[
            { label: "Cash (cash and cash equivalents)", value: d.cash, display: formatMoney(d.cash), color: SERIES.green },
            { label: "Borrowing due after a year (long-term debt)", value: d.debt, display: formatMoney(d.debt), color: SERIES.orange },
          ]}
        />
      );
    }
    case "spareCash": {
      const f = n?.ratios.freeCashFlow;
      if (!f) return null;
      const flow = pairFor("s-cash", n);
      return (
        <>
          <Headline value={formatMoney(f.value)} caption={f.value >= 0 ? "spare cash, after investing in itself (free cash flow)" : "more spent than the business brought in (negative free cash flow)"} />
          {flow && <PairBars items={flow} />}
        </>
      );
    }
    case "moneyUses": {
      const d = moneyUses(n);
      if (!d) return null;
      return <StackedBar segments={d.segments} caption={`What it spent its money on. ${d.period}.`} selectHint="Tap a part of the bar" />;
    }
    default:
      return null;
  }
}

function tile(row: SurfaceRow, ctx: Ctx): ReactNode {
  const w = rowWords(row, ctx);
  const v = rowVisual(row, ctx);
  if (!w && !v) return null;
  return (
    <section key={row.label} className={`flex flex-col gap-4 rounded-2xl bg-panel p-5 ${row.wide ? "sm:col-span-2" : ""}`}>
      <h3 className="text-[14px] font-semibold text-ocean">
        {row.label}
        {row.term && (
          <span className="font-normal text-muted">
            {" "}
            (<TermName k={row.term} />)
          </span>
        )}
      </h3>
      {v}
      {w && <div className="flex flex-col gap-3 border-t border-line pt-3 [&_p]:text-[15px]">{w}</div>}
    </section>
  );
}

/** Tiles sit two to a row; a tile left on its own takes the full width, so there's no empty gap beside it. */
function balanced(rows: SurfaceRow[]): SurfaceRow[] {
  let col = 0;
  return rows.map((r, i) => {
    if (r.wide) {
      col = 0;
      return r;
    }
    const next = rows[i + 1];
    const alone = col === 0 && (!next || next.wide);
    col = alone ? 0 : (col + 1) % 2;
    return alone ? { ...r, wide: true } : r;
  });
}

/** One area at Below or Deep: its items, or a "not written yet" note when it needs the AI explanation. */
function areaLayer(areaId: string, level: "below" | "deep", ctx: Ctx, titled: boolean): ReactNode {
  const area = AREAS.find((a) => a.id === areaId)!;
  const items = area[level];
  if (items.length === 0) return null;
  const c = { ...ctx, level };
  const needsAi = items.some((i) => i.kind === "topic");
  return (
    <div key={`${areaId}-${level}`} className="flex flex-col gap-5">
      {titled && <h3 className="font-display text-xl font-bold">{area.title}</h3>}
      <p className="text-[15px] leading-relaxed text-muted">{area.why}</p>
      {needsAi && !ctx.e ? <NotWritten /> : items.map((i, k) => renderItem(i, c, `${areaId}-${level}-${k}`))}
    </div>
  );
}

/** The research path: seven steps, each starting short and opening deeper in place. */
function Path(ctx: Ctx & { profile?: CompanyProfile }) {
  const { report, e, profile } = ctx;
  const sameLayers = (id: string) => {
    const a = AREAS.find((x) => x.id === id)!;
    return JSON.stringify(a.below) === JSON.stringify(a.deep);
  };
  return (
    <div className="flex flex-col gap-10">
      <ResearchProgress ticker={report.company.ticker} steps={STEPS.map((s) => ({ id: s.id, title: s.title }))} />
      <p className="text-[16px] leading-relaxed text-muted">
        Now work through the company the way an analyst would, one question at a time. Each step says why it matters
        and starts with the short answer. Tap <strong className="font-semibold text-ink">Go deeper</strong> when you want
        more. Point at any underlined term to see what it means.
      </p>
      {STEPS.map((step, i) => {
        const rows = SURFACE.filter((r) => step.areas.includes(r.area));
        const numberRows = rows.filter((r) => r.group === "numbers");
        const textRows = rows.filter((r) => r.group !== "numbers");
        const surface = (
          <>
            {step.id === "business" && profile && <ProfileFacts profile={profile} />}
            {step.id === "business" && profile?.wikipedia && !e && <WikipediaIntro w={profile.wikipedia} />}
            {textRows.length > 0 && <div className="grid gap-3">{textRows.map((r) => textPanel(r, ctx))}</div>}
            {numberRows.length > 0 && <div className="grid gap-3 sm:grid-cols-2">{balanced(numberRows).map((r) => tile(r, ctx))}</div>}
            {step.id === "value" && (
              <div className="flex flex-col gap-3 rounded-2xl bg-panel p-5">
                <h3 className="text-[14px] font-semibold text-ocean">Share price over the past year</h3>
                <p className="text-[15px] text-muted">
                  The price moves every trading day. Fathom shows it for context; it doesn&apos;t say whether the price is right.
                </p>
                <PriceChart symbol={report.tradingViewSymbol} />
              </div>
            )}
          </>
        );
        const below = (
          <>
            {step.id === "business" && profile?.wikipedia && e && <WikipediaIntro w={profile.wikipedia} />}
            {step.areas.map((a) => areaLayer(a, "below", ctx, step.areas.length > 1))}
          </>
        );
        const hasDeep = step.areas.some((a) => !sameLayers(a));
        const deep = hasDeep ? <>{step.areas.map((a) => areaLayer(a, "deep", ctx, step.areas.length > 1))}</> : undefined;
        return (
          <ResearchStep
            key={step.id}
            ticker={report.company.ticker}
            id={step.id}
            number={i + 1}
            title={step.title}
            question={step.question}
            surface={surface}
            below={below}
            deep={deep}
            why={step.why}
            term={<TermName k={step.term} />}
          />
        );
      })}
    </div>
  );
}

/** Background facts from Wikidata, clearly labelled as background. */
function ProfileFacts({ profile: p }: { profile: CompanyProfile }) {
  const facts: [string, ReactNode][] = [];
  if (p.ceo) facts.push(["Chief executive", p.ceo]);
  if (p.founded) facts.push(["Founded", p.founded]);
  if (p.founders) facts.push(["Founded by", p.founders.join(", ")]);
  if (p.headquarters) facts.push(["Headquarters", p.headquarters]);
  if (p.employees) facts.push(["Employees", `${p.employees.count.toLocaleString("en-US")}${p.employees.asOf ? ` (${p.employees.asOf})` : ""}`]);
  if (p.website)
    facts.push([
      "Website",
      <a key="w" href={p.website} target="_blank" rel="noopener noreferrer">
        {p.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
      </a>,
    ]);
  if (facts.length === 0) return null;
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-panel p-5">
      <h3 className="text-[14px] font-semibold text-ocean">At a glance</h3>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
        {facts.map(([k, v]) => (
          <div key={k} className="flex flex-col">
            <dt className="text-[13px] text-muted">{k}</dt>
            <dd className="text-[16px] font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <SourceLink href={p.wikidataUrl} label="Wikidata, a free public database edited by volunteers (may lag behind)" kind="Background" />
    </section>
  );
}

/** The opening of the company's Wikipedia article, credited as its licence requires. */
function WikipediaIntro({ w }: { w: NonNullable<CompanyProfile["wikipedia"]> }) {
  return (
    <section className="flex flex-col gap-2.5 rounded-2xl bg-panel p-5">
      <h3 className="text-[14px] font-semibold text-ocean">Background</h3>
      <p className="text-[16px] leading-[1.65]">{w.extract}</p>
      <p className="text-[13px] text-muted">
        From the Wikipedia article{" "}
        <a href={w.url} target="_blank" rel="noopener noreferrer">
          {w.title}
        </a>
        , by its contributors, shared under{" "}
        <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">
          CC BY-SA 4.0
        </a>
        . Background only: Fathom&apos;s numbers come from the company&apos;s own reports.
      </p>
    </section>
  );
}

/** Every key number side by side, folded away until wanted. */
function AllNumbers({ report }: { report: CompanyReport }) {
  const area = AREAS.find((a) => a.id === "numbers")!;
  const ctx: Ctx = { report, level: "deep" };
  return (
    <details className="group flex flex-col rounded-2xl bg-panel p-5">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4">
        <span className="flex flex-col">
          <span className="font-display text-xl font-bold">All the key numbers</span>
          <span className="text-[14px] text-muted">{area.why}</span>
        </span>
        <span aria-hidden="true" className="text-2xl text-ocean transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="mt-5 flex flex-col gap-8">{area.deep.map((i, k) => renderItem(i, ctx, `numbers-${k}`))}</div>
    </details>
  );
}

// ---------------------------------------------------------------- a small visual beside a single number

/** Sentences whose picture is already drawn by a bigger chart right beside them. */
const DRAWN_NEARBY = new Set(["revenue-year", "current-ratio", "cash-vs-debt", "capital-allocation", "margin-trend", "negative-equity", "return-on-equity"]);

/** The right picture for one number: a dot grid for shares of $100, bars for comparisons. */
function numberVisual(id: string, report: CompanyReport, compact = false): ReactNode {
  if (!compact && DRAWN_NEARBY.has(id)) return null;
  const n = report.numbers;
  const share = shareFor(id, n);
  if (share) return compact ? <Meter value={share.value} /> : <DotGrid value={share.value} label={share.label} />;
  if (id === "current-ratio" && n?.ratios.currentRatio) return <BillsGauge value={n.ratios.currentRatio.value} />;
  const pair = pairFor(id, n) ?? compareFor(id, n);
  return pair ? <PairBars items={pair} /> : null;
}

// ---------------------------------------------------------------- blocks: charts, tables and widgets

function blockHasContent(block: Block, report: CompanyReport): boolean {
  const n = report.numbers;
  switch (block) {
    case "revenueChart":
      return (n?.revenueHistory.length ?? 0) >= 2;
    case "marginHistory":
      return (n?.marginHistory.length ?? 0) >= 2;
    case "keyRatios":
    case "whatChanged":
      return Boolean(n);
    case "accountsSummary":
    case "accountsCheck":
      return Boolean(report.governance);
    case "leftOut":
      return leftOutNames(n).length > 0;
    case "originalReports":
      return Boolean(report.annualReport || report.quarterlyReport);
    case "priceChart":
    case "marketData":
      return true;
    case "salesSplit":
      return Boolean(salesSplit(n));
    case "billsGauge":
      return Boolean(billsGauge(n));
    case "cashVsDebt":
      return Boolean(cashVsDebt(n));
    case "moneyUses":
      return Boolean(moneyUses(n));
    case "marginLines":
      return Boolean(marginLines(n));
  }
}

function BlockView({ block, report }: { block: Block; report: CompanyReport }) {
  if (!blockHasContent(block, report)) return null;
  const n = report.numbers;
  switch (block) {
    case "revenueChart": {
      const d = salesHistory(n)!;
      return (
        <ChartPanel title="Sales by year" note="Tap a year to see its sales.">
          <Columns bars={d.bars} color={SERIES.blue} highlight="#0B4F6C" />
        </ChartPanel>
      );
    }
    case "salesSplit": {
      const d = salesSplit(n)!;
      return (
        <ChartPanel title="Where each $100 of sales went" note={`${d.period}. Tap a part of the bar to see what it pays for.`}>
          <StackedBar segments={d.segments} />
        </ChartPanel>
      );
    }
    case "marginLines": {
      const d = marginLines(n)!;
      return (
        <ChartPanel title="Margins over the years" note="Move along the chart, or tap a year, to see each margin that year.">
          <Lines years={d.years} series={d.series} />
        </ChartPanel>
      );
    }
    case "billsGauge": {
      const d = billsGauge(n)!;
      return (
        <ChartPanel title="Can it pay its bills?" note={`On ${d.date}: $${d.value.toFixed(2)} of cash and short-term assets for every $1 due within a year.`}>
          <BillsGauge value={d.value} />
        </ChartPanel>
      );
    }
    case "cashVsDebt": {
      const d = cashVsDebt(n)!;
      return (
        <ChartPanel title="Cash and long-term debt" note={`On ${d.date}.`}>
          <PairBars
            items={[
              { label: "Cash (cash and cash equivalents)", value: d.cash, display: formatMoney(d.cash), color: SERIES.green },
              { label: "Borrowing due after a year (long-term debt)", value: d.debt, display: formatMoney(d.debt), color: SERIES.orange },
            ]}
          />
        </ChartPanel>
      );
    }
    case "moneyUses": {
      const d = moneyUses(n)!;
      return (
        <ChartPanel title="What it spent its money on" note={`${d.period}. Tap a part of the bar to see what it means.`}>
          <StackedBar segments={d.segments} />
        </ChartPanel>
      );
    }
    case "marginHistory":
      return <MarginHistory report={report} />;
    case "keyRatios":
      return <KeyRatios report={report} />;
    case "whatChanged":
      return <WhatChanged report={report} />;
    case "accountsSummary":
      return <AccountsSummary report={report} />;
    case "accountsCheck":
      return <AccountsCheck report={report} />;
    case "leftOut":
      return <LeftOut report={report} />;
    case "originalReports":
      return <OriginalReports report={report} />;
    case "priceChart":
      return <PriceChart symbol={report.tradingViewSymbol} />;
    case "marketData":
      return (
        <div className="flex flex-col gap-3">
          <p className="text-[16px] leading-relaxed">
            Two numbers people look at most: <RichText text="[[market-cap|market value]]" /> (what the whole company is
            worth on the stock market) and the <RichText text="[[pe-ratio|P/E ratio]]" /> (the share price compared with
            a year of profit per share; a higher number means buyers are paying more for each dollar of profit).
            They&apos;re shown as TradingView provides them. Fathom doesn&apos;t give target prices or say whether to buy,
            sell or hold.
          </p>
          <MarketData symbol={report.tradingViewSymbol} />
          <MarketKey />
        </div>
      );
  }
}

/** A plain-English key to the labels in TradingView's market data box. */
function MarketKey() {
  return (
    <details className="group rounded-2xl bg-mist px-5 py-4">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-[16px] font-semibold text-ocean">
        What every term in this box means
        <svg className="transition-transform group-open:rotate-180" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="flex flex-col gap-6 pb-2 pt-4">
        <p className="text-[15px] leading-relaxed text-muted">
          These numbers come from TradingView and change every trading day. Fathom can&apos;t read them, so here is what
          each label means and how to read it.
        </p>
        {MARKET_TERMS.map((g) => (
          <div key={g.group} className="flex flex-col gap-3">
            <h4 className="text-[15px] font-semibold">{g.group}</h4>
            <dl className="flex flex-col gap-3">
              {g.terms.map((t) => (
                <div key={t.term} className="flex flex-col gap-0.5">
                  <dt className="text-[15px] font-semibold text-ocean">{t.term}</dt>
                  <dd className="text-[15px] leading-relaxed">
                    {t.plain}
                    {t.read && <span className="block text-muted">{t.read}</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </details>
  );
}

/** A raised panel that holds one chart. */
function ChartPanel({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-panel p-5">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-[15px] font-semibold">{title}</h3>
        {note && <p className="text-[13px] text-muted">{note}</p>}
      </div>
      {children}
    </div>
  );
}

function Sub({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-lg font-bold">{title}</h3>
        {note && <p className="text-[14px] text-muted">{note}</p>}
      </div>
      {children}
    </div>
  );
}



/** A number with its name, what it is, and what it says about this company. */
function Explained({ name, term, value, when, meaning, extra }: { name: string; term?: string; value: string; when: string; meaning: string; extra?: ReactNode }) {
  const entry = term ? lookupTerm(term) : undefined;
  return (
    <li className="flex flex-col gap-1.5 border-t border-line py-5 first:border-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4 className="text-[17px] font-semibold">{name}</h4>
        <span className="font-display text-2xl font-bold tabular-nums text-ocean">{value}</span>
      </div>
      {extra}
      <p className="text-[13px] text-muted">{when}</p>
      <p className="text-[17px] leading-[1.65]">{meaning}</p>
      {entry && <p className="text-[14px] leading-relaxed text-muted">What it is: {entry.definition}</p>}
    </li>
  );
}

function KeyRatios({ report }: { report: CompanyReport }) {
  const rows = keyRatioRows(report.numbers!);
  if (rows.length === 0) return null;
  return (
    <Sub title="Key ratios" note="Ratios compare two numbers so companies of different sizes can be compared. Each one only combines figures from the same period or date.">
      <ul className="flex flex-col">
        {rows.map((r) => (
          <Explained key={r.id} {...r} extra={numberVisual(r.id, report, true)} />
        ))}
      </ul>
    </Sub>
  );
}

function MarginHistory({ report }: { report: CompanyReport }) {
  const n = report.numbers!;
  const rows = n.marginHistory;
  const trends = marginTrends(n);
  const pct = (v?: number) => (v === undefined ? "–" : formatShare(v));
  return (
    <Sub
      title="Margins year by year"
      note="A margin is how much of each $100 of sales is left after a set of costs. There are three, one after another."
    >

      {trends.length > 0 && (
        <ul className="flex flex-col gap-2 text-[17px] leading-[1.65]">
          {trends.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
      {rows.length >= 2 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-[15px]">
            <caption className="sr-only">Margins by year</caption>
            <thead>
              <tr className="border-b-2 border-line text-[13px] text-muted">
                <th className="py-2 pr-4 text-left font-semibold">Year ended</th>
                <th className="py-2 pr-4 text-right font-semibold">Gross margin</th>
                <th className="py-2 pr-4 text-right font-semibold">Operating margin</th>
                <th className="py-2 text-right font-semibold">Profit margin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((y) => (
                <tr key={y.end} className="border-b border-line">
                  <td className="py-2.5 pr-4">{formatDate(y.end)}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{pct(y.gross)}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{pct(y.operating)}</td>
                  <td className="py-2.5 text-right tabular-nums">{pct(y.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Sub>
  );
}

function WhatChanged({ report }: { report: CompanyReport }) {
  const rows = changeRows(report.numbers!);
  if (rows.length === 0) return null;
  return (
    <Sub
      title="What changed in a year"
      note="Each figure next to the same figure a year earlier. Quarters are compared with the same quarter a year before, because many businesses are busier in some seasons."
    >
      <ul className="flex flex-col">
        {rows.map((r) => (
          <Explained
            key={r.id}
            name={r.name}
            term={r.term}
            value={r.change}
            when={r.when}
            meaning={r.meaning}
            extra={
              <>
                <p className="text-[15px] tabular-nums">
                  {r.latest}
                  {r.previous && <span className="text-muted"> vs {r.previous} a year earlier</span>}
                </p>
                {numberVisual(r.id, report, true)}
              </>
            }
          />
        ))}
      </ul>
    </Sub>
  );
}

/** One plain sentence: did the company file either official warning sign? */
function AccountsSummary({ report }: { report: CompanyReport }) {
  const g = report.governance!;
  if (g.events.length === 0) {
    return (
      <div className="flex flex-col gap-2">
      <StatusBadge ok>No warning signs filed</StatusBadge>
      <p className="text-[17px] leading-relaxed">
        None found. Since {formatDate(g.since)}, the company hasn&apos;t announced a change of{" "}
        <RichText text="[[auditor|auditor]]" /> or said its past accounts were wrong (
        <RichText text="[[restatement|a restatement]]" />
        ).
      </p>
      </div>
    );
  }
  const changes = g.events.filter((x) => x.kind === "auditor-change").length;
  const restatements = g.events.length - changes;
  const parts = [
    changes ? `${changes === 1 ? "one change" : `${changes} changes`} of [[auditor|auditor]]` : "",
    restatements ? `${restatements === 1 ? "one notice" : `${restatements} notices`} that past accounts were wrong ([[restatement|restatement]])` : "",
  ].filter(Boolean);
  return (
    <div className="flex flex-col gap-1.5">
      <StatusBadge ok={false}>
        {g.events.length} notice{g.events.length > 1 ? "s" : ""} filed
      </StatusBadge>
      <p className="text-[17px] leading-relaxed">
        <RichText text={`Since ${formatDate(g.since)}, the company filed ${parts.join(" and ")}. These have many possible reasons; the filings explain them.`} />
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {g.events.map((x) => (
          <SourceLink key={x.url + x.kind} href={x.url} label={`8-K filed ${formatDate(x.filingDate)}`} />
        ))}
      </div>
    </div>
  );
}

function AccountsCheck({ report }: { report: CompanyReport }) {
  const g = report.governance!;
  return (
    <Sub
      title="Accounts check"
      note="Two official warning signs a company must announce: changing its auditor, and saying earlier accounts can't be relied on."
    >
      <StatusBadge ok={g.events.length === 0}>{g.events.length === 0 ? "No warning signs filed" : `${g.events.length} notice${g.events.length > 1 ? "s" : ""} filed`}</StatusBadge>
      {g.events.length === 0 ? (
        <p className="text-[17px] leading-relaxed">
          No <RichText text="[[auditor|auditor]]" /> changes or <RichText text="[[restatement|restatement notices]]" /> were
          filed since {formatDate(g.since)}.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {g.events.map((x) => (
            <li key={x.url + x.kind} className="flex flex-col gap-1.5">
              <span className="text-[17px] leading-relaxed">
                {formatDate(x.filingDate)}:{" "}
                {x.kind === "auditor-change" ? (
                  <RichText text="the company changed its [[auditor|auditor]]." />
                ) : (
                  <RichText text="the company said earlier financial statements should no longer be relied on ([[restatement|restatement notice]])." />
                )}
              </span>
              <SourceLink href={x.url} label="Read the 8-K" />
            </li>
          ))}
        </ul>
      )}
      <p className="text-[13px] text-muted">
        An auditor change has many ordinary reasons; the filing explains why. This check only reports what was filed.
      </p>
    </Sub>
  );
}

function LeftOut({ report }: { report: CompanyReport }) {
  const leftOut = leftOutNames(report.numbers);
  return (
    <p className="rounded-2xl bg-mist px-5 py-4 text-[15px] leading-relaxed text-muted">
      <strong className="text-ink">Left out on purpose:</strong> {leftOut.join(", ")}. The company either doesn&apos;t
      report {leftOut.length > 1 ? "these" : "this"} in SEC&apos;s standard data, or the latest figure isn&apos;t available
      yet. Fathom leaves a number out rather than guess.
    </p>
  );
}

function OriginalReports({ report }: { report: CompanyReport }) {
  return (
    <Sub title="Read the original reports">
      <div className="flex flex-col gap-2">
        {report.annualReport && (
          <SourceLink href={report.annualReport.url} label={`Annual report (10-K) filed ${formatDate(report.annualReport.filingDate)}`} />
        )}
        {report.quarterlyReport && (
          <SourceLink href={report.quarterlyReport.url} label={`Quarterly report (10-Q) filed ${formatDate(report.quarterlyReport.filingDate)}`} />
        )}
      </div>
    </Sub>
  );
}

// ---------------------------------------------------------------- below the levels

/** Announcements, news and where everything comes from, in the same single column. */
function MoreInfo({ report }: { report: CompanyReport }) {
  return (
    <div className="flex flex-col gap-10">
      <Card title="Official announcements" note="Major events the company reported to the SEC in the last four months.">
        {report.announcements.length === 0 ? (
          <p className="text-[16px] text-muted">None filed in the last four months.</p>
        ) : (
          <ol className="relative flex flex-col gap-5 border-l-2 border-surface pl-6">
            {report.announcements.map((a) => (
              <li key={a.url} className="relative flex flex-col gap-1">
                <span aria-hidden="true" className="absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-[3px] border-white bg-mid shadow-[0_0_0_1px_var(--color-line)]" />
                <span className="text-[13px] font-semibold text-ocean">{formatDate(a.filingDate)}</span>
                <span className="text-[17px] leading-snug">{a.events.join(", ")}</span>
                <SourceLink href={a.url} label="8-K filing" />
              </li>
            ))}
          </ol>
        )}
      </Card>
      <Card title="In the news" note="Headlines from news outlets, via TradingView. These are reporters' views, not official company filings.">
        <CompanyNews symbol={report.tradingViewSymbol} />
      </Card>
      <Card title="Where this comes from">
        <p className="text-[16px] leading-relaxed">
          Every number and every point about the business comes from the company&apos;s own reports to the US Securities and
          Exchange Commission (SEC EDGAR). The share price, market value and news are shown as TradingView provides them.
          Fathom doesn&apos;t create financial data; it explains these sources in plain English.
        </p>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- other states

function Disclaimer() {
  return (
    <p className="border-t border-line pt-8 text-sm leading-relaxed text-muted">
      <strong className="font-semibold text-ink">Not financial advice.</strong> Fathom explains public information for
      education only. It does not recommend buying, selling or holding any investment, and does not give price targets.
    </p>
  );
}

function Unsupported({ reason, name }: { reason: "foreign-filer" | "no-recent-reports"; name: string }) {
  return (
    <div className="text-[17px] leading-relaxed">
      {reason === "foreign-filer" ? (
        <p>
          {name} is based outside the US and files a different kind of annual report with the SEC. Fathom doesn&apos;t
          cover these yet.
        </p>
      ) : (
        <p>{name} hasn&apos;t filed an annual or quarterly report with the SEC in the last two years, so there is nothing for Fathom to explain.</p>
      )}
    </div>
  );
}
