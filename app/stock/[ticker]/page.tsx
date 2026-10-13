import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DepthTabs } from "@/components/DepthTabs";
import { RevenueChart } from "@/components/RevenueChart";
import { RichText } from "@/components/RichText";
import { SourceLink } from "@/components/SourceLink";
import { formatDate, formatMoney, formatPercent } from "@/lib/financials/format";
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
          Based on{" "}
          {annualReport && (
            <>
              the annual report (10-K) filed {formatDate(annualReport.filingDate)}
            </>
          )}
          {annualReport && quarterlyReport && " and "}
          {quarterlyReport && <>the quarterly report (10-Q) filed {formatDate(quarterlyReport.filingDate)}</>}.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- shared pieces

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-6">
      <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[#2F7A99]">{title}</h2>
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

function find(report: CompanyReport, id: string) {
  return report.statements.find((s) => s.id === id);
}

function BigChange({ c, noun }: { c?: Comparison; noun: string }) {
  if (!c || c.change === undefined) return null;
  const word = Math.abs(c.change) < 0.005 ? "flat" : c.change > 0 ? "up" : "down";
  return (
    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
      <span className="font-display text-3xl font-bold text-ocean sm:text-4xl">
        {word === "flat" ? "About the same" : `${word === "up" ? "Up" : "Down"} ${formatPercent(c.change)}`}
      </span>
      <span className="text-[15px] text-muted">{noun} vs the year before</span>
    </div>
  );
}

// ---------------------------------------------------------------- level 1: Surface

function Surface({ report }: { report: CompanyReport }) {
  const n = report.numbers;
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5">
      <Card title="Is it growing?">
        <BigChange c={n?.annual.revenue} noun="sales" />
        <Said statement={find(report, "revenue-year")} />
      </Card>
      <Card title="Is it making a profit?">
        <Said statement={find(report, "net-income-year")} />
        <Said statement={find(report, "net-margin")} />
      </Card>
      <Card title="Cash and debt">
        <Said statement={find(report, "cash")} />
        <Said statement={find(report, "cash-vs-debt")} />
      </Card>
      <Card title="What it does and its biggest risk">
        <p className="text-[17px] leading-relaxed text-muted">
          A plain-English description of the business and its biggest risk will appear here once Fathom&apos;s
          explanations are switched on. Until then, you can read them in the company&apos;s own words in its annual
          report: the &ldquo;Business&rdquo; and &ldquo;Risk Factors&rdquo; sections.
        </p>
        {report.annualReport && (
          <SourceLink href={report.annualReport.url} label={`10-K filed ${formatDate(report.annualReport.filingDate)}`} />
        )}
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
  operatingCashFlow: "cash from operations",
  cash: "cash",
  longTermDebt: "long-term debt",
};

function Below({ report }: { report: CompanyReport }) {
  const n = report.numbers;
  const leftOut = [
    ...new Set(
      (n?.omitted ?? [])
        .filter((o) => o.period !== "quarterly" && o.id !== "operatingIncome")
        .map((o) => METRIC_NAMES[o.id]),
    ),
  ];
  return (
    <div className="flex flex-col gap-5">
      <Card title="Growth">
        <Said statement={find(report, "revenue-year")} />
        {n && <RevenueChart history={n.revenueHistory} />}
        <Said statement={find(report, "revenue-quarter")} />
      </Card>
      <Card title="Profit">
        <Said statement={find(report, "net-income-year")} />
        <Said statement={find(report, "gross-margin")} />
        <Said statement={find(report, "net-margin")} />
        <Said statement={find(report, "operating-cash-flow")} />
      </Card>
      <Card title="Cash and debt">
        <Said statement={find(report, "cash")} />
        <Said statement={find(report, "long-term-debt")} />
        <Said statement={find(report, "cash-vs-debt")} />
      </Card>
      {leftOut.length > 0 && (
        <p className="rounded-2xl border border-line bg-white px-5 py-4 text-[15px] leading-relaxed text-muted">
          <strong className="text-ink">Left out on purpose:</strong> {leftOut.join(", ")}. The company either
          doesn&apos;t report {leftOut.length > 1 ? "these" : "this"} in SEC&apos;s standard data, or the latest
          figure isn&apos;t available yet. Fathom leaves a number out rather than guess.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- level 3: Deep

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

function Deep({ report }: { report: CompanyReport }) {
  const n = report.numbers;
  return (
    <div className="flex flex-col gap-5">
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
            </tbody>
          </table>
        </div>
        <p className="text-[13px] text-muted">
          Every figure comes from SEC data. Years are compared with the previous year, and quarters with the same
          quarter a year earlier, because many businesses are seasonal.
        </p>
      </Card>
      <Card title="Management's outlook and new risks">
        <p className="text-[17px] leading-relaxed text-muted">
          What management expects next, and which risks are new or growing, will appear here once Fathom&apos;s
          explanations are switched on. Each point will link to the section of the report it came from.
        </p>
      </Card>
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
    <aside className="flex flex-[1_1_280px] flex-col gap-5">
      <section className="flex flex-col gap-3.5 rounded-[20px] border border-line bg-white p-5">
        <h2 className="font-display text-xl font-bold">Recent announcements</h2>
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
          announcements, and the financial data tagged in them.
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
      <strong className="text-ink">Not financial advice.</strong> Fathom explains public filings for education only.
      It does not recommend buying, selling or holding any investment.
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
