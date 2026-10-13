import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { DepthTabs } from "@/components/DepthTabs";
import { ExplainButton } from "@/components/ExplainButton";
import { CompanyNews, MarketData, PriceChart } from "@/components/MarketWidgets";
import { RevenueChart } from "@/components/RevenueChart";
import { RichText } from "@/components/RichText";
import { SourceLink } from "@/components/SourceLink";
import { explanationState, type ExplanationState } from "@/lib/explain/ondemand";
import type { CheckedClaim, SavedExplanation } from "@/lib/explain/types";
import { formatDate, formatMoney, formatPerDollar, formatPercent, formatPerShare, formatShare } from "@/lib/financials/format";
import type { Comparison } from "@/lib/financials/metrics";
import type { Statement } from "@/lib/financials/templates";
import { lookupTerm } from "@/lib/glossary";
import { getCompanyReport, type CompanyReport } from "@/lib/report/company";
import { areasFor, claimsFor, leftOutNames, statementsFor, SURFACE, type Block, type Item } from "@/lib/report/outline";

export async function generateMetadata(props: PageProps<"/stock/[ticker]">): Promise<Metadata> {
  const { ticker } = await props.params;
  return { title: `${ticker.toUpperCase()} explained` };
}

export default function StockPage(props: PageProps<"/stock/[ticker]">) {
  return (
    <div>
      <Suspense fallback={<ReportLoading />}>
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

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-10 px-5 py-10 sm:py-14">
      <Header report={report} />
      {report.support.supported ? (
        <>
          <div className="flex flex-col gap-8">
            <ExplainStatus ticker={report.company.ticker} state={state} />
            <DepthTabs
              panels={[
                { id: "surface", label: "Surface", hint: "1 minute", color: "#CDE7F0", content: <Surface report={report} e={e} level="surface" /> },
                { id: "below", label: "Below", hint: "Explained", color: "#7FC4D8", content: <Detail report={report} e={e} level="below" /> },
                { id: "deep", label: "Deep", hint: "Everything", color: "#0B4F6C", content: <Detail report={report} e={e} level="deep" /> },
              ]}
            />
          </div>
          <MoreInfo report={report} />
          <Disclaimer />
        </>
      ) : (
        <Unsupported reason={report.support.reason} name={report.company.name} />
      )}
    </div>
  );
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
        <div>
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

function Said({ statement }: { statement?: Statement }) {
  if (!statement) return null;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[17px] leading-[1.65]">
        <RichText text={statement.text} />
      </p>
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
      <p className="rounded-2xl border border-line bg-white px-5 py-4 text-[15px] leading-relaxed text-muted">
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
            <p className="my-1 border-l-2 border-surface pl-3 text-[14px] leading-relaxed text-muted">
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
          <h3 className="font-display text-lg font-bold">{item.title}</h3>
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
      return found.map((s) => <Said key={`${key}-${s.id}`} statement={s} />);
    }
    case "block":
      return <BlockView key={key} block={item.block} report={report} />;
  }
}

function Surface(ctx: Ctx) {
  const rows = SURFACE.map((row) => {
    const needsAi = row.items.some((i) => i.kind === "topic");
    const shown = row.items.filter((i) => hasContent(i, ctx));
    if (shown.length === 0 && !(needsAi && !ctx.e)) return null;
    return (
      <div key={row.label} className="grid gap-x-8 gap-y-1 border-t border-line py-5 sm:grid-cols-[170px_1fr]">
        <h3 className="pt-0.5 text-[15px] font-semibold text-ocean">{row.label}</h3>
        <div className="flex flex-col gap-3">{shown.length === 0 ? <NotWritten /> : shown.map((i, n) => renderItem(i, ctx, `${row.label}-${n}`))}</div>
      </div>
    );
  });
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-5">
        <p className="text-[15px] leading-relaxed text-muted">
          The whole company in a minute. For more on each part, open Below; for everything, open Deep.
        </p>
        <div className="flex flex-col border-b border-line">{rows}</div>
      </section>
      <Card
        title="Share price"
        note="The price moves every trading day. Fathom shows it for context; it doesn't say whether the price is right."
      >
        <PriceChart symbol={ctx.report.tradingViewSymbol} />
      </Card>
      {ctx.e && <AiNote e={ctx.e} />}
    </div>
  );
}

function Detail(ctx: Ctx & { level: "below" | "deep" }) {
  return (
    <div className="flex flex-col gap-12">
      {areasFor(ctx.level).map((area) => {
        const needsAi = area.items.some((i) => i.kind === "topic");
        const content = needsAi && !ctx.e ? [<NotWritten key="nw" />] : area.items.map((i, n) => renderItem(i, ctx, `${area.id}-${n}`));
        return (
          <section key={area.id} id={`${ctx.level}-${area.id}`} className="flex flex-col gap-5 border-t border-line pt-8 first:border-0 first:pt-0">
            <div className="flex flex-col gap-1.5">
              <h2 className="font-display text-2xl font-bold">{area.title}</h2>
              <p className="text-[15px] leading-relaxed text-muted">{area.why}</p>
            </div>
            {content}
          </section>
        );
      })}
      {ctx.e && <AiNote e={ctx.e} />}
    </div>
  );
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
  }
}

function BlockView({ block, report }: { block: Block; report: CompanyReport }) {
  if (!blockHasContent(block, report)) return null;
  const n = report.numbers;
  switch (block) {
    case "revenueChart":
      return <RevenueChart history={n!.revenueHistory} />;
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
        </div>
      );
  }
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

function Row({ name, term, value, detail }: { name: string; term?: string; value?: string; detail?: string }) {
  if (!value) return null;
  const entry = term ? lookupTerm(term) : undefined;
  return (
    <tr className="border-b border-line align-top">
      <th scope="row" className="py-3 pr-4 text-left font-medium">
        {name}
        {entry && <span className="block max-w-md text-[13px] font-normal leading-snug text-muted">{entry.definition}</span>}
      </th>
      <td className="whitespace-nowrap py-3 pr-4 text-right font-semibold tabular-nums">{value}</td>
      <td className="py-3 text-right text-[13px] text-muted">{detail}</td>
    </tr>
  );
}

function ChangeRow({ name, c, period }: { name: string; c?: Comparison; period: string }) {
  if (!c) return null;
  const change =
    c.change === undefined ? "–" : Math.abs(c.change) < 0.005 ? "About the same" : `${c.change > 0 ? "Up" : "Down"} ${formatPercent(c.change)}`;
  return (
    <tr className="border-b border-line">
      <th scope="row" className="py-3 pr-4 text-left font-medium">
        {name}
        <span className="block text-[13px] font-normal text-muted">
          {period === "On" ? `On ${formatDate(c.latest.end)}` : `${period} ended ${formatDate(c.latest.end)}`}
        </span>
      </th>
      <td className="py-3 pr-4 text-right tabular-nums">{formatMoney(c.latest.value)}</td>
      <td className="py-3 pr-4 text-right tabular-nums text-muted">{c.previous ? formatMoney(c.previous.value) : "–"}</td>
      <td className="py-3 text-right font-medium">{change}</td>
    </tr>
  );
}

function KeyRatios({ report }: { report: CompanyReport }) {
  const n = report.numbers!;
  const r = n.ratios;
  const eps = n.annual.eps;
  const year = (end?: string) => (end ? `Year ended ${formatDate(end)}` : undefined);
  const on = (end?: string) => (end ? `On ${formatDate(end)}` : undefined);
  return (
    <Sub title="Key ratios" note="Worked out from SEC data. Each ratio only combines figures from the same period or date.">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-[15px]">
          <tbody>
            <Row name="Return on equity" term="return-on-equity" value={r.returnOnEquity && formatShare(r.returnOnEquity.value)} detail={year(r.returnOnEquity?.end)} />
            <Row name="Debt-to-equity" term="debt-to-equity" value={r.debtToEquity && `${formatPerDollar(r.debtToEquity.value)} per $1`} detail={on(r.debtToEquity?.end)} />
            <Row name="Current ratio" term="current-ratio" value={r.currentRatio && r.currentRatio.value.toFixed(2)} detail={on(r.currentRatio?.end)} />
            <Row name="Assets per $1 owed" term="total-liabilities" value={r.assetsToLiabilities && formatPerDollar(r.assetsToLiabilities.value)} detail={on(r.assetsToLiabilities?.end)} />
            <Row name="Gross margin" term="gross-margin" value={n.margins.gross !== undefined ? formatShare(n.margins.gross) : undefined} detail={year(n.margins.periodEnd)} />
            <Row name="Operating margin" term="operating-margin" value={n.margins.operating !== undefined ? formatShare(n.margins.operating) : undefined} detail={year(n.margins.periodEnd)} />
            <Row name="Profit margin" term="profit-margin" value={n.margins.net !== undefined ? formatShare(n.margins.net) : undefined} detail={year(n.margins.periodEnd)} />
            <Row
              name="Earnings per share"
              term="eps"
              value={eps && formatPerShare(eps.latest.value)}
              detail={eps ? `${year(eps.latest.end)}${eps.change !== undefined ? `, ${eps.change >= 0 ? "up" : "down"} ${formatPercent(eps.change)}` : ""}` : undefined}
            />
            <Row name="Free cash flow" term="free-cash-flow" value={r.freeCashFlow && formatMoney(r.freeCashFlow.value)} detail={year(r.freeCashFlow?.end)} />
          </tbody>
        </table>
      </div>
    </Sub>
  );
}

function MarginHistory({ report }: { report: CompanyReport }) {
  const rows = report.numbers!.marginHistory;
  const pct = (v?: number) => (v === undefined ? "–" : formatShare(v));
  return (
    <Sub title="Margins year by year" note="How much of each dollar of sales the company kept, at each level of profit.">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-[15px]">
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
    </Sub>
  );
}

function WhatChanged({ report }: { report: CompanyReport }) {
  const n = report.numbers;
  return (
    <Sub
      title="What changed in a year"
      note="Years are compared with the previous year, and quarters with the same quarter a year earlier, because many businesses are seasonal."
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-[15px]">
          <thead>
            <tr className="border-b-2 border-line text-[13px] text-muted">
              <th className="py-2 pr-4 text-left font-semibold">Figure</th>
              <th className="py-2 pr-4 text-right font-semibold">Latest</th>
              <th className="py-2 pr-4 text-right font-semibold">A year earlier</th>
              <th className="py-2 text-right font-semibold">Change</th>
            </tr>
          </thead>
          <tbody>
            <ChangeRow name="Revenue" c={n?.annual.revenue} period="Year" />
            <ChangeRow name="Revenue" c={n?.quarter.revenue} period="Quarter" />
            <ChangeRow name="Net income" c={n?.annual.netIncome} period="Year" />
            <ChangeRow name="Net income" c={n?.quarter.netIncome} period="Quarter" />
            <ChangeRow name="Cash from operations" c={n?.annual.operatingCashFlow} period="Year" />
            <ChangeRow name="Cash" c={n?.balance.cash} period="On" />
            <ChangeRow name="Long-term debt" c={n?.balance.longTermDebt} period="On" />
            <ChangeRow name="Shareholders' equity" c={n?.balance.equity} period="On" />
          </tbody>
        </table>
      </div>
    </Sub>
  );
}

/** One plain sentence: did the company file either official warning sign? */
function AccountsSummary({ report }: { report: CompanyReport }) {
  const g = report.governance!;
  if (g.events.length === 0) {
    return (
      <p className="text-[17px] leading-relaxed">
        None found. Since {formatDate(g.since)}, the company hasn&apos;t announced a change of{" "}
        <RichText text="[[auditor|auditor]]" /> or said its past accounts were wrong (
        <RichText text="[[restatement|a restatement]]" />
        ).
      </p>
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
          <ul className="flex flex-col">
            {report.announcements.map((a) => (
              <li key={a.url} className="flex flex-col gap-1 border-t border-line py-4 first:border-0 first:pt-0">
                <span className="text-[13px] text-muted">{formatDate(a.filingDate)}</span>
                <span className="text-[17px] leading-snug">{a.events.join(", ")}</span>
                <SourceLink href={a.url} label="8-K filing" />
              </li>
            ))}
          </ul>
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

function ReportLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-5 px-5 py-14" aria-busy="true">
      <div className="h-5 w-40 animate-pulse rounded bg-mist" />
      <div className="h-12 w-80 max-w-full animate-pulse rounded-lg bg-mist" />
      <div className="mt-6 flex flex-col gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-5 animate-pulse rounded bg-mist" style={{ width: `${90 - i * 9}%` }} />
        ))}
      </div>
      <p className="text-[15px] text-muted">Reading the latest reports from the SEC…</p>
    </div>
  );
}
