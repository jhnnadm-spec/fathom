/**
 * The Fundamental lens: the company's own numbers, from its SEC filings, each
 * with what it means in everyday words.
 *
 * Every figure is worked out in code from reported numbers (lib/financials),
 * keeps its period and source, and is only combined with figures that cover
 * exactly the same period or date. Ratios that need a share price (P/E,
 * EV/EBITDA) are listed but not calculated: Fathom shows the price from
 * TradingView for display only and doesn't use it in its own sums.
 */
import { formatDate, formatMoney, formatPercent, formatPerShare } from "../financials/format";
import type { Comparison, CompanyNumbers, Figure as NumberFigure, Ratio } from "../financials/metrics";
import type { MetricId } from "../financials/concepts";
import { getCompanyReport, type CompanyReport } from "../report/company";
import { SECTORS, sectorOf } from "../sectors";
import type { Figure, Lens, LensResult, Period, SourceRef, Unit } from "./types";

export type FundamentalMetricId =
  | "revenue"
  | "revenueGrowth"
  | "grossMargin"
  | "operatingMargin"
  | "netMargin"
  | "ebitda"
  | "operatingCashFlow"
  | "freeCashFlow"
  | "netDebt"
  | "debtToEquity"
  | "currentRatio"
  | "returnOnEquity"
  | "eps"
  | "peRatio"
  | "evToEbitda";

export type FundamentalGroupId = "size" | "profitability" | "cash" | "safety" | "returns" | "valuation";

export type MetricRow = {
  id: FundamentalMetricId;
  group: FundamentalGroupId;
  name: string; // the real finance term
  plain: string; // the same idea in everyday words
  term: string; // glossary key, for the pop-up explanation
  meaning: string; // one sentence: what it is, with any jargon explained in the same sentence
  formula: string; // how Fathom works it out, in words
  figure: Figure;
  reading?: string; // what this company's figure says, in plain words
};

export type FundamentalData = { rows: MetricRow[] };

export const FUNDAMENTAL_GROUPS: { id: FundamentalGroupId; title: string; plain: string }[] = [
  { id: "size", title: "Size and growth", plain: "How big the business is, and how fast its sales are growing" },
  { id: "profitability", title: "Profitability", plain: "How much of each sale it keeps" },
  { id: "cash", title: "Cash flow", plain: "How much real cash the business brings in" },
  { id: "safety", title: "Debt and safety", plain: "What it owes, and whether it can pay its bills" },
  { id: "returns", title: "Returns", plain: "What it earns on the owners' money" },
  { id: "valuation", title: "Valuation", plain: "What the stock market pays for it" },
];

type Def = Omit<MetricRow, "figure" | "reading">;

export const FUNDAMENTAL_METRICS: Record<FundamentalMetricId, Def> = {
  revenue: {
    id: "revenue",
    group: "size",
    name: "Revenue",
    plain: "Sales",
    term: "revenue",
    meaning: "Revenue is all the money a company takes in from what it sells, before any costs are paid.",
    formula: "Total sales for the financial year, as reported.",
  },
  revenueGrowth: {
    id: "revenueGrowth",
    group: "size",
    name: "Revenue growth",
    plain: "How fast sales grew",
    term: "revenue-growth",
    meaning: "Revenue growth is how much sales rose or fell compared with the year before, as a percentage.",
    formula: "(This year's sales − last year's sales) ÷ last year's sales.",
  },
  grossMargin: {
    id: "grossMargin",
    group: "profitability",
    name: "Gross margin",
    plain: "Left after the cost of what it sold",
    term: "gross-margin",
    meaning: "Gross margin is the share of each sale left after paying the direct cost of making or buying what was sold.",
    formula: "Gross profit ÷ sales, for the same year.",
  },
  operatingMargin: {
    id: "operatingMargin",
    group: "profitability",
    name: "Operating margin",
    plain: "Left after running the business",
    term: "operating-margin",
    meaning: "Operating margin is the share of each sale left after also paying to run the business (staff, offices, marketing), before interest and tax.",
    formula: "Operating income ÷ sales, for the same year.",
  },
  netMargin: {
    id: "netMargin",
    group: "profitability",
    name: "Net profit margin",
    plain: "Kept as profit",
    term: "profit-margin",
    meaning: "Net profit margin is the share of each sale left as profit after every cost, including interest and tax.",
    formula: "Net income ÷ sales, for the same year.",
  },
  ebitda: {
    id: "ebitda",
    group: "profitability",
    name: "EBITDA",
    plain: "Earnings of the main business",
    term: "ebitda",
    meaning:
      "EBITDA (earnings before interest, tax, depreciation and amortisation) is what the main business earned before interest, tax and the yearly wear-and-tear charge on its equipment.",
    formula: "Operating income + depreciation and amortisation, for the same year.",
  },
  operatingCashFlow: {
    id: "operatingCashFlow",
    group: "cash",
    name: "Operating cash flow",
    plain: "Cash the business brought in",
    term: "cash-from-operations",
    meaning: "Operating cash flow is the cash the day-to-day business actually brought in during the year, which can differ from profit.",
    formula: "Net cash from operating activities, as reported.",
  },
  freeCashFlow: {
    id: "freeCashFlow",
    group: "cash",
    name: "Free cash flow",
    plain: "Spare cash",
    term: "free-cash-flow",
    meaning: "Free cash flow is the cash left after paying for new buildings and equipment (capital expenditure): money it could use for owners, debt or growth.",
    formula: "Operating cash flow − capital expenditure, for the same year.",
  },
  netDebt: {
    id: "netDebt",
    group: "safety",
    name: "Net debt",
    plain: "Borrowing minus cash",
    term: "net-debt",
    meaning: "Net debt is long-term borrowing minus the cash the company holds; a negative figure means it holds more cash than it owes long-term.",
    formula: "Long-term debt − cash and cash equivalents, on the same date.",
  },
  debtToEquity: {
    id: "debtToEquity",
    group: "safety",
    name: "Debt-to-equity ratio",
    plain: "Borrowing compared with owners' money",
    term: "debt-to-equity",
    meaning: "The debt-to-equity ratio compares long-term borrowing with the owners' money in the business (shareholders' equity): 1.0 means $1 borrowed for every $1 of owners' money.",
    formula: "Long-term debt ÷ shareholders' equity, on the same date.",
  },
  currentRatio: {
    id: "currentRatio",
    group: "safety",
    name: "Current ratio",
    plain: "Can it pay bills due soon",
    term: "current-ratio",
    meaning: "The current ratio compares what the company expects to turn into cash within a year with the bills it must pay within a year; above 1 means more is coming in than is due.",
    formula: "Current assets ÷ current liabilities, on the same date.",
  },
  returnOnEquity: {
    id: "returnOnEquity",
    group: "returns",
    name: "Return on equity (ROE)",
    plain: "Profit on the owners' money",
    term: "return-on-equity",
    meaning: "Return on equity (ROE) is the year's profit compared with the owners' money in the business (shareholders' equity).",
    formula: "Net income ÷ average shareholders' equity at the start and end of the year.",
  },
  eps: {
    id: "eps",
    group: "returns",
    name: "Earnings per share (EPS)",
    plain: "Profit for each share",
    term: "eps",
    meaning: "Earnings per share (EPS) is the year's profit divided by the number of shares, counting shares that could be created from options and similar rights (diluted).",
    formula: "Diluted earnings per share, as reported.",
  },
  peRatio: {
    id: "peRatio",
    group: "valuation",
    name: "P/E ratio",
    plain: "Price compared with profit",
    term: "pe-ratio",
    meaning: "The P/E (price-to-earnings) ratio is the share price divided by earnings per share: how many dollars investors pay for each dollar of yearly profit.",
    formula: "Share price ÷ earnings per share.",
  },
  evToEbitda: {
    id: "evToEbitda",
    group: "valuation",
    name: "EV/EBITDA",
    plain: "Whole-company price compared with earnings",
    term: "ev-to-ebitda",
    meaning: "EV/EBITDA compares the value of the whole company, including its debt minus its cash (enterprise value), with its EBITDA.",
    formula: "(Market value + debt − cash) ÷ EBITDA.",
  },
};

const ORDER = Object.keys(FUNDAMENTAL_METRICS) as FundamentalMetricId[];

const NEEDS_PRICE =
  "Needs a share price. Fathom shows the live price from TradingView for display only and doesn't use it in its own calculations, so this isn't worked out here.";

// ---------------------------------------------------------------- building figures

const src = (f: NumberFigure): SourceRef => ({ name: f.source.label, url: f.source.url, date: f.source.filed });
const uniq = (s: SourceRef[]) => s.filter((x, i) => s.findIndex((y) => y.url === x.url) === i);
const yearOf = (f: NumberFigure): Period => ({ kind: "year", start: f.start, end: f.end });
const dateOf = (f: NumberFigure): Period => ({ kind: "date", end: f.end });

function reported(value: number, unit: Unit, period: Period, figures: NumberFigure[]): Figure {
  return { status: "reported", value, unit, currency: "USD", period, sources: uniq(figures.map(src)) };
}

function missingReason(n: CompanyNumbers, ids: MetricId[]): Figure {
  const stale = n.omitted.some((o) => ids.includes(o.id) && o.reason === "stale" && o.period !== "quarterly");
  const missing = n.omitted.some((o) => ids.includes(o.id) && o.reason === "not-reported" && o.period !== "quarterly");
  if (stale) return { status: "not-reported", reason: "Not in its latest reports: the last figure it filed is more than a year old." };
  if (missing) return { status: "not-reported", reason: "Not reported in its SEC filings." };
  return { status: "not-comparable", reason: "The figures needed don't cover exactly the same period, so Fathom doesn't combine them." };
}

const samePeriod = (a?: NumberFigure, b?: NumberFigure) => Boolean(a && b && a.start === b.start && a.end === b.end);

function margin(n: CompanyNumbers, part: Comparison | undefined, value: number | undefined, id: MetricId): Figure {
  const rev = n.annual.revenue?.latest;
  if (value === undefined || !rev || !part) return missingReason(n, ["revenue", id]);
  return reported(value, "percent", yearOf(rev), [rev, part.latest]);
}

function ratioFigure(r: Ratio | undefined, unit: Unit, period: "year" | "date"): Figure | undefined {
  if (!r) return undefined;
  const f = r.figures[0];
  return reported(r.value, unit, period === "year" ? yearOf(f) : { kind: "date", end: r.end }, r.figures);
}

/** Every fundamental figure for one company, from its computed SEC numbers. */
export function fundamentalFigures(n: CompanyNumbers): Record<FundamentalMetricId, Figure> {
  const a = n.annual;
  const b = n.balance;
  const r = n.ratios;
  const negEquity: Figure | undefined = n.negativeEquity
    ? { status: "not-comparable", reason: "Owners' money in the business (shareholders' equity) is below zero, so this ratio can't be read sensibly." }
    : undefined;

  const growth: Figure =
    a.revenue?.change !== undefined && a.revenue.previous
      ? reported(a.revenue.change, "percent", yearOf(a.revenue.latest), [a.revenue.latest, a.revenue.previous])
      : a.revenue
        ? { status: "not-reported", reason: "There's no comparable figure for the year before." }
        : missingReason(n, ["revenue"]);

  const op = a.operatingIncome?.latest;
  const dep = a.depreciation?.latest;
  const ebitda: Figure =
    op && dep && samePeriod(op, dep) ? reported(op.value + dep.value, "currency", yearOf(op), [op, dep]) : missingReason(n, ["operatingIncome", "depreciation"]);

  const debt = b.longTermDebt?.latest;
  const cash = b.cash?.latest;
  const netDebt: Figure = debt && cash && debt.end === cash.end ? reported(debt.value - cash.value, "currency", dateOf(debt), [debt, cash]) : missingReason(n, ["longTermDebt", "cash"]);

  return {
    revenue: a.revenue ? reported(a.revenue.latest.value, "currency", yearOf(a.revenue.latest), [a.revenue.latest]) : missingReason(n, ["revenue"]),
    revenueGrowth: growth,
    grossMargin: margin(n, a.grossProfit, n.margins.gross, "grossProfit"),
    operatingMargin: margin(n, a.operatingIncome, n.margins.operating, "operatingIncome"),
    netMargin: margin(n, a.netIncome, n.margins.net, "netIncome"),
    ebitda,
    operatingCashFlow: a.operatingCashFlow
      ? reported(a.operatingCashFlow.latest.value, "currency", yearOf(a.operatingCashFlow.latest), [a.operatingCashFlow.latest])
      : missingReason(n, ["operatingCashFlow"]),
    freeCashFlow: ratioFigure(r.freeCashFlow, "currency", "year") ?? missingReason(n, ["operatingCashFlow", "capex"]),
    netDebt,
    debtToEquity: ratioFigure(r.debtToEquity, "ratio", "date") ?? negEquity ?? missingReason(n, ["longTermDebt", "equity"]),
    currentRatio: ratioFigure(r.currentRatio, "ratio", "date") ?? missingReason(n, ["currentAssets", "currentLiabilities"]),
    returnOnEquity: ratioFigure(r.returnOnEquity, "percent", "year") ?? negEquity ?? missingReason(n, ["netIncome", "equity"]),
    eps: a.eps ? reported(a.eps.latest.value, "per-share", yearOf(a.eps.latest), [a.eps.latest]) : missingReason(n, ["eps"]),
    peRatio: { status: "needs-price", reason: NEEDS_PRICE },
    evToEbitda: { status: "needs-price", reason: NEEDS_PRICE },
  };
}

// ---------------------------------------------------------------- plain-English readings

const per100 = (f: number) => `$${Math.round(Math.abs(f) * 100)}`;

/** One sentence on what this company's figure says. Built from the number only, never from the AI. */
export function readingFor(id: FundamentalMetricId, f: Figure, company: string): string | undefined {
  if (f.status !== "reported") return undefined;
  const v = f.value;
  const year = f.period.kind === "year" ? `in the year to ${formatDate(f.period.end)}` : `on ${formatDate(f.period.end)}`;
  switch (id) {
    case "revenue":
      return `${company} sold ${formatMoney(v)} of goods and services ${year}.`;
    case "revenueGrowth":
      return Math.abs(v) < 0.001 ? `Sales were about the same as the year before.` : `Sales were ${v > 0 ? "up" : "down"} ${formatPercent(v)} on the year before.`;
    case "grossMargin":
      return `After paying the direct cost of what it sold, it kept about ${per100(v)} of every $100 of sales.`;
    case "operatingMargin":
      return v >= 0
        ? `After also paying to run the business, about ${per100(v)} of every $100 of sales was left.`
        : `After paying to run the business, it lost about ${per100(v)} for every $100 of sales.`;
    case "netMargin":
      return v >= 0
        ? `After every cost, including interest and tax, about ${per100(v)} of every $100 of sales was left as profit.`
        : `After every cost, it lost about ${per100(v)} for every $100 of sales.`;
    case "ebitda":
      return `The main business earned ${formatMoney(v)} before interest, tax and wear-and-tear charges, ${year}.`;
    case "operatingCashFlow":
      return v >= 0 ? `Its day-to-day business brought in ${formatMoney(v)} of cash.` : `Its day-to-day business used ${formatMoney(Math.abs(v))} more cash than it brought in.`;
    case "freeCashFlow":
      return v >= 0
        ? `After paying for buildings and equipment, ${formatMoney(v)} of cash was left over.`
        : `It spent ${formatMoney(Math.abs(v))} more on its business and equipment than the business brought in.`;
    case "netDebt":
      return v >= 0
        ? `Its long-term borrowing was ${formatMoney(v)} more than the cash it held ${year}.`
        : `It held ${formatMoney(Math.abs(v))} more cash than its long-term borrowing ${year} (net cash).`;
    case "debtToEquity":
      return `It had borrowed about $${v.toFixed(2)} long-term for every $1 of owners' money in the business.`;
    case "currentRatio":
      return `For every $1 of bills due within a year, it had about $${v.toFixed(2)} it expects to turn into cash in that time.`;
    case "returnOnEquity":
      return v >= 0
        ? `It made about ${per100(v)} of profit for every $100 of owners' money in the business.`
        : `It lost about ${per100(v)} for every $100 of owners' money in the business.`;
    case "eps":
      return `Profit worked out to ${formatPerShare(v)} for each share.`;
    default:
      return undefined;
  }
}

/** A short plain-English summary, from the figures only. */
export function fundamentalSummary(rows: MetricRow[], company: string): string[] {
  const get = (id: FundamentalMetricId) => {
    const f = rows.find((r) => r.id === id)?.figure;
    return f?.status === "reported" ? f : undefined;
  };
  const out: string[] = [];
  const rev = get("revenue");
  const growth = get("revenueGrowth");
  if (rev && rev.period.kind === "year") {
    out.push(
      `In the year to ${formatDate(rev.period.end)}, ${company} sold ${formatMoney(rev.value)} of goods and services${
        growth ? `, ${growth.value >= 0 ? "up" : "down"} ${formatPercent(growth.value)} on the year before` : ""
      }.`,
    );
  }
  const net = get("netMargin");
  if (net) out.push(net.value >= 0 ? `It kept about ${per100(net.value)} of every $100 of sales as profit.` : `It made a loss of about ${per100(net.value)} for every $100 of sales.`);
  const fcf = get("freeCashFlow");
  const ocf = get("operatingCashFlow");
  if (ocf && fcf) {
    out.push(
      fcf.value >= 0
        ? `Its business brought in ${formatMoney(ocf.value)} of cash, leaving ${formatMoney(fcf.value)} after paying for buildings and equipment.`
        : `Its business brought in ${formatMoney(ocf.value)} of cash, but it spent ${formatMoney(Math.abs(fcf.value))} more than that on buildings and equipment.`,
    );
  }
  const nd = get("netDebt");
  const de = get("debtToEquity");
  if (nd) {
    out.push(
      nd.value >= 0
        ? `It owed ${formatMoney(nd.value)} more in long-term debt than it held in cash${de ? `, about $${de.value.toFixed(2)} borrowed for every $1 of owners' money` : ""}.`
        : `It held more cash than its long-term debt (net cash of ${formatMoney(Math.abs(nd.value))}).`,
    );
  }
  return out;
}

// ---------------------------------------------------------------- the lens

/** "Coca Cola Co" → "Coca Cola", for use inside sentences. */
export function shortCompany(name: string): string {
  return name.replace(/,?\s+(Inc\.?|Corp(oration)?\.?|Co\.?|Company|Ltd\.?|plc|Holdings?|Group)$/i, "").replace(/^The\s+/i, "");
}

/** The Fundamental lens for one company's report. Returns null when Fathom can't explain it. */
export function fundamentalFromReport(report: CompanyReport): LensResult<FundamentalData> | null {
  const n = report.numbers;
  if (!report.support.supported || !n) return null;
  const company = shortCompany(report.company.name);
  const figures = fundamentalFigures(n);
  const rows: MetricRow[] = ORDER.map((id) => ({ ...FUNDAMENTAL_METRICS[id], figure: figures[id], reading: readingFor(id, figures[id], company) }));
  const sources = uniq(rows.flatMap((r) => (r.figure.status === "reported" ? r.figure.sources : [])));
  const sector = sectorOf(report.company.sic);
  return {
    lens: "fundamental",
    ticker: report.company.ticker,
    market: "US",
    meta: {
      company,
      ticker: report.company.ticker,
      currency: "USD",
      accountingStandard: "US GAAP",
      fiscalYearEnd: report.company.fiscalYearEnd,
      sector: sector ? SECTORS[sector].name : undefined,
      industry: report.company.industry || undefined,
    },
    data: { rows },
    sources,
    updatedAt: report.generatedAt,
    summary: fundamentalSummary(rows, company),
  };
}

export const fundamentalLens: Lens<FundamentalData> = {
  id: "fundamental",
  async run(ticker) {
    const report = await getCompanyReport(ticker.toUpperCase());
    return report ? fundamentalFromReport(report) : null;
  },
};
