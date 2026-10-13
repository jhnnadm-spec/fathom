import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DepthTabs } from "@/components/DepthTabs";
import { CompanyNews, MarketData, PriceChart } from "@/components/MarketWidgets";
import { RevenueChart } from "@/components/RevenueChart";
import { RichText } from "@/components/RichText";
import { SourceLink } from "@/components/SourceLink";
import { formatDate, formatMoney, formatPerDollar, formatPercent, formatPerShare, formatShare } from "@/lib/financials/format";
import type { Comparison } from "@/lib/financials/metrics";
import type { Statement } from "@/lib/financials/templates";
import { termsIn } from "@/lib/financials/templates";
import { lookupTerm } from "@/lib/glossary";
import { getCompanyReport, type CompanyReport } from "@/lib/report/company";

export async function generateMetadata(props: PageProps<"/stock/[ticker]">): Promise<Metadata> {
  const { ticker } = await props.params;
  return { title: `${ticker.toUpperCase()} explained` };
}

export default function StockPage(props: PageProps<"/stock/[ticker]">) {
  return (
    <div className="bg-mist">
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

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
      <Header report={report} />
      {report.support.supported ? (
        <div className="flex flex-wrap items-start gap-6">
          <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
            <DepthTabs
              panels={[
                { id: "surface", label: "Surface", hint: "30 seconds", color: "#CDE7F0", content: <Surface report={report} /> },
                { id: "below", label: "Below", hint: "Breakdown", color: "#7FC4D8", content: <Below report={report} /> },
                { id: "deep", label: "Deep", hint: "Detail", color: "#0B4F6C", content: <Deep report={report} /> },
              ]}
            />
            <Disclaimer />
          </div>
          <Sidebar report={report} />
        </div>
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
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">{company.name}</h1>
        <span className="rounded-lg bg-[#E1F0F5] px-2.5 py-1 text-sm font-semibold text-ocean">
          {company.ticker}
          {company.exchanges[0] ? ` · ${company.exchanges[0]}` : ""}
        </span>
      </div>
      {company.industry && <p className="text-[15px] text-muted">Industry (SEC classification): {company.industry}</p>}
      {(annualReport || quarterlyReport) && (
        <p className="text-[15px] text-muted">
          Based on {annualReport && <>the annual report (10-K) filed {formatDate(annualReport.filingDate)}</>}
          {annualReport && quarterlyReport && " and "}
          {quarterlyReport && <>the quarterly report (10-Q) filed {formatDate(quarterlyReport.filingDate)}</>}.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- shared pieces

function Card({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <section className="flex flex-col gap-3.5 rounded-[20px] border border-line bg-white p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[#2F7A99]">{title}</h2>
        {note && <p className="text-[14px] text-muted">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Said({ statement }: { statement?: Statement }) {
  if (!statement) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[17px] leading-relaxed">
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

function SaidAll({ report, ids }: { report: CompanyReport; ids: string[] }) {
  const found = ids.map((id) => find(report, id)).filter(Boolean) as Statement[];
  if (found.length === 0) {
    return <p className="text-[15px] text-muted">The company doesn&apos;t report these figures in SEC&apos;s standard data, so they&apos;re left out.</p>;
  }
  return (
    <>
      {found.map((s) => (
        <Said key={s.id} statement={s} />
      ))}
    </>
  );
}

function find(report: CompanyReport, id: string) {
  return report.statements.find((s) => s.id === id);
}

function BigChange({ c, noun }: { c?: Comparison; noun: string }) {
  if (!c || c.change === undefined) return null;
  const flat = Math.abs(c.change) < 0.005;
  return (
    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
      <span className="font-display text-3xl font-bold text-ocean sm:text-4xl">
        {flat ? "About the same" : `${c.change > 0 ? "Up" : "Down"} ${formatPercent(c.change)}`}
      </span>
      <span className="text-[15px] text-muted">{noun} vs the year before</span>
    </div>
  );
}

/** A section that the AI step will fill in, listing what it will cover. */
function ComingSoon({ title, items }: { title: string; items: string[] }) {
  return (
    <Card title={title}>
      <p className="text-[16px] leading-relaxed text-muted">
        Coming with Fathom&apos;s plain-English explanations, written from the company&apos;s own reports, with every
        point linked to its source:
      </p>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-[16px] leading-relaxed text-muted">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </Card>
  );
}

// ---------------------------------------------------------------- level 1: Surface

function Surface({ report }: { report: CompanyReport }) {
  const n = report.numbers;
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5">
        <Card title="Is it growing?">
          <BigChange c={n?.annual.revenue} noun="sales" />
          <Said statement={find(report, "revenue-year")} />
        </Card>
        <Card title="Is it making a profit?">
          <Said statement={find(report, "net-income-year")} />
          <Said statement={find(report, "net-margin")} />
        </Card>
        <Card title="Is it financially healthy?">
          <Said statement={find(report, "current-ratio") ?? find(report, "cash")} />
          <Said statement={find(report, "cash-vs-debt")} />
        </Card>
        <Card title="Does the business produce cash?">
          <SaidAll report={report} ids={["free-cash-flow"]} />
        </Card>
      </div>
      <Card
        title="Share price"
        note="The price moves every trading day. Fathom shows it for context; it doesn't say whether the price is right."
      >
        <PriceChart symbol={report.tradingViewSymbol} />
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- level 2: Below

const METRIC_NAMES: Record<string, string> = {
  revenue: "revenue",
  grossProfit: "gross profit",
  operatingIncome: "operating income",
  netIncome: "net income",
  eps: "earnings per share",
  operatingCashFlow: "cash from operations",
  capex: "spending on buildings and equipment",
  cash: "cash",
  longTermDebt: "long-term debt",
  equity: "shareholders' equity",
  assets: "total assets",
  liabilities: "total liabilities",
  currentAssets: "current assets",
  currentLiabilities: "current liabilities",
};

function Below({ report }: { report: CompanyReport }) {
  const n = report.numbers;
  const leftOut = [
    ...new Set(
      (n?.omitted ?? [])
        .filter((o) => o.period !== "quarterly" && METRIC_NAMES[o.id])
        .map((o) => METRIC_NAMES[o.id]),
    ),
  ];
  return (
    <div className="flex flex-col gap-5">
      <ComingSoon
        title="Business model and competitive edge"
        items={[
          "What the company sells and how it makes money",
          "What the company says gives it an edge over competitors, such as its brand, costs or customer loyalty",
          "Where it says it stands in its industry",
        ]}
      />
      <Card title="Growth and profit" note="From the income statement: what the company sold and what it kept.">
        <Said statement={find(report, "revenue-year")} />
        {n && <RevenueChart history={n.revenueHistory} />}
        <SaidAll report={report} ids={["revenue-quarter", "net-income-year", "gross-margin", "net-margin", "margin-trend", "eps"]} />
      </Card>
      <Card title="Financial health" note="From the balance sheet: what the company owns and what it owes.">
        <SaidAll report={report} ids={["cash", "long-term-debt", "cash-vs-debt", "current-ratio", "assets-vs-liabilities", "debt-to-equity", "negative-equity"]} />
      </Card>
      <Card title="Cash flow" note="From the cash flow statement: the actual cash in and out, not just accounting profit.">
        <SaidAll report={report} ids={["operating-cash-flow", "free-cash-flow", "fcf-vs-profit"]} />
      </Card>
      <Card title="How management used the money" note="Choices about reinvesting, rewarding shareholders and buying other companies.">
        <SaidAll report={report} ids={["capital-allocation"]} />
      </Card>
      {leftOut.length > 0 && (
        <p className="rounded-2xl border border-line bg-white px-5 py-4 text-[15px] leading-relaxed text-muted">
          <strong className="text-ink">Left out on purpose:</strong> {leftOut.join(", ")}. The company either
          doesn&apos;t report {leftOut.length > 1 ? "these" : "this"} in SEC&apos;s standard data, or the latest figure
          isn&apos;t available yet. Fathom leaves a number out rather than guess.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- level 3: Deep

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

function KeyRatios({ report }: { report: CompanyReport }) {
  const n = report.numbers;
  if (!n) return null;
  const r = n.ratios;
  const eps = n.annual.eps;
  const year = (end?: string) => (end ? `Year ended ${formatDate(end)}` : undefined);
  const on = (end?: string) => (end ? `On ${formatDate(end)}` : undefined);
  return (
    <Card title="Key ratios" note="Worked out from SEC data. Each ratio only combines figures from the same period or date.">
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
    </Card>
  );
}

function MarginHistory({ report }: { report: CompanyReport }) {
  const rows = report.numbers?.marginHistory ?? [];
  if (rows.length < 2) return null;
  const pct = (v?: number) => (v === undefined ? "–" : formatShare(v));
  return (
    <Card title="Margins year by year" note="How much of each dollar of sales the company kept, at each level of profit.">
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
    </Card>
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

function WhatChanged({ report }: { report: CompanyReport }) {
  const n = report.numbers;
  return (
    <Card title="What changed in a year">
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
      <p className="text-[13px] text-muted">
        Years are compared with the previous year, and quarters with the same quarter a year earlier, because many
        businesses are seasonal.
      </p>
    </Card>
  );
}

function AccountsCheck({ report }: { report: CompanyReport }) {
  const g = report.governance;
  if (!g) return null;
  return (
    <Card
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
          {g.events.map((e) => (
            <li key={e.url + e.kind} className="flex flex-col gap-1.5">
              <span className="text-[17px] leading-relaxed">
                {formatDate(e.filingDate)}:{" "}
                {e.kind === "auditor-change" ? (
                  <RichText text="the company changed its [[auditor|auditor]]." />
                ) : (
                  <RichText text="the company said earlier financial statements should no longer be relied on ([[restatement|restatement notice]])." />
                )}
              </span>
              <SourceLink href={e.url} label="Read the 8-K" />
            </li>
          ))}
        </ul>
      )}
      <p className="text-[13px] text-muted">
        An auditor change has many ordinary reasons; the filing explains why. This check only reports what was filed.
      </p>
    </Card>
  );
}

function Valuation({ report }: { report: CompanyReport }) {
  return (
    <Card
      title="Market value and valuation numbers"
      note="Shown as TradingView provides them. Fathom doesn't give target prices or say whether to buy, sell or hold."
    >
      <p className="text-[15px] leading-relaxed text-muted">
        Two numbers people look at most: <RichText text="[[market-cap|market value]]" /> (what the whole company is
        worth on the stock market) and the <RichText text="[[pe-ratio|P/E ratio]]" /> (the share price compared with a
        year of profit per share).
      </p>
      <MarketData symbol={report.tradingViewSymbol} />
    </Card>
  );
}

function Deep({ report }: { report: CompanyReport }) {
  return (
    <div className="flex flex-col gap-5">
      <KeyRatios report={report} />
      <MarginHistory report={report} />
      <WhatChanged report={report} />
      <AccountsCheck report={report} />
      <ComingSoon
        title="Industry, risks and what's coming up"
        items={[
          "Trends in its industry and what drives demand, as the company describes them",
          "Its biggest risks, and which risks are new or have grown since the last report",
          "Events the company says are coming, such as launches or expansions",
          "Management's outlook, or a clear note when the report gives none",
        ]}
      />
      <Valuation report={report} />
      <Card title="Read the original reports">
        <div className="flex flex-col gap-2">
          {report.annualReport && (
            <SourceLink href={report.annualReport.url} label={`Annual report (10-K) filed ${formatDate(report.annualReport.filingDate)}`} />
          )}
          {report.quarterlyReport && (
            <SourceLink href={report.quarterlyReport.url} label={`Quarterly report (10-Q) filed ${formatDate(report.quarterlyReport.filingDate)}`} />
          )}
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- sidebar

function Sidebar({ report }: { report: CompanyReport }) {
  const terms = [...new Set(report.statements.flatMap((s) => termsIn(s.text)))]
    .map((key) => lookupTerm(key)?.term)
    .filter(Boolean);
  return (
    <aside className="flex flex-[1_1_300px] flex-col gap-5">
      <section className="flex flex-col gap-3.5 rounded-[20px] border border-line bg-white p-5">
        <h2 className="font-display text-xl font-bold">Official announcements</h2>
        {report.announcements.length === 0 && (
          <p className="text-[15px] text-muted">No major announcements filed in the last four months.</p>
        )}
        {report.announcements.map((a) => (
          <div key={a.url} className="flex flex-col gap-1.5 border-b border-line pb-3 last:border-0 last:pb-0">
            <span className="text-[13px] text-muted">{formatDate(a.filingDate)} · 8-K</span>
            <span className="text-[15px] leading-snug">{a.events.join(" · ")}</span>
            <SourceLink href={a.url} label="Read the filing" />
          </div>
        ))}
      </section>
      <section className="flex flex-col gap-2 rounded-[20px] border border-line bg-white p-5">
        <h2 className="font-display text-xl font-bold">In the news</h2>
        <p className="text-[13px] leading-snug text-muted">
          Headlines from news outlets, via TradingView. These are reporters&apos; views, not official company filings.
        </p>
        <CompanyNews symbol={report.tradingViewSymbol} />
      </section>
      {terms.length > 0 && (
        <section className="flex flex-col gap-2.5 rounded-[20px] bg-ocean p-5 text-white">
          <h2 className="font-display text-xl font-bold">Terms on this page</h2>
          <p className="text-sm text-[#D6EBF2]">Tap any underlined word to see what it means.</p>
          <div className="flex flex-wrap gap-2">
            {terms.map((t) => (
              <span key={t} className="rounded-full bg-white/15 px-2.5 py-1 text-sm">
                {t}
              </span>
            ))}
          </div>
        </section>
      )}
      <section className="flex flex-col gap-2.5 rounded-[20px] border border-line bg-white p-5 text-sm">
        <h2 className="font-display text-xl font-bold">Sources for this page</h2>
        <p className="leading-relaxed text-muted">
          <strong className="text-ink">SEC EDGAR</strong>: the company&apos;s annual and quarterly reports,
          announcements, and the financial data tagged in them. All of Fathom&apos;s explanations come from these.
        </p>
        <p className="leading-relaxed text-muted">
          <strong className="text-ink">TradingView</strong>: the share price chart, market value and valuation numbers,
          and news headlines, shown as TradingView provides them.
        </p>
        <p className="leading-relaxed text-muted">
          Fathom doesn&apos;t create financial data. It explains information from these sources in plain English.
        </p>
      </section>
    </aside>
  );
}

// ---------------------------------------------------------------- other states

function Disclaimer() {
  return (
    <p className="rounded-2xl border border-line bg-white px-5 py-4 text-sm leading-relaxed text-muted">
      <strong className="text-ink">Not financial advice.</strong> Fathom explains public information for education only.
      It does not recommend buying, selling or holding any investment, and does not give price targets.
    </p>
  );
}

function Unsupported({ reason, name }: { reason: "foreign-filer" | "no-recent-reports"; name: string }) {
  return (
    <div className="rounded-[20px] border border-line bg-white p-6 text-[17px] leading-relaxed">
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
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8" aria-busy="true">
      <div className="h-12 w-72 animate-pulse rounded-xl bg-[#DCEBF1]" />
      <div className="h-5 w-96 max-w-full animate-pulse rounded bg-[#E3EFF4]" />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-[20px] bg-white" />
        ))}
      </div>
      <p className="text-[15px] text-muted">Reading the latest reports from the SEC…</p>
    </div>
  );
}
