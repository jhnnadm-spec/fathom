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
  | "leftOut";

export type Item =
  | { kind: "statements"; ids: string[]; none?: string } // every one of these that exists
  | { kind: "firstOf"; ids: string[] } // only the first one that exists
  | { kind: "topic"; topic: TopicId; fallback?: TopicId[]; title?: string; max?: number; empty?: string } // AI-written points; `fallback` is used when the topic is empty
  | { kind: "block"; block: Block };

export type SurfaceRow = { label: string; items: Item[] };

export type Area = {
  id: string;
  title: string;
  why: string; // what this area means, for someone new to finance
  below: Item[];
  deep: Item[];
};

const NOT_REPORTED = "The company doesn't report these figures in SEC's standard data, so they're left out.";

export const SURFACE: SurfaceRow[] = [
  { label: "What it does", items: [{ kind: "topic", topic: "whatItDoes", max: 1 }] },
  { label: "How it makes money", items: [{ kind: "topic", topic: "howItMakesMoney", max: 2 }] },
  { label: "What makes it stand out", items: [{ kind: "topic", topic: "competitiveEdge", fallback: ["marketPosition"], max: 1 }] },
  { label: "Is it growing?", items: [{ kind: "statements", ids: ["s-growth"] }] },
  { label: "Is it making money?", items: [{ kind: "statements", ids: ["s-profit"] }] },
  { label: "Can it pay its bills?", items: [{ kind: "statements", ids: ["s-bills"] }] },
  { label: "How much does it owe?", items: [{ kind: "statements", ids: ["s-debt"] }] },
  { label: "Does it bring in cash?", items: [{ kind: "statements", ids: ["s-cash"] }] },
  { label: "What does it spend money on?", items: [{ kind: "statements", ids: ["s-spending"] }] },
  { label: "Any warning signs in its accounts?", items: [{ kind: "block", block: "accountsSummary" }] },
  { label: "Its industry", items: [{ kind: "topic", topic: "industryTrends", fallback: ["demandDrivers"], max: 1 }] },
  { label: "A key risk it names", items: [{ kind: "topic", topic: "biggestRisks", max: 1 }] },
  { label: "What's coming up", items: [{ kind: "topic", topic: "upcoming", fallback: ["outlook"], max: 1 }] },
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
    ],
    deep: [
      { kind: "statements", ids: ["revenue-year"] },
      { kind: "block", block: "revenueChart" },
      { kind: "statements", ids: ["revenue-quarter", "net-income-year", "gross-margin", "net-margin", "eps", "margin-trend"], none: NOT_REPORTED },
      { kind: "block", block: "marginHistory" },
    ],
  },
  {
    id: "health",
    title: "Debt and financial health",
    why: "Whether the company can pay its bills, and how much it relies on borrowed money.",
    below: [{ kind: "statements", ids: ["cash", "long-term-debt", "cash-vs-debt", "current-ratio", "negative-equity"], none: NOT_REPORTED }],
    deep: [
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
      { kind: "statements", ids: ["capital-allocation"], none: NOT_REPORTED },
      { kind: "block", block: "accountsSummary" },
    ],
    deep: [
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
