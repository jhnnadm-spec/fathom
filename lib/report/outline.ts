/** Small pieces of the company report shared by the web page and the PDF. */
import type { CheckedClaim, SavedExplanation, TopicId } from "../explain/types";
import type { Statement } from "../financials/templates";
import type { CompanyNumbers } from "../financials/metrics";

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

/** Yearly and balance-sheet figures left out because the company doesn't report them in SEC's standard data. */
export function leftOutNames(n?: CompanyNumbers): string[] {
  return [
    ...new Set(
      (n?.omitted ?? []).filter((o) => o.period !== "quarterly" && METRIC_NAMES[o.id]).map((o) => METRIC_NAMES[o.id]),
    ),
  ];
}

// ---------------------------------------------------------------- what each level shows

/**
 * Fathom explains the whole company at every level; only the amount of detail changes.
 *   Surface: one or two very plain sentences per question.
 *   Below:   each area explained, with the main numbers.
 *   Deep:    everything Fathom has, including tables and the reports' exact words.
 * The web page and the PDF are both drawn from this outline, so they always match.
 */

export type Block =
  | "revenueChart"
  | "marginHistory"
  | "keyRatios"
  | "whatChanged"
  | "accountsSummary"
  | "accountsCheck"
  | "priceChart"
  | "marketData"
  | "originalReports"
  | "leftOut"
  // charts
  | "salesSplit" // where each $100 of sales goes
  | "billsGauge" // can it pay its bills
  | "cashVsDebt"
  | "moneyUses" // what it spent its money on
  | "marginLines"; // margins over the years

export type Item =
  | { kind: "statements"; ids: string[]; none?: string } // every one of these that exists
  | { kind: "firstOf"; ids: string[] } // only the first one that exists
  | { kind: "topic"; topic: TopicId; fallback?: TopicId[]; title?: string; max?: number; empty?: string } // AI-written points; `fallback` is used when the topic is empty
  | { kind: "block"; block: Block };

/**
 * One question on the Surface level. `area`: where Below and Deep explain it.
 * `group`: which part of Surface it sits in. `visual`: the chart shown on its tile.
 */
export type SurfaceRow = {
  label: string;
  area: string;
  group: "business" | "numbers" | "world";
  visual?: Extract<Block, "salesSplit" | "billsGauge" | "cashVsDebt" | "moneyUses"> | "salesGrowth" | "spareCash";
  wide?: boolean;
  term?: string; // glossary key for the real name of what this question measures
  items: Item[];
};

export type Area = {
  id: string;
  title: string;
  why: string; // what this area means, for someone new to finance
  below: Item[];
  deep: Item[];
};

const NOT_REPORTED = "The company doesn't report these figures in SEC's standard data, so they're left out.";

export const SURFACE: SurfaceRow[] = [
  { label: "What it does", term: "business-model", area: "business", group: "business", items: [{ kind: "topic", topic: "whatItDoes", max: 1 }] },
  { label: "How it makes money", area: "business", group: "business", items: [{ kind: "topic", topic: "howItMakesMoney", max: 2 }] },
  { label: "What makes it stand out", area: "business", group: "business", items: [{ kind: "topic", topic: "competitiveEdge", fallback: ["marketPosition"], max: 1 }] },
  { label: "Is it making money?", term: "profit-margin", area: "performance", group: "numbers", visual: "salesSplit", wide: true, items: [{ kind: "statements", ids: ["s-profit"] }] },
  { label: "Is it growing?", term: "revenue", area: "performance", group: "numbers", visual: "salesGrowth", items: [{ kind: "statements", ids: ["s-growth"] }] },
  { label: "Can it pay its bills?", term: "current-ratio", area: "health", group: "numbers", visual: "billsGauge", items: [{ kind: "statements", ids: ["s-bills"] }] },
  { label: "How much does it owe?", term: "long-term-debt", area: "health", group: "numbers", visual: "cashVsDebt", items: [{ kind: "statements", ids: ["s-debt"] }] },
  { label: "Does it bring in cash?", term: "free-cash-flow", area: "cash", group: "numbers", visual: "spareCash", items: [{ kind: "statements", ids: ["s-cash"] }] },
  { label: "What does it spend money on?", term: "capital-allocation", area: "management", group: "numbers", visual: "moneyUses", wide: true, items: [{ kind: "statements", ids: ["s-spending"] }] },
  { label: "Any warning signs in its accounts?", term: "restatement", area: "management", group: "world", items: [{ kind: "block", block: "accountsSummary" }] },
  { label: "Its industry", area: "industry", group: "world", items: [{ kind: "topic", topic: "industryTrends", fallback: ["demandDrivers"], max: 1 }] },
  { label: "A key risk it names", term: "risk-factors", area: "risks", group: "world", items: [{ kind: "topic", topic: "biggestRisks", max: 1 }] },
  { label: "What's coming up", area: "risks", group: "world", items: [{ kind: "topic", topic: "upcoming", fallback: ["outlook"], max: 1 }] },
];

export const AREAS: Area[] = [
  {
    id: "business",
    title: "The business",
    why: "What the company does, how it earns its money, and what it says helps it stand out from competitors.",
    below: [
      { kind: "topic", topic: "whatItDoes", title: "What the company does", max: 2 },
      { kind: "topic", topic: "howItMakesMoney", title: "How it makes money", max: 3 },
      { kind: "topic", topic: "competitiveEdge", title: "What the company says gives it an edge", max: 2, empty: "The report doesn't describe this clearly, so it's left out." },
      { kind: "topic", topic: "marketPosition", title: "Where it says it stands in its industry", max: 2 },
    ],
    deep: [
      { kind: "topic", topic: "whatItDoes", title: "What the company does" },
      { kind: "topic", topic: "howItMakesMoney", title: "How it makes money" },
      { kind: "topic", topic: "competitiveEdge", title: "What the company says gives it an edge", empty: "The report doesn't describe this clearly, so it's left out." },
      { kind: "topic", topic: "marketPosition", title: "Where it says it stands in its industry" },
    ],
  },
  {
    id: "performance",
    title: "Sales and profit",
    why: "Whether the company is selling more than before, and how much of what it sells it keeps as profit.",
    below: [
      { kind: "statements", ids: ["revenue-year"] },
      { kind: "block", block: "revenueChart" },
      { kind: "statements", ids: ["revenue-quarter", "net-income-year", "net-margin", "gross-margin"], none: NOT_REPORTED },
      { kind: "block", block: "salesSplit" },
    ],
    deep: [
      { kind: "statements", ids: ["revenue-year"] },
      { kind: "block", block: "revenueChart" },
      { kind: "statements", ids: ["revenue-quarter", "net-income-year", "gross-margin", "net-margin", "eps", "margin-trend"], none: NOT_REPORTED },
      { kind: "block", block: "salesSplit" },
      { kind: "block", block: "marginLines" },
      { kind: "block", block: "marginHistory" },
    ],
  },
  {
    id: "health",
    title: "Debt and financial health",
    why: "Whether the company can pay its bills, and how much it relies on borrowed money.",
    below: [
      { kind: "block", block: "cashVsDebt" },
      { kind: "block", block: "billsGauge" },
      { kind: "statements", ids: ["cash", "long-term-debt", "cash-vs-debt", "current-ratio", "negative-equity"], none: NOT_REPORTED },
    ],
    deep: [
      { kind: "block", block: "cashVsDebt" },
      { kind: "block", block: "billsGauge" },
      { kind: "statements", ids: ["cash", "long-term-debt", "cash-vs-debt", "current-ratio", "assets-vs-liabilities", "debt-to-equity", "negative-equity"], none: NOT_REPORTED },
    ],
  },
  {
    id: "cash",
    title: "Cash coming in",
    why: "Profit is an accounting figure. This is the actual cash the business brought in, and what was left after investing in itself.",
    below: [{ kind: "firstOf", ids: ["free-cash-flow", "operating-cash-flow"] }],
    deep: [{ kind: "statements", ids: ["operating-cash-flow", "free-cash-flow", "fcf-vs-profit"], none: NOT_REPORTED }],
  },
  {
    id: "management",
    title: "How it is run",
    why: "How the company's leaders use its money, how much profit they make with shareholders' money, and official warning signs about its accounts.",
    below: [
      { kind: "block", block: "moneyUses" },
      { kind: "statements", ids: ["capital-allocation"], none: NOT_REPORTED },
      { kind: "block", block: "accountsSummary" },
    ],
    deep: [
      { kind: "block", block: "moneyUses" },
      { kind: "statements", ids: ["capital-allocation", "return-on-equity"], none: NOT_REPORTED },
      { kind: "block", block: "accountsCheck" },
    ],
  },
  {
    id: "industry",
    title: "Its industry",
    why: "The bigger picture: the market the company works in and what makes customers buy, as the company describes it.",
    below: [
      { kind: "topic", topic: "industryTrends", title: "Trends in its industry", max: 2 },
      { kind: "topic", topic: "demandDrivers", title: "What drives demand", max: 2 },
    ],
    deep: [
      { kind: "topic", topic: "industryTrends", title: "Trends in its industry" },
      { kind: "topic", topic: "demandDrivers", title: "What drives demand" },
    ],
  },
  {
    id: "risks",
    title: "Risks and what's coming up",
    why: "What the company itself says could go wrong, and what it says lies ahead.",
    below: [
      { kind: "topic", topic: "biggestRisks", title: "Key risks the company highlights", max: 3 },
      { kind: "topic", topic: "newRisks", title: "New or changed risks", max: 1, empty: "The latest quarterly report doesn't describe any new or changed risks." },
      { kind: "topic", topic: "outlook", title: "What management expects", max: 2, empty: "The reports don't give a forward outlook." },
      { kind: "topic", topic: "upcoming", title: "What the company says is coming up", max: 2 },
    ],
    deep: [
      { kind: "topic", topic: "biggestRisks", title: "Key risks the company highlights" },
      { kind: "topic", topic: "newRisks", title: "New or changed risks", empty: "The latest quarterly report doesn't describe any new or changed risks." },
      { kind: "topic", topic: "outlook", title: "What management expects", empty: "The reports don't give a forward outlook." },
      { kind: "topic", topic: "upcoming", title: "What the company says is coming up" },
    ],
  },
  {
    id: "value",
    title: "Share price and value",
    why: "What the stock market says the whole company is worth today. Fathom shows this for context only; it doesn't say whether the price is right.",
    below: [{ kind: "block", block: "marketData" }],
    deep: [{ kind: "block", block: "marketData" }],
  },
  {
    id: "numbers",
    title: "All the key numbers",
    why: "The figures behind everything above, side by side, with the original reports to check them.",
    below: [],
    deep: [
      { kind: "block", block: "keyRatios" },
      { kind: "block", block: "whatChanged" },
      { kind: "block", block: "leftOut" },
      { kind: "block", block: "originalReports" },
    ],
  },
];

/** Areas that have anything to show at this level. */
export function areasFor(level: "below" | "deep"): (Area & { items: Item[] })[] {
  return AREAS.map((a) => ({ ...a, items: a[level] })).filter((a) => a.items.length > 0);
}

// ---------------------------------------------------------------- picking the content for an item


/** The AI points for a topic item (or its fallback topics), trimmed to the item's limit. */
export function claimsFor(e: SavedExplanation | undefined, item: Extract<Item, { kind: "topic" }>): CheckedClaim[] {
  if (!e) return [];
  for (const t of [item.topic, ...(item.fallback ?? [])]) {
    const list = e.topics[t] ?? [];
    if (list.length > 0) return item.max ? list.slice(0, item.max) : list;
  }
  return [];
}

/** The sentences for a statements item, in the outline's order. */
export function statementsFor(all: Statement[], item: Extract<Item, { kind: "statements" | "firstOf" }>): Statement[] {
  const found = item.ids.map((id) => all.find((s) => s.id === id)).filter(Boolean) as Statement[];
  return item.kind === "firstOf" ? found.slice(0, 1) : found;
}

// ---------------------------------------------------------------- the research path

/**
 * The seven steps an equity researcher works through, in order. Each step
 * gathers the Surface questions and the Below/Deep areas that answer it.
 */
export const STEPS: { id: string; title: string; question: string; areas: string[]; term: string; why: string; lookFor: string[]; brief: string }[] = [
  {
    id: "business",
    brief: "Every number makes more sense once you know what it sells and who pays for it.",
    lookFor: ["Who the customers are and why they buy", "Whether sales come from many sources or depend on a few", "What stops competitors taking its customers"],
    title: "The business",
    question: "What does it do, and how does it make money?",
    areas: ["business"],
    term: "business-model",
    why: "Before any number makes sense, you need to know what the company sells and who pays for it. Everything further down builds on this.",
  },
  {
    id: "performance",
    brief: "Whether it sells more each year, and how much of each sale it keeps as profit.",
    lookFor: ["Sales growing steadily, year after year", "Margins holding up or rising", "Profit growing at least as fast as sales"],
    title: "Growth and profit",
    question: "Is it selling more, and how much does it keep?",
    areas: ["performance"],
    term: "income-statement",
    why: "This is the first test of any business: is it selling more over time, and does it keep a healthy share of each sale as profit? Profit is what ultimately pays the owners.",
  },
  {
    id: "health",
    brief: "Whether it can pay its bills and how much it owes: its cushion for bad times.",
    lookFor: ["Enough short-term assets to cover bills due within a year", "Debt that is small compared with profit and cash", "Whether borrowing is growing faster than the business"],
    title: "Financial health",
    question: "Can it pay its bills and handle its debt?",
    areas: ["health"],
    term: "balance-sheet",
    why: "A profitable company can still get into trouble if it owes too much or runs short of cash. This shows how big a cushion it has for bad times.",
  },
  {
    id: "cash",
    brief: "Whether profit turns into real cash, and how much is left after investing.",
    lookFor: ["Cash from the business close to, or above, profit", "Free cash flow that stays positive after investment", "Whether investment spending is rising or falling"],
    title: "Cash",
    question: "Does the business actually bring in cash?",
    areas: ["cash"],
    term: "cash-flow-statement",
    why: "Profit follows accounting rules; cash is what actually lands in the bank. The spare cash left over (free cash flow) is what a company can use to pay its owners, cut debt or grow.",
  },
  {
    id: "management",
    brief: "How its leaders use the money: reinvesting, paying owners or buying other firms.",
    lookFor: ["Payouts funded from spare cash rather than borrowing", "How much goes back into the business versus to owners", "Changes in leaders or auditors"],
    title: "How it's run",
    question: "What do its leaders do with the money?",
    areas: ["management"],
    term: "capital-allocation",
    why: "How leaders spend the company's money shows their priorities. Buying back shares, paying dividends, investing in the business or buying other firms each mean something different for the owners.",
  },
  {
    id: "outlook",
    brief: "The industry trends and risks, in the company's own words, that could change the picture.",
    lookFor: ["Risks that are new, or specific to this company", "Industry trends that could grow or shrink demand", "What management expects for the year ahead"],
    title: "Industry and risks",
    question: "What's happening around it, and what could go wrong?",
    areas: ["industry", "risks"],
    term: "risk-factors",
    why: "Every company is shaped by its industry and faces risks. Knowing the main ones, in the company's own words, helps you see what could change the picture.",
  },
  {
    id: "value",
    brief: "How the share price compares with profit, showing how much the market already expects.",
    lookFor: ["How the P/E ratio compares with its own history and with rivals", "How much growth the price already assumes", "Whether expectations look stretched or modest"],
    title: "The share price",
    question: "What does the stock market think it's worth?",
    areas: ["value"],
    term: "valuation",
    why: "So far you've looked at the business itself. The share price is what the stock market will pay for a piece of it. Measures like market value (market capitalisation) and the P/E ratio compare that price with the company's size and profit, so you can see how much the market expects from it. Fathom never says whether the price is right.",
  },
];
