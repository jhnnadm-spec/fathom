/** Small pieces of the company report shared by the web page and the PDF. */
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
