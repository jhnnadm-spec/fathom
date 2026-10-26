import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { ResearchStep } from "@/components/ResearchStep";
import { WatchButton } from "@/components/WatchButton";
import { Loader } from "@/components/Loader";
import { ExplainButton } from "@/components/ExplainButton";
import { CompanyNews, MarketData, PriceChart } from "@/components/MarketWidgets";
import { BillsGauge, Columns, Lines, PairBars, StackedBar } from "@/components/viz/Charts";
import { RichText } from "@/components/RichText";
import { SourceLink } from "@/components/SourceLink";
import { describeAnnouncement, EVENT_WHY, stepsForEvent } from "@/lib/sec/events";
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
import { FundamentalGlance } from "@/components/FundamentalGlance";
import { fundamentalFromReport } from "@/lib/lens/fundamental";
import { Forces, ForcesSummary } from "@/components/Forces";
import { getMacro } from "@/lib/macro/data";
import { buildForces } from "@/lib/report/forces";
import { billsGauge, cashVsDebt, compareFor, marginLines, moneyUses, pairFor, salesHistory, salesSplit, SERIES, shareFor } from "@/lib/report/visuals";
import { DotGrid, Meter, StatusBadge, TopicIcon } from "@/components/viz/Static";
import { AtDepth, DepthProvider, DetailBar } from "@/components/Depth";
import { CompanyLogo } from "@/components/CompanyLogo";
import { BigAnswer, KeepBar, LiteCard, MiniBars, MiniGauge, MiniPair, SaidAnswer, SourceChips, UsesBar } from "@/components/Lite";

export async function generateMetadata(props: PageProps<"/stock/[ticker]">): Promise<Metadata> {
  const { ticker } = await props.params;
  return { title: `${ticker.toUpperCase()} explained` };
}

export default function StockPage(props: PageProps<"/stock/[ticker]">) {
  return (
    <div>
      <Suspense
        fallback={<Loader steps={["Reading the latest reports from the SEC…", "Pulling out the key numbers…", "Putting it into plain English…"]} />}
      >
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
  if (!report.support.supported) {
    const profile = await getCompanyProfile(report.company.cik);
    return (
      <div className="mx-auto flex w-full max-w-[800px] flex-col gap-10 px-5 py-10 sm:py-14">
        <Hero report={report} profile={profile} company={shortCompany(report.company.name)} />
        <Unsupported reason={report.support.reason} name={report.company.name} />
      </div>
    );
  }
  const [profile, macro] = await Promise.all([getCompanyProfile(report.company.cik), getMacro()]);
  const company = shortCompany(report.company.name);
  const forces = buildForces(company, report.numbers, e, macro);
  const now = (id: string) => forces.find((f) => f.id === id)?.now?.text;
  const mentioned = (id: string) => (forces.some((f) => f.id === id) ? `${company} mentions this in its own reports: see "What moves the results"` : undefined);
  const nodes = conceptMap(report.numbers, {
    rates: now("rates"),
    inflation: now("inflation"),
    demand: now("demand"),
    sentiment: "Changes every day with news and mood: see the live share price in step 7",
    competition: mentioned("competition"),
    rules: mentioned("rules"),
  });
  const lead = e?.topics.whatItDoes?.[0];
  const fundamentals = fundamentalFromReport(report);
  const ctx: Ctx = { report, e, level: "surface" };

  return (
    <DepthProvider>
      <div className="mx-auto flex w-full max-w-[800px] flex-col gap-10 px-5 pb-16 pt-8 sm:pt-12">
        <Hero report={report} profile={profile} company={company} lead={lead} />
        <ExplainStatus ticker={report.company.ticker} state={state} />
        <Contents company={company} />
        {fundamentals && <FundamentalGlance result={fundamentals} />}
        <DetailBar />
        <div className="-mt-4 flex flex-col gap-14">
          {STEPS.map((step, i) => (
            <ResearchStep
              key={step.id}
              ticker={report.company.ticker}
              id={step.id}
              number={i + 1}
              total={STEPS.length}
              question={step.question}
              brief={step.brief}
              term={<TermName k={step.term} />}
              surface={surfaceBody(step, ctx, Boolean(lead))}
              below={deeperBody(step, ctx, "below", profile)}
              deep={deeperBody(step, ctx, "deep", profile)}
            />
          ))}
          <section id="whole-picture" className="flex scroll-mt-20 flex-col gap-8 border-t border-line pt-10">
            <AtDepth max="below">
              <ForcesSummary forces={forces} company={company} />
            </AtDepth>
            <AtDepth only="deep">
              <Forces forces={forces} nodes={nodes} company={company} />
              <ConceptMap nodes={nodes} company={company} />
            </AtDepth>
          </section>
          <section id="numbers" className="flex scroll-mt-20 flex-col gap-3 border-t border-line pt-10">
            <h2 className="font-display text-[26px] font-bold tracking-tight">Want to dig further?</h2>
            <AllNumbers report={report} />
            <MoreInfo report={report} />
          </section>
          <div className="flex flex-col gap-3">
            {e && <AiNote e={e} />}
            <Disclaimer />
          </div>
        </div>
      </div>
    </DepthProvider>
  );
}

/** "Coca Cola Co" → "Coca Cola", for use inside sentences. */
function shortCompany(name: string): string {
  return name.replace(/,?\s+(Inc\.?|Corp(oration)?\.?|Co\.?|Company|Ltd\.?|plc|Holdings?|Group)$/i, "").replace(/^The\s+/i, "");
}

// ---------------------------------------------------------------- the top of the page

/** Who the company is, in one look: logo, name, one plain sentence and a few facts. */
function Hero({ report, profile, company, lead }: { report: CompanyReport; profile?: CompanyProfile; company: string; lead?: CheckedClaim }) {
  const { company: c, annualReport, quarterlyReport } = report;
  const facts: string[] = [];
  if (profile?.founded) facts.push(`Started in ${profile.founded}`);
  if (profile?.headquarters) facts.push(`Based in ${profile.headquarters}`);
  if (profile?.employees) facts.push(`${compactCount(profile.employees.count)} people work there`);
  return (
    <header id="top" className="flex scroll-mt-8 flex-col gap-5">
      <div className="flex items-center gap-4">
        <CompanyLogo name={c.name} logo={profile?.logo} website={profile?.website} size={60} />
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="font-display text-[34px] font-bold leading-[1.05] tracking-tight sm:text-[44px]">{company}</h1>
          <p className="flex flex-wrap items-center gap-2 text-[14px] text-muted">
            <span className="rounded-md bg-panel-2 px-2 py-0.5 font-bold tracking-wide text-ocean" title="Its short code on the stock market (ticker)">
              {c.ticker}
            </span>
            {c.industry && <span>{sentenceCase(c.industry)}</span>}
          </p>
        </div>
      </div>
      {lead && (
        <div className="flex flex-col gap-2">
          <p className="text-[20px] leading-[1.5] text-ink">{lead.text}</p>
          <SourceChips sources={[lead.source]} />
        </div>
      )}
      {facts.length > 0 && <p className="text-[15px] text-muted">{facts.join(" · ")}</p>}
      {report.support.supported && (
        <div className="flex flex-wrap items-center gap-2">
          <WatchButton ticker={c.ticker} name={c.name} />
          {/* A plain link: the browser downloads the file the server makes. */}
          <a
            href={`/stock/${encodeURIComponent(c.ticker)}/pdf`}
            download
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 text-[15px] font-semibold text-ocean no-underline transition-colors hover:border-mid"
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
      {(annualReport || quarterlyReport) && (
        <p className="text-[13px] text-muted">
          Explained from its latest {annualReport && quarterlyReport ? "yearly and quarterly reports" : annualReport ? "yearly report" : "quarterly report"} to
          the SEC, filed {formatDate((quarterlyReport ?? annualReport)!.filingDate)}.
        </p>
      )}
    </header>
  );
}

/** 164000 → "164,000"; 2100000 → "2.1 million". */
function compactCount(n: number): string {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")} million` : n.toLocaleString("en-US");
}

/** "BEVERAGES" or "Services-Prepackaged Software" → "Beverages", "Services: prepackaged software". */
function sentenceCase(s: string): string {
  const t = s.toLowerCase().replace(/-/g, ": ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Before the questions: a plain list of what's ahead, each one a link. */
function Contents({ company }: { company: string }) {
  return (
    <nav aria-labelledby="contents-title" className="flex flex-col gap-3 rounded-2xl bg-mist p-5 sm:p-6">
      <h2 id="contents-title" className="text-[17px] font-semibold">
        7 questions about {company}
      </h2>
      <ol className="m-0 grid list-none gap-x-6 gap-y-1 p-0 sm:grid-cols-2">
        {STEPS.map((s, i) => (
          <li key={s.id}>
            <a href={`#step-${s.id}`} className="flex min-h-9 items-baseline gap-2.5 py-1 text-[15px] text-ink no-underline hover:text-ocean">
              <span className="w-4 flex-none text-right font-semibold text-mid">{i + 1}</span>
              <span>{s.title}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

// ---------------------------------------------------------------- shared pieces

function Said({ statement, visual }: { statement?: Statement; visual?: ReactNode }) {
  if (!statement) return null;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[17px] leading-[1.65]">
        <RichText text={statement.text} />
      </p>
      {visual && <div className="my-2 rounded-xl bg-[#f3f8fa] p-4">{visual}</div>}
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
      <p className="rounded-2xl bg-mist px-5 py-4 text-[15px] leading-relaxed text-muted">
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
      points that failed the check were removed. All numbers come straight from the reports (SEC EDGAR), not from AI. The share price and news come from TradingView.
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

/** Official announcements from the last four months that bear on one research step. */
function StepNews({ step, report }: { step: string; report: CompanyReport }) {
  const relevant = report.announcements
    .map((a) => ({ ...a, codes: a.codes.filter((c) => stepsForEvent(c).includes(step)) }))
    .filter((a) => a.codes.length > 0)
    .slice(0, 3);
  return (
    <details className="group rounded-2xl border border-line px-5 py-3">
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3">
        <span className="flex flex-col">
          <span className="text-[15px] font-semibold">
            Recent official announcements that affect this <span className="font-normal text-muted">(8-K filings)</span>
          </span>
          <span className="text-[13px] text-muted">
            {relevant.length === 0 ? "None in the last four months." : `${relevant.length} in the last four months`}
          </span>
        </span>
        {relevant.length > 0 && (
          <span aria-hidden="true" className="text-xl text-ocean transition-transform group-open:rotate-45">
            +
          </span>
        )}
      </summary>
      {relevant.length > 0 && (
        <ol className="mt-3 flex flex-col gap-4 border-t border-line pt-3">
          {relevant.map((a) => (
            <li key={a.url} className="flex flex-col gap-1">
              <span className="text-[13px] font-semibold text-ocean">{formatDate(a.filingDate)}</span>
              {a.codes.map((c) => (
                <span key={c} className="flex flex-col">
                  <span className="text-[16px] font-semibold">{describeAnnouncement([c])[0]}</span>
                  <span className="text-[14px] leading-relaxed text-muted">{EVENT_WHY[c]}</span>
                </span>
              ))}
              <SourceLink href={a.url} label="8-K filing" />
            </li>
          ))}
        </ol>
      )}
      <p className="mt-2 text-[13px] text-muted">
        News headlines are at the bottom of the page, under <a href="#news">News and announcements</a>.
      </p>
    </details>
  );
}

// ---------------------------------------------------------------- Surface: the short answers

type Step = (typeof STEPS)[number];

/** The sources behind one of the short sentences written from the numbers. */
function sourcesOf(report: CompanyReport, id: string): { url: string; label: string }[] {
  return report.statements.find((s) => s.id === id)?.sources ?? [];
}

/** One Surface card for one question: a short answer, a simple picture, and its source. */
function liteFor(row: SurfaceRow, ctx: Ctx, key: string): ReactNode {
  const { report, e } = ctx;
  const n = report.numbers;
  const term = row.term ? <TermName k={row.term} /> : undefined;
  const card = (body: ReactNode, sources: { url: string; label: string }[] = [], wide = false) => (
    <LiteCard key={key} question={row.label} term={term} sources={sources} wide={wide}>
      {body}
    </LiteCard>
  );
  // If a picture can't be drawn, fall back to the plain sentence written from the numbers.
  const sentence = (id: string) => {
    const s = report.statements.find((x) => x.id === id);
    return s ? card(<SaidAnswer text={plainText(s.text)} />, s.sources) : null;
  };

  switch (row.visual) {
    case "salesSplit": {
      const d = salesSplit(n);
      if (!d) return sentence("s-profit");
      const kept = d.segments.at(-1)!.value;
      return card(
        <>
          <BigAnswer value={`$${Math.round(kept)} of every $100`} caption="of sales was kept as profit" tone="good" />
          <KeepBar kept={kept} />
        </>,
        sourcesOf(report, "s-profit"),
      );
    }
    case "salesGrowth": {
      const d = salesHistory(n);
      if (!d || d.change === undefined) return sentence("s-growth");
      const up = d.change >= 0;
      return card(
        <>
          <BigAnswer value={`${up ? "+" : "−"}${formatPercent(Math.abs(d.change))}`} caption={up ? "more in sales than the year before" : "less in sales than the year before"} tone={up ? "ocean" : "warn"} />
          <MiniBars bars={d.bars.slice(-6)} />
        </>,
        sourcesOf(report, "s-growth"),
      );
    }
    case "billsGauge": {
      const d = billsGauge(n);
      if (!d) return sentence("s-bills");
      return card(
        <>
          <BigAnswer value={`$${d.value.toFixed(2)}`} caption="ready for every $1 of bills due within a year" tone={d.value >= 1 ? "ocean" : "warn"} />
          <MiniGauge value={d.value} />
        </>,
        sourcesOf(report, "s-bills"),
      );
    }
    case "cashVsDebt": {
      const d = cashVsDebt(n);
      if (!d) return sentence("s-debt");
      return card(
        <>
          <BigAnswer value={formatMoney(d.debt)} caption="borrowed for longer than a year" />
          <MiniPair
            items={[
              { label: "Cash in the bank", value: d.cash, display: formatMoney(d.cash), color: SERIES.green },
              { label: "Long-term debt", value: d.debt, display: formatMoney(d.debt), color: SERIES.orange },
            ]}
          />
        </>,
        sourcesOf(report, "s-debt"),
      );
    }
    case "spareCash": {
      const f = n?.ratios.freeCashFlow;
      const flow = pairFor("s-cash", n);
      if (!f) return sentence("s-cash");
      return card(
        <>
          <BigAnswer value={formatMoney(f.value)} caption={f.value >= 0 ? "spare cash after investing in itself" : "more spent than its business brought in"} tone={f.value >= 0 ? "good" : "warn"} />
          {flow && <MiniPair items={flow} />}
        </>,
        sourcesOf(report, "s-cash"),
      );
    }
    case "moneyUses": {
      const d = moneyUses(n);
      if (!d) return sentence("s-spending");
      const top = d.segments[0];
      return card(
        <>
          <BigAnswer value={top.display} caption={`on ${top.label.replace(/\s*\(.*\)$/, "").replace(/^./, (x) => x.toLowerCase())}, its biggest use`} />
          <UsesBar segments={d.segments} />
        </>,
        sourcesOf(report, "s-spending"),
        true,
      );
    }
  }

  const item = row.items[0];
  if (item.kind === "block" && item.block === "accountsSummary") {
    const g = report.governance;
    if (!g) return null;
    const ok = g.events.length === 0;
    return card(
      <>
        <StatusBadge ok={ok}>{ok ? "No warning signs filed" : `${g.events.length} notice${g.events.length > 1 ? "s" : ""} filed`}</StatusBadge>
        <SaidAnswer text={ok ? `No change of auditor and no corrected accounts since ${formatDate(g.since)}.` : "It filed an auditor change or a correction to past accounts. Go deeper to see which."} />
      </>,
      g.events.map((x) => ({ url: x.url, label: `8-K filed ${formatDate(x.filingDate)}` })),
    );
  }
  if (item.kind === "topic") {
    const claim = claimsFor(e, item)[0];
    if (!claim) return e ? null : card(<p className="text-[16px] leading-relaxed text-muted">Not written yet. Use the button near the top to ask Fathom to write it.</p>);
    return card(<SaidAnswer text={claim.text} />, [claim.source]);
  }
  return null;
}

/** "[[net-income|kept as profit]]" → "kept as profit": Surface cards show the sentence without term links. */
function plainText(text: string): string {
  return text.replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g, "$1");
}

/** A step at Surface: its short-answer cards, two to a row. */
function surfaceBody(step: Step, ctx: Ctx, leadShown: boolean): ReactNode {
  const rows = SURFACE.filter((r) => step.areas.includes(r.area)).filter((r) => !(leadShown && r.items[0].kind === "topic" && r.items[0].topic === "whatItDoes"));
  const cards = rows.map((r, i) => liteFor(r, ctx, `${step.id}-${i}`)).filter(Boolean);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {cards}
      {step.id === "value" && (
        <LiteCard question="What does the stock market pay for it?" term={<TermName k="share-price" />} wide>
          <p className="text-[16px] text-muted">The share price over the past year. It moves every trading day; Fathom never says whether it&apos;s right.</p>
          <PriceChart symbol={ctx.report.tradingViewSymbol} />
        </LiteCard>
      )}
    </div>
  );
}

/** A step at Below or Deep: the full explanation, in one readable column. */
function deeperBody(step: Step, ctx: Ctx, level: "below" | "deep", profile?: CompanyProfile): ReactNode {
  const { report } = ctx;
  const sameLayers = step.areas.every((id) => {
    const a = AREAS.find((x) => x.id === id)!;
    return JSON.stringify(a.below) === JSON.stringify(a.deep);
  });
  return (
    <div className="flex flex-col gap-6">
      {level === "deep" && <AnalystBox step={step} />}
      <div className="flex flex-col gap-8">
        {step.id === "business" && profile && <ProfileFacts profile={profile} />}
        {step.id === "business" && profile?.wikipedia && level === "below" && <WikipediaIntro w={profile.wikipedia} />}
        {step.areas.map((a) => areaLayer(a, level === "deep" && sameLayers ? "below" : level, ctx, step.areas.length > 1))}
        {step.id === "value" && (
          <ChartPanel title="Share price over the past year" note="The price moves every trading day. Fathom shows it for context; it doesn't say whether the price is right.">
            <PriceChart symbol={report.tradingViewSymbol} />
          </ChartPanel>
        )}
      </div>
      {level === "deep" && <StepNews step={step.id} report={report} />}
    </div>
  );
}

/** At Deep: why analysts look at this step, and what they look for. */
function AnalystBox({ step }: { step: Step }) {
  return (
    <div className="grid gap-5 rounded-2xl bg-mist p-5 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] sm:p-6">
      <div className="flex flex-col gap-1.5">
        <p className="text-[14px] font-semibold text-mid">Why experts check this</p>
        <p className="text-[16px] leading-relaxed">{step.why}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-[14px] font-semibold text-mid">What they look for</p>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[15px] leading-snug">
          {step.lookFor.map((l) => (
            <li key={l} className="flex gap-2.5">
              <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-mid" />
              {l}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
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
      {titled && (
        <div className="flex flex-col gap-1 border-b border-line pb-3">
          <h3 className="font-display text-[22px] font-bold">{area.title}</h3>
          <p className="text-[15px] leading-relaxed text-muted">{area.why}</p>
        </div>
      )}
      {needsAi && !ctx.e ? <NotWritten /> : items.map((i, k) => renderItem(i, c, `${areaId}-${level}-${k}`))}
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
    <section className="flex flex-col gap-3 rounded-2xl bg-[#f3f8fa] p-5">
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
    <section className="flex flex-col gap-2.5 rounded-2xl bg-[#f3f8fa] p-5">
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
    <details className="fathom-card group flex flex-col px-5 py-4 sm:px-6">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4">
        <span className="flex flex-col">
          <span className="text-[18px] font-semibold">All the key numbers</span>
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
    <div className="flex flex-col gap-3 rounded-2xl bg-[#f3f8fa] p-5">
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

/** Official announcements and news headlines, folded away until wanted. */
function MoreInfo({ report }: { report: CompanyReport }) {
  return (
    <details id="news" className="fathom-card group flex scroll-mt-20 flex-col px-5 py-4 sm:px-6">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4">
        <span className="flex flex-col">
          <span className="text-[18px] font-semibold">News and announcements</span>
          <span className="text-[14px] text-muted">What the company told the SEC lately, and what reporters are saying.</span>
        </span>
        <span aria-hidden="true" className="text-2xl text-ocean transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="mt-5 flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h3 className="text-[16px] font-semibold">From the company <span className="font-normal text-muted">(8-K filings, last four months)</span></h3>
          {report.announcements.length === 0 ? (
            <p className="text-[16px] text-muted">None filed in the last four months.</p>
          ) : (
            <ol className="m-0 flex list-none flex-col gap-4 p-0">
              {report.announcements.map((a) => (
                <li key={a.url} className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-semibold text-mid">{formatDate(a.filingDate)}</span>
                  <span className="text-[16px] leading-snug">{a.events.join(", ")}</span>
                  <SourceLink href={a.url} label="8-K filing" />
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-[16px] font-semibold">In the news <span className="font-normal text-muted">(reporters&apos; views, via TradingView)</span></h3>
          <CompanyNews symbol={report.tradingViewSymbol} height={460} />
        </div>
      </div>
    </details>
  );
}

// ---------------------------------------------------------------- other states

function Disclaimer() {
  return (
    <p className="text-sm leading-relaxed text-muted">
      <strong className="font-semibold text-ink">For information only. Not investment advice.</strong> Fathom explains public
      information for education. It never says whether to buy, sell or hold any investment, and never gives price targets.
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
