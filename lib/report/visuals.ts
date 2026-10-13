/**
 * The numbers behind Fathom's charts, worked out from the same SEC figures as
 * the sentences. Each chart gets plain data; the drawing happens in components/viz.
 */
import { formatDate, formatMoney, formatPerShare } from "../financials/format";
import type { CompanyNumbers, Comparison } from "../financials/metrics";

/** Chart colours, checked for colour-blind readers on Fathom's light glass tiles (in this order). */
export const SERIES = {
  blue: "#2a78d6",
  magenta: "#d55181",
  violet: "#6250d6",
  green: "#199e70",
  orange: "#eb6834",
} as const;

export type Segment = { label: string; value: number; display: string; color: string; note: string };

/** Where each $100 of sales went: product costs, running the business, interest and tax, profit. */
export function salesSplit(n?: CompanyNumbers): { segments: Segment[]; period: string } | undefined {
  const m = n?.margins;
  if (!m || m.gross === undefined || m.net === undefined || m.net < 0 || m.gross < m.net) return undefined;
  const per100 = (f: number) => Math.round(f * 1000) / 10;
  const segments: Segment[] = [
    {
      label: "Making or buying what it sold",
      value: per100(1 - m.gross),
      display: "",
      color: SERIES.blue,
      note: "The direct cost of the products and services it sold: materials, factories, delivery.",
    },
  ];
  if (m.operating !== undefined && m.operating <= m.gross && m.operating >= m.net) {
    segments.push(
      { label: "Running the business", value: per100(m.gross - m.operating), display: "", color: SERIES.magenta, note: "Staff, research, marketing and offices: the cost of keeping the company going." },
      { label: "Interest, tax and other", value: per100(m.operating - m.net), display: "", color: SERIES.violet, note: "Interest on its debts, taxes, and other gains and costs outside the main business." },
    );
  } else {
    segments.push({ label: "All other costs", value: per100(m.gross - m.net), display: "", color: SERIES.magenta, note: "Running the business, interest, tax and other costs." });
  }
  segments.push({ label: "Profit", value: per100(m.net), display: "", color: SERIES.green, note: "What's left for the company after every cost: its profit." });
  for (const s of segments) s.display = `$${Math.round(s.value)}`;
  return { segments, period: m.periodEnd ? `Year ended ${formatDate(m.periodEnd)}` : "" };
}

export type Bar = { label: string; value: number; display: string; detail: string };

/** Yearly sales, oldest first. */
export function salesHistory(n?: CompanyNumbers): { bars: Bar[]; change?: number } | undefined {
  const h = n?.revenueHistory ?? [];
  if (h.length < 2) return undefined;
  return {
    bars: h.map((f) => ({ label: f.end.slice(0, 4), value: f.value, display: formatMoney(f.value), detail: `Year ended ${formatDate(f.end)}` })),
    change: n?.annual.revenue?.change,
  };
}

/** The current ratio on a 0–2 scale, for the "can it pay its bills" gauge. */
export function billsGauge(n?: CompanyNumbers): { value: number; date: string } | undefined {
  const r = n?.ratios.currentRatio;
  return r ? { value: r.value, date: formatDate(r.end) } : undefined;
}

/** Cash and long-term debt on the same date. */
export function cashVsDebt(n?: CompanyNumbers): { cash: number; debt: number; date: string } | undefined {
  const cash = n?.balance.cash?.latest;
  const debt = n?.balance.longTermDebt?.latest;
  if (!cash || !debt || cash.end !== debt.end) return undefined;
  return { cash: cash.value, debt: debt.value, date: formatDate(cash.end) };
}

/** What the company spent its money on in its latest year, biggest first. */
export function moneyUses(n?: CompanyNumbers): { segments: Segment[]; period: string; spare?: number } | undefined {
  if (!n) return undefined;
  const year = n.annual.operatingCashFlow?.latest ?? n.annual.revenue?.latest;
  if (!year) return undefined;
  const same = (c?: Comparison) => (c && c.latest.start === year.start && c.latest.end === year.end && c.latest.value > 0 ? c.latest.value : undefined);
  const raw = [
    { label: "Buying back its own shares", value: same(n.annual.buybacks), note: "Buying its own shares from the market, which leaves fewer shares, so each remaining one owns a bigger slice." },
    { label: "Dividends to shareholders", value: same(n.annual.dividends), note: "Cash paid out to the people who own its shares." },
    { label: "Buildings and equipment", value: same(n.annual.capex), note: "Investing in long-lasting things like factories, stores, data centres and machines." },
    { label: "Buying other businesses", value: same(n.annual.acquisitions), note: "Paying to take over other companies." },
  ].filter((u) => u.value !== undefined) as { label: string; value: number; note: string }[];
  if (raw.length === 0) return undefined;
  raw.sort((a, b) => b.value - a.value);
  const colors = [SERIES.blue, SERIES.magenta, SERIES.violet, SERIES.green];
  return {
    segments: raw.map((u, i) => ({ ...u, display: formatMoney(u.value), color: colors[i] })),
    period: `Year ended ${formatDate(year.end)}`,
    spare: n.ratios.freeCashFlow?.value,
  };
}

/** Gross, operating and profit margin for each year, for the line chart. */
export function marginLines(n?: CompanyNumbers) {
  const h = n?.marginHistory ?? [];
  if (h.length < 2) return undefined;
  const series = [
    { name: "Gross margin", key: "gross" as const, color: SERIES.blue },
    { name: "Operating margin", key: "operating" as const, color: SERIES.orange },
    { name: "Profit margin", key: "net" as const, color: SERIES.green },
  ].filter((s) => h.some((y) => y[s.key] !== undefined));
  return {
    years: h.map((y) => ({ label: y.end.slice(0, 4), detail: `Year ended ${formatDate(y.end)}` })),
    series: series.map((s) => ({ name: s.name, color: s.color, values: h.map((y) => y[s.key]) })),
  };
}

// ---------------------------------------------------------------- small visuals beside single numbers


export type PairItem = { label: string; value: number; display: string; color: string };
const EARLIER = "#9fb7c3"; // a quiet grey-blue for "a year earlier", so the latest figure stands out

/** The figure a year earlier next to the latest one, for anything compared over a year. */
export function compareFor(id: string, n?: CompanyNumbers): PairItem[] | undefined {
  if (!n) return undefined;
  const map: Record<string, { c?: Comparison; perShare?: boolean; period: "year" | "quarter" | "date" }> = {
    "revenue-year": { c: n.annual.revenue, period: "year" },
    "revenue-quarter": { c: n.quarter.revenue, period: "quarter" },
    "net-income-year": { c: n.annual.netIncome, period: "year" },
    "net-income-quarter": { c: n.quarter.netIncome, period: "quarter" },
    "operating-cash-flow": { c: n.annual.operatingCashFlow, period: "year" },
    cash: { c: n.balance.cash, period: "date" },
    "long-term-debt": { c: n.balance.longTermDebt, period: "date" },
    equity: { c: n.balance.equity, period: "date" },
    eps: { c: n.annual.eps, perShare: true, period: "year" },
  };
  const m = map[id];
  if (!m?.c?.previous) return undefined;
  const fmt = (v: number) => (m.perShare ? formatPerShare(v) : formatMoney(v));
  const earlier = m.period === "year" ? "The year before" : m.period === "quarter" ? "Same quarter a year earlier" : "A year earlier";
  const latest = m.period === "year" ? "Latest year" : m.period === "quarter" ? "Latest quarter" : "Latest";
  return [
    { label: earlier, value: Math.abs(m.c.previous.value), display: fmt(m.c.previous.value), color: EARLIER },
    { label: latest, value: Math.abs(m.c.latest.value), display: fmt(m.c.latest.value), color: SERIES.blue },
  ];
}

/** Two related amounts side by side: what it owns vs owes, debt vs equity, spare cash vs profit. */
export function pairFor(id: string, n?: CompanyNumbers): PairItem[] | undefined {
  if (!n) return undefined;
  const r = n.ratios;
  if ((id === "assets-vs-liabilities" || id === "assets-per-dollar-owed") && r.assetsToLiabilities) {
    const [a, l] = r.assetsToLiabilities.figures;
    return [
      { label: "What it owns (assets)", value: a.value, display: formatMoney(a.value), color: SERIES.green },
      { label: "What it owes (liabilities)", value: l.value, display: formatMoney(l.value), color: SERIES.orange },
    ];
  }
  if (id === "debt-to-equity" && r.debtToEquity) {
    const [d, e] = r.debtToEquity.figures;
    return [
      { label: "Long-term debt", value: d.value, display: formatMoney(d.value), color: SERIES.orange },
      { label: "Shareholders' equity", value: e.value, display: formatMoney(e.value), color: SERIES.blue },
    ];
  }
  if (id === "fcf-vs-profit" && r.freeCashFlow && n.annual.netIncome) {
    const f = r.freeCashFlow.value;
    const p = n.annual.netIncome.latest.value;
    return [
      { label: "Free cash flow", value: Math.abs(f), display: formatMoney(f), color: SERIES.green },
      { label: "Net income (profit)", value: Math.abs(p), display: formatMoney(p), color: SERIES.blue },
    ];
  }
  if ((id === "free-cash-flow" || id === "s-cash") && r.freeCashFlow) {
    const [ocf, capex] = r.freeCashFlow.figures;
    return [
      { label: "Cash its business brought in", value: Math.abs(ocf.value), display: formatMoney(ocf.value), color: SERIES.blue },
      { label: "Spent on buildings and equipment", value: Math.abs(capex.value), display: `−${formatMoney(Math.abs(capex.value))}`, color: SERIES.orange },
      { label: "Left over (free cash flow)", value: Math.abs(r.freeCashFlow.value), display: formatMoney(r.freeCashFlow.value), color: SERIES.green },
    ];
  }
  return undefined;
}

/** A share of each $100 of sales, for the dot grid. */
export function shareFor(id: string, n?: CompanyNumbers): { value: number; label: string } | undefined {
  const m = n?.margins;
  if (!m) return undefined;
  if (id === "gross-margin" && m.gross !== undefined) return { value: m.gross, label: "left after the cost of what it sold" };
  if (id === "operating-margin" && m.operating !== undefined) return { value: m.operating, label: "left after also running the business" };
  if ((id === "net-margin" || id === "profit-margin") && m.net !== undefined) return { value: m.net, label: "left as final profit" };
  return undefined;
}
