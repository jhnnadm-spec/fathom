/**
 * "How it all connects": the main ideas on a company page as a small map,
 * so a first-timer can see how sales lead to profit, profit to cash, cash to
 * what the owners get, and how the share price relates to all of it.
 * Each idea carries this company's figure where SEC data has one.
 */
import { formatDate, formatMoney, formatPercent, formatPerShare, formatShare } from "../financials/format";
import type { CompanyNumbers } from "../financials/metrics";
import { lookupTerm } from "../glossary";

export type MapGroup = "forces" | "sales" | "cash" | "balance" | "market";

export type MapNode = {
  id: string;
  label: string; // the real finance term, as shown on the box
  plain: string; // everyday words
  term: string; // the real name
  definition: string;
  why?: string;
  analyst?: string;
  reading?: string;
  caveat?: string;
  group: MapGroup;
  x: number;
  y: number;
  value?: string; // this company's figure, when there is one
  step: string; // which research step explains it
};

export type MapEdge = { from: string; to: string; label: string };

export const GROUPS: Record<MapGroup, { name: string; color: string }> = {
  forces: { name: "Key drivers from outside (dashed links)", color: "#6b7f8e" },
  sales: { name: "Sales and profit", color: "#2a78d6" },
  cash: { name: "Cash", color: "#199e70" },
  balance: { name: "What it owns and owes", color: "#6250d6" },
  market: { name: "The share price", color: "#eb6834" },
};

const LAYOUT: { id: string; label: string; plain: string; key: string; group: MapGroup; x: number; y: number; step: string }[] = [
  { id: "f-demand", label: "Consumer demand", plain: "Jobs and spending", key: "consumer-demand", group: "forces", x: 10, y: 30, step: "forces" },
  { id: "f-inflation", label: "Inflation", plain: "Prices rising", key: "inflation", group: "forces", x: 220, y: 30, step: "forces" },
  { id: "f-competition", label: "Competition", plain: "Competitors", key: "competition", group: "forces", x: 430, y: 30, step: "forces" },
  { id: "f-rates", label: "Interest rates", plain: "Interest rates", key: "interest-rates", group: "forces", x: 640, y: 30, step: "forces" },
  { id: "f-rules", label: "Regulation", plain: "Laws and taxes", key: "regulation", group: "forces", x: 850, y: 30, step: "forces" },
  { id: "f-sentiment", label: "Market sentiment", plain: "How investors feel", key: "market-sentiment", group: "forces", x: 10, y: 560, step: "forces" },
  { id: "revenue", label: "Revenue", plain: "Sales", key: "revenue", group: "sales", x: 10, y: 180, step: "performance" },
  { id: "costs", label: "Costs and expenses", plain: "Costs", key: "costs-and-expenses", group: "sales", x: 10, y: 300, step: "performance" },
  { id: "profit", label: "Net income", plain: "Profit", key: "net-income", group: "sales", x: 220, y: 180, step: "performance" },
  { id: "margin", label: "Net profit margin", plain: "Profit per $100 of sales", key: "profit-margin", group: "sales", x: 220, y: 300, step: "performance" },
  { id: "opcash", label: "Operating cash flow", plain: "Cash from the business", key: "cash-from-operations", group: "cash", x: 430, y: 180, step: "cash" },
  { id: "capex", label: "Capital expenditure", plain: "Spending on equipment", key: "capital-expenditure", group: "cash", x: 430, y: 300, step: "cash" },
  { id: "fcf", label: "Free cash flow", plain: "Spare cash", key: "free-cash-flow", group: "cash", x: 640, y: 180, step: "cash" },
  { id: "dividends", label: "Dividends", plain: "Cash paid to owners", key: "dividend", group: "cash", x: 640, y: 300, step: "management" },
  { id: "buybacks", label: "Share buybacks", plain: "Buying back shares", key: "share-buyback", group: "cash", x: 850, y: 300, step: "management" },
  { id: "cash", label: "Cash", plain: "Cash in the bank", key: "cash-and-equivalents", group: "balance", x: 10, y: 440, step: "health" },
  { id: "current", label: "Current ratio", plain: "Can it pay bills due soon", key: "current-ratio", group: "balance", x: 220, y: 440, step: "health" },
  { id: "debt", label: "Long-term debt", plain: "Borrowing", key: "long-term-debt", group: "balance", x: 430, y: 440, step: "health" },
  { id: "dte", label: "Debt-to-equity", plain: "Borrowing vs owners' money", key: "debt-to-equity", group: "balance", x: 640, y: 440, step: "health" },
  { id: "equity", label: "Shareholders' equity", plain: "Owners' share", key: "shareholders-equity", group: "balance", x: 850, y: 440, step: "health" },
  { id: "roe", label: "Return on equity", plain: "Profit on owners' money", key: "return-on-equity", group: "balance", x: 850, y: 180, step: "management" },
  { id: "eps", label: "Earnings per share", plain: "Profit per share", key: "eps", group: "market", x: 220, y: 560, step: "performance" },
  { id: "price", label: "Share price", plain: "Share price", key: "share-price", group: "market", x: 640, y: 560, step: "value" },
  { id: "pe", label: "P/E ratio", plain: "Price vs profit", key: "pe-ratio", group: "market", x: 430, y: 560, step: "value" },
  { id: "mcap", label: "Market cap", plain: "Whole company's price", key: "market-cap", group: "market", x: 850, y: 560, step: "value" },
];

export const EDGES: MapEdge[] = [
  { from: "f-demand", to: "revenue", label: "people buy more, or less" },
  { from: "f-inflation", to: "costs", label: "materials and wages cost more" },
  { from: "f-inflation", to: "revenue", label: "it may raise its own prices" },
  { from: "f-competition", to: "revenue", label: "customers can switch" },
  { from: "f-competition", to: "margin", label: "pressure to cut prices" },
  { from: "f-rates", to: "debt", label: "borrowing costs more" },
  { from: "f-rates", to: "costs", label: "more interest to pay" },
  { from: "f-rules", to: "costs", label: "taxes, tariffs and compliance" },
  { from: "f-sentiment", to: "price", label: "more buyers or sellers" },
  { from: "f-sentiment", to: "pe", label: "how much people will pay for profit" },
  { from: "revenue", to: "profit", label: "what's left after all costs" },
  { from: "costs", to: "profit", label: "costs are taken away" },
  { from: "revenue", to: "margin", label: "profit is compared with sales" },
  { from: "profit", to: "margin", label: "profit ÷ sales" },
  { from: "profit", to: "opcash", label: "profit isn't the same as cash" },
  { from: "opcash", to: "fcf", label: "cash in…" },
  { from: "capex", to: "fcf", label: "…minus equipment spending" },
  { from: "fcf", to: "dividends", label: "can be paid out" },
  { from: "fcf", to: "buybacks", label: "can buy back shares" },
  { from: "cash", to: "current", label: "helps pay bills due soon" },
  { from: "cash", to: "debt", label: "compared with borrowing" },
  { from: "debt", to: "dte", label: "borrowing ÷ owners' share" },
  { from: "equity", to: "dte", label: "" },
  { from: "buybacks", to: "equity", label: "buybacks shrink it" },
  { from: "profit", to: "roe", label: "profit ÷ owners' share" },
  { from: "equity", to: "roe", label: "" },
  { from: "profit", to: "eps", label: "profit ÷ number of shares" },
  { from: "eps", to: "pe", label: "share price ÷ profit per share" },
  { from: "price", to: "pe", label: "" },
  { from: "price", to: "mcap", label: "price × number of shares" },
];

/** The map for one company, with its own figures from SEC data. */
export function conceptMap(n?: CompanyNumbers, readings: Record<string, string | undefined> = {}): MapNode[] {
  const year = (end?: string) => (end ? ` (year ended ${formatDate(end)})` : "");
  const on = (end?: string) => (end ? ` (on ${formatDate(end)})` : "");
  const a = n?.annual;
  const b = n?.balance;
  const r = n?.ratios;
  const costs = a?.revenue && a.netIncome && n?.margins.net !== undefined ? a.revenue.latest.value - a.netIncome.latest.value : undefined;
  const values: Record<string, string | undefined> = {
    revenue: a?.revenue && `${formatMoney(a.revenue.latest.value)}${a.revenue.change !== undefined ? `, ${a.revenue.change >= 0 ? "up" : "down"} ${formatPercent(a.revenue.change)}` : ""}${year(a.revenue.latest.end)}`,
    costs: costs !== undefined && costs > 0 ? `About ${formatMoney(costs)} in all, including tax${year(a?.revenue?.latest.end)}` : undefined,
    profit: a?.netIncome && `${formatMoney(a.netIncome.latest.value)}${year(a.netIncome.latest.end)}`,
    margin: n?.margins.net !== undefined ? `$${Math.round(n.margins.net * 100)} of every $100 (${formatShare(n.margins.net)})${year(n.margins.periodEnd)}` : undefined,
    opcash: a?.operatingCashFlow && `${formatMoney(a.operatingCashFlow.latest.value)}${year(a.operatingCashFlow.latest.end)}`,
    capex: a?.capex && `${formatMoney(a.capex.latest.value)}${year(a.capex.latest.end)}`,
    fcf: r?.freeCashFlow && `${formatMoney(r.freeCashFlow.value)}${year(r.freeCashFlow.end)}`,
    dividends: a?.dividends && `${formatMoney(a.dividends.latest.value)}${year(a.dividends.latest.end)}`,
    buybacks: a?.buybacks && `${formatMoney(a.buybacks.latest.value)}${year(a.buybacks.latest.end)}`,
    cash: b?.cash && `${formatMoney(b.cash.latest.value)}${on(b.cash.latest.end)}`,
    current: r?.currentRatio && `$${r.currentRatio.value.toFixed(2)} for every $1 due within a year${on(r.currentRatio.end)}`,
    debt: b?.longTermDebt && `${formatMoney(b.longTermDebt.latest.value)} of long-term debt${on(b.longTermDebt.latest.end)}`,
    dte: r?.debtToEquity && `$${r.debtToEquity.value.toFixed(2)} borrowed for every $1 of owners' money${on(r.debtToEquity.end)}`,
    equity: b?.equity && `${formatMoney(b.equity.latest.value)}${on(b.equity.latest.end)}`,
    roe: r?.returnOnEquity && `${formatShare(r.returnOnEquity.value)}${year(r.returnOnEquity.end)}`,
    eps: a?.eps && `${formatPerShare(a.eps.latest.value)} per share${year(a.eps.latest.end)}`,
    price: "Changes every trading day: see the live chart in step 7",
    pe: "See the live figure in step 7",
    mcap: "See the live figure in step 7",
    "f-demand": readings.demand,
    "f-inflation": readings.inflation,
    "f-competition": readings.competition ?? "What the company says about its competitors is in \"Key drivers\"",
    "f-rates": readings.rates,
    "f-rules": readings.rules ?? "What the company says about laws and taxes is in \"Key drivers\"",
    "f-sentiment": readings.sentiment,
  };
  return LAYOUT.map((l) => {
    const g = lookupTerm(l.key);
    return {
      id: l.id,
      label: l.label,
      plain: l.plain,
      term: g?.short ?? l.key,
      definition: g?.definition ?? "",
      why: g?.why,
      analyst: g?.analyst,
      reading: g?.reading,
      caveat: g?.caveat,
      group: l.group,
      x: l.x,
      y: l.y,
      value: values[l.id],
      step: l.step,
    };
  });
}
