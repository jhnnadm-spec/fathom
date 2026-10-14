/**
 * "How it all connects": the main ideas on a company page as a small map,
 * so a first-timer can see how sales lead to profit, profit to cash, cash to
 * what the owners get, and how the share price relates to all of it.
 * Each idea carries this company's figure where SEC data has one.
 */
import { formatDate, formatMoney, formatPercent, formatPerShare, formatShare } from "../financials/format";
import type { CompanyNumbers } from "../financials/metrics";
import { lookupTerm } from "../glossary";

export type MapGroup = "sales" | "cash" | "balance" | "market";

export type MapNode = {
  id: string;
  plain: string; // everyday words
  term: string; // the real name
  definition: string;
  why?: string;
  group: MapGroup;
  x: number;
  y: number;
  value?: string; // this company's figure, when there is one
  step: string; // which research step explains it
};

export type MapEdge = { from: string; to: string; label: string };

export const GROUPS: Record<MapGroup, { name: string; color: string }> = {
  sales: { name: "Sales and profit", color: "#2a78d6" },
  cash: { name: "Cash", color: "#199e70" },
  balance: { name: "What it owns and owes", color: "#6250d6" },
  market: { name: "The share price", color: "#eb6834" },
};

const LAYOUT: { id: string; plain: string; key: string; group: MapGroup; x: number; y: number; step: string }[] = [
  { id: "revenue", plain: "Sales", key: "revenue", group: "sales", x: 10, y: 60, step: "performance" },
  { id: "costs", plain: "Costs", key: "costs-and-expenses", group: "sales", x: 10, y: 180, step: "performance" },
  { id: "profit", plain: "Profit", key: "net-income", group: "sales", x: 220, y: 60, step: "performance" },
  { id: "margin", plain: "Profit per $100 of sales", key: "profit-margin", group: "sales", x: 220, y: 180, step: "performance" },
  { id: "opcash", plain: "Cash from the business", key: "cash-from-operations", group: "cash", x: 430, y: 60, step: "cash" },
  { id: "capex", plain: "Spending on equipment", key: "capital-expenditure", group: "cash", x: 430, y: 180, step: "cash" },
  { id: "fcf", plain: "Spare cash", key: "free-cash-flow", group: "cash", x: 640, y: 60, step: "cash" },
  { id: "dividends", plain: "Cash paid to owners", key: "dividend", group: "cash", x: 640, y: 180, step: "management" },
  { id: "buybacks", plain: "Buying back shares", key: "share-buyback", group: "cash", x: 850, y: 180, step: "management" },
  { id: "cash", plain: "Cash in the bank", key: "cash-and-equivalents", group: "balance", x: 10, y: 320, step: "health" },
  { id: "current", plain: "Can it pay bills due soon", key: "current-ratio", group: "balance", x: 220, y: 320, step: "health" },
  { id: "debt", plain: "Borrowing", key: "long-term-debt", group: "balance", x: 430, y: 320, step: "health" },
  { id: "dte", plain: "Borrowing vs owners' money", key: "debt-to-equity", group: "balance", x: 640, y: 320, step: "health" },
  { id: "equity", plain: "Owners' share", key: "shareholders-equity", group: "balance", x: 850, y: 320, step: "health" },
  { id: "roe", plain: "Profit on owners' money", key: "return-on-equity", group: "balance", x: 850, y: 60, step: "management" },
  { id: "eps", plain: "Profit per share", key: "eps", group: "market", x: 220, y: 440, step: "performance" },
  { id: "price", plain: "Share price", key: "share-price", group: "market", x: 640, y: 440, step: "value" },
  { id: "pe", plain: "Price vs profit", key: "pe-ratio", group: "market", x: 430, y: 440, step: "value" },
  { id: "mcap", plain: "Whole company's price", key: "market-cap", group: "market", x: 850, y: 440, step: "value" },
];

export const EDGES: MapEdge[] = [
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
export function conceptMap(n?: CompanyNumbers): MapNode[] {
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
  };
  return LAYOUT.map((l) => {
    const g = lookupTerm(l.key);
    return {
      id: l.id,
      plain: l.plain,
      term: g?.short ?? l.key,
      definition: g?.definition ?? "",
      why: g?.why,
      group: l.group,
      x: l.x,
      y: l.y,
      value: values[l.id],
      step: l.step,
    };
  });
}
