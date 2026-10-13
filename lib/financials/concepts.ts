/**
 * Which SEC data labels ("tags") to use for each number Fathom shows.
 *
 * Companies don't all use the same tag for the same idea, and some switch tags
 * over the years (Coca-Cola's long-term debt is one example). Each metric lists
 * the acceptable tags; the engine uses whichever has the newest data.
 *
 * Each tag also has its own plain label, because similar tags can mean slightly
 * different things (debt "due after 12 months" versus debt "including the part
 * due within 12 months"). We always say exactly what the number is.
 */
import type { PeriodKind } from "../sec/facts";

export type MetricId =
  | "revenue"
  | "grossProfit"
  | "operatingIncome"
  | "netIncome"
  | "operatingCashFlow"
  | "cash"
  | "longTermDebt";

export type MetricDefinition = {
  id: MetricId;
  kind: "duration" | "instant"; // over a period (sales) or on a date (cash)
  tags: { tag: string; label: string }[];
};

export const METRICS: Record<MetricId, MetricDefinition> = {
  revenue: {
    id: "revenue",
    kind: "duration",
    tags: [
      { tag: "RevenueFromContractWithCustomerExcludingAssessedTax", label: "revenue" },
      { tag: "Revenues", label: "revenue" },
      { tag: "RevenueFromContractWithCustomerIncludingAssessedTax", label: "revenue" },
      { tag: "SalesRevenueNet", label: "revenue" },
    ],
  },
  grossProfit: {
    id: "grossProfit",
    kind: "duration",
    tags: [{ tag: "GrossProfit", label: "gross profit" }],
  },
  operatingIncome: {
    id: "operatingIncome",
    kind: "duration",
    tags: [{ tag: "OperatingIncomeLoss", label: "operating income" }],
  },
  netIncome: {
    id: "netIncome",
    kind: "duration",
    tags: [{ tag: "NetIncomeLoss", label: "net income" }],
  },
  operatingCashFlow: {
    id: "operatingCashFlow",
    kind: "duration",
    tags: [{ tag: "NetCashProvidedByUsedInOperatingActivities", label: "cash from operations" }],
  },
  cash: {
    id: "cash",
    kind: "instant",
    tags: [{ tag: "CashAndCashEquivalentsAtCarryingValue", label: "cash and cash equivalents" }],
  },
  longTermDebt: {
    id: "longTermDebt",
    kind: "instant",
    tags: [
      { tag: "LongTermDebtNoncurrent", label: "long-term debt due after the next 12 months" },
      { tag: "LongTermDebt", label: "long-term debt, including the part due within 12 months" },
    ],
  },
};

export function periodKinds(def: MetricDefinition): PeriodKind[] {
  return def.kind === "instant" ? ["instant"] : ["annual", "quarterly"];
}
