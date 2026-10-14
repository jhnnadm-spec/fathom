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

export type MetricId =
  | "revenue"
  | "grossProfit"
  | "operatingIncome"
  | "netIncome"
  | "eps"
  | "operatingCashFlow"
  | "capex"
  | "dividends"
  | "buybacks"
  | "acquisitions"
  | "cash"
  | "longTermDebt"
  | "equity"
  | "assets"
  | "liabilities"
  | "currentAssets"
  | "currentLiabilities";

export type MetricDefinition = {
  id: MetricId;
  kind: "duration" | "instant"; // over a period (sales) or on a date (cash)
  unit?: string; // SEC unit, "USD" unless stated
  quarterly?: boolean; // also compare quarters (duration metrics only)
  tags: { tag: string; label: string }[];
};

const usd = (tag: string, label: string) => ({ tag, label });

export const METRICS: Record<MetricId, MetricDefinition> = {
  // ---- Income statement
  revenue: {
    id: "revenue",
    kind: "duration",
    quarterly: true,
    tags: [
      usd("RevenueFromContractWithCustomerExcludingAssessedTax", "revenue"),
      usd("Revenues", "revenue"),
      usd("RevenueFromContractWithCustomerIncludingAssessedTax", "revenue"),
      usd("SalesRevenueNet", "revenue"),
      usd("RevenuesNetOfInterestExpense", "revenue, after the interest it pays"), // banks and lenders
    ],
  },
  grossProfit: { id: "grossProfit", kind: "duration", tags: [usd("GrossProfit", "gross profit")] },
  operatingIncome: { id: "operatingIncome", kind: "duration", tags: [usd("OperatingIncomeLoss", "operating income")] },
  netIncome: { id: "netIncome", kind: "duration", quarterly: true, tags: [
      usd("NetIncomeLoss", "net income"),
      usd("ProfitLoss", "net income, including the part owned by minority partners"),
      usd("NetIncomeLossAvailableToCommonStockholdersBasic", "net income for ordinary shareholders"),
    ] },
  eps: {
    id: "eps",
    kind: "duration",
    unit: "USD/shares",
    tags: [
      usd("EarningsPerShareDiluted", "diluted earnings per share"),
      usd("EarningsPerShareBasic", "basic earnings per share"),
    ],
  },

  // ---- Cash flow statement
  operatingCashFlow: {
    id: "operatingCashFlow",
    kind: "duration",
    tags: [
      usd("NetCashProvidedByUsedInOperatingActivities", "cash from operations"),
      usd("NetCashProvidedByUsedInOperatingActivitiesContinuingOperations", "cash from continuing operations"),
    ],
  },
  capex: {
    id: "capex",
    kind: "duration",
    tags: [
      usd("PaymentsToAcquirePropertyPlantAndEquipment", "spending on buildings and equipment"),
      usd("PaymentsToAcquireProductiveAssets", "spending on buildings, equipment and other long-term assets"),
    ],
  },
  dividends: {
    id: "dividends",
    kind: "duration",
    tags: [
      usd("PaymentsOfDividends", "dividends paid"),
      usd("PaymentsOfDividendsCommonStock", "dividends paid"),
      usd("PaymentsOfOrdinaryDividends", "dividends paid"),
    ],
  },
  buybacks: {
    id: "buybacks",
    kind: "duration",
    tags: [usd("PaymentsForRepurchaseOfCommonStock", "share buybacks"), usd("PaymentsForRepurchaseOfEquity", "share buybacks")],
  },
  acquisitions: {
    id: "acquisitions",
    kind: "duration",
    tags: [usd("PaymentsToAcquireBusinessesNetOfCashAcquired", "buying other businesses")],
  },

  // ---- Balance sheet
  cash: { id: "cash", kind: "instant", tags: [
      usd("CashAndCashEquivalentsAtCarryingValue", "cash and cash equivalents"),
      usd("CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents", "cash, including cash set aside for specific uses"),
      usd("Cash", "cash"),
    ] },
  longTermDebt: {
    id: "longTermDebt",
    kind: "instant",
    tags: [
      usd("LongTermDebtNoncurrent", "long-term debt due after the next 12 months"),
      usd("LongTermDebt", "long-term debt, including the part due within 12 months"),
      usd("LongTermDebtAndCapitalLeaseObligations", "long-term debt and lease obligations due after the next 12 months"),
      usd("LongTermDebtAndCapitalLeaseObligationsIncludingCurrentMaturities", "long-term debt and lease obligations, including the part due within 12 months"),
      usd("LongTermNotesPayable", "long-term notes owed"),
    ],
  },
  equity: {
    id: "equity",
    kind: "instant",
    tags: [
      usd("StockholdersEquity", "shareholders' equity"),
      usd("StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest", "total equity"),
    ],
  },
  assets: { id: "assets", kind: "instant", tags: [usd("Assets", "total assets")] },
  liabilities: { id: "liabilities", kind: "instant", tags: [usd("Liabilities", "total liabilities")] },
  currentAssets: { id: "currentAssets", kind: "instant", tags: [usd("AssetsCurrent", "current assets")] },
  currentLiabilities: { id: "currentLiabilities", kind: "instant", tags: [usd("LiabilitiesCurrent", "current liabilities")] },
};
