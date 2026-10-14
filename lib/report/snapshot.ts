/**
 * A short summary of one company, for watchlist cards and the front page:
 * a few headline facts from SEC data and its latest official announcements.
 */
import { cacheLife, cacheTag } from "next/cache";
import { formatMoney, formatPercent } from "../financials/format";
import { loadFilings } from "../sec/filings";
import { sectorOf, SECTORS } from "../sectors";
import { getCompanyProfile } from "../profile/wiki";
import { displayName, getCompanyReport, getTickerList, tradingViewSymbol } from "./company";

export type Snapshot = {
  ticker: string;
  name: string;
  sector?: string;
  symbol: string; // for TradingView news
  logo?: string; // from Wikimedia Commons, when there is one
  website?: string; // for the site's icon when there's no logo
  facts: { label: string; value: string }[];
  announcements: { date: string; events: string[]; url: string }[];
};

export async function getSnapshot(ticker: string): Promise<Snapshot | null> {
  const r = await getCompanyReport(ticker);
  if (!r) return null;
  const n = r.numbers;
  const facts: Snapshot["facts"] = [];
  const g = n?.annual.revenue?.change;
  if (g !== undefined) facts.push({ label: "Sales vs the year before", value: `${g >= 0 ? "Up" : "Down"} ${formatPercent(g)}` });
  if (n?.margins.net !== undefined) facts.push({ label: "Kept as profit, per $100 of sales", value: n.margins.net < 0 ? "A loss" : `$${Math.round(n.margins.net * 100)}` });
  const cash = n?.balance.cash?.latest;
  const debt = n?.balance.longTermDebt?.latest;
  if (cash && debt && cash.end === debt.end) facts.push({ label: "Cash vs long-term debt", value: cash.value >= debt.value ? "More cash than debt" : "More debt than cash" });
  else if (cash) facts.push({ label: "Cash", value: formatMoney(cash.value) });
  const s = sectorOf(r.company.sic);
  const profile = await getCompanyProfile(r.company.cik).catch(() => undefined);
  return {
    logo: profile?.logo,
    website: profile?.website,
    ticker: r.company.ticker,
    name: r.company.name,
    sector: s ? SECTORS[s].name : undefined,
    symbol: r.tradingViewSymbol,
    facts: facts.slice(0, 3),
    announcements: r.announcements.slice(0, 3).map((a) => ({ date: a.filingDate, events: a.events, url: a.url })),
  };
}

/** Just the TradingView symbol (EXCHANGE:TICKER), for news. Lighter than a full report. */
export async function getSymbol(ticker: string): Promise<{ ticker: string; name: string; symbol: string } | null> {
  "use cache";
  cacheLife("days");
  cacheTag(`symbol:${ticker}`);
  const ref = (await getTickerList()).find((c) => c.ticker === ticker);
  if (!ref) return null;
  const f = await loadFilings(ref.cik);
  return { ticker, name: displayName(f.name || ref.name), symbol: tradingViewSymbol(ticker, f.exchanges) };
}
