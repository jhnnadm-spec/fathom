/**
 * Everything the company page needs, gathered from SEC and calculated once,
 * then cached for a few hours so SEC isn't asked again on every visit.
 */
import { cacheLife, cacheTag } from "next/cache";
import { currentReports, filingsKey } from "../explain/sources";
import { computeNumbers, type CompanyNumbers } from "../financials/metrics";
import { buildStatements, type Statement } from "../financials/templates";
import { describeAnnouncement, eventCodes } from "../sec/events";
import { loadCompanyFacts } from "../sec/facts";
import {
  checkSupport,
  latestFiling,
  loadFilings,
  recentAnnouncements,
  type CompanyFilings,
  type Filing,
  type Support,
} from "../sec/filings";
import { findCompanies, loadTickers, type CompanyRef } from "../sec/tickers";

export type ReportFiling = {
  form: string;
  filingDate: string;
  periodEnd: string;
  url: string;
  indexUrl: string;
};

export type Announcement = { filingDate: string; events: string[]; codes: string[]; url: string };

/** Official notices that matter for trust in the accounts: auditor changes and restatements. */
export type GovernanceCheck = {
  since: string; // start of the period checked
  events: { filingDate: string; kind: "auditor-change" | "restatement"; url: string }[];
};

export type CompanyReport = {
  company: {
    name: string;
    ticker: string;
    cik: string;
    industry: string;
    sic: number;
    exchanges: string[];
    fiscalYearEnd?: string; // "MMDD", e.g. "1231"
  };
  support: Support;
  annualReport?: ReportFiling;
  quarterlyReport?: ReportFiling;
  numbers?: CompanyNumbers;
  statements: Statement[];
  announcements: Announcement[];
  governance?: GovernanceCheck;
  tradingViewSymbol: string; // e.g. "NASDAQ:AAPL", for the price chart and market data
  explanationKey: string; // which reports a plain-English explanation should be written from
  generatedAt: string;
};

/** The SEC's full list of companies and tickers. Changes rarely, so cached for a day. */
export async function getTickerList(): Promise<CompanyRef[]> {
  "use cache";
  cacheLife("days");
  return loadTickers();
}

export async function searchCompanies(query: string): Promise<CompanyRef[]> {
  return findCompanies(await getTickerList(), query);
}

/** "COSTCO WHOLESALE CORP /NEW" -> "Costco Wholesale Corp" */
export function displayName(secName: string): string {
  const cleaned = secName.replace(/\s*\/[A-Z]{2,4}\/?\s*$/i, "").trim();
  if (cleaned !== cleaned.toUpperCase()) return cleaned;
  return cleaned
    .toLowerCase()
    .replace(/\b([a-z])/g, (c) => c.toUpperCase())
    .replace(/\b(Ii|Iii|Iv)\b/g, (r) => r.toUpperCase());
}

/** TradingView writes symbols as EXCHANGE:TICKER, with "." in share classes (BRK.B). */
export function tradingViewSymbol(ticker: string, exchanges: string[]): string {
  const symbol = ticker.replace(/-/g, ".");
  const exchange = (exchanges[0] ?? "").toLowerCase();
  const prefix = exchange.includes("nasdaq") ? "NASDAQ" : exchange.includes("nyse") ? (exchange.includes("american") || exchange.includes("mkt") ? "AMEX" : "NYSE") : exchange.includes("cboe") ? "CBOE" : "";
  return prefix ? `${prefix}:${symbol}` : symbol;
}

function governanceCheck(filings: CompanyFilings, today = new Date()): GovernanceCheck {
  // SEC's quick filing list may only reach back a year or so for busy filers,
  // so the check only claims the period it actually covered.
  const threeYearsAgo = new Date(today.getTime() - 3 * 365 * 86_400_000).toISOString().slice(0, 10);
  const oldestListed = filings.filings.at(-1)?.filingDate ?? threeYearsAgo;
  const since = oldestListed > threeYearsAgo ? oldestListed : threeYearsAgo;
  const events: GovernanceCheck["events"] = [];
  for (const f of filings.filings) {
    if (!f.form.startsWith("8-K") || f.filingDate < since) continue;
    if (f.items.includes("4.01")) events.push({ filingDate: f.filingDate, kind: "auditor-change", url: f.url });
    if (f.items.includes("4.02")) events.push({ filingDate: f.filingDate, kind: "restatement", url: f.url });
  }
  return { since, events };
}

function toReportFiling(f: Filing | undefined): ReportFiling | undefined {
  if (!f) return undefined;
  return { form: f.form, filingDate: f.filingDate, periodEnd: f.reportDate, url: f.url, indexUrl: f.indexUrl };
}

/** Build the report for one ticker. Returns null when no such company exists. */
export async function getCompanyReport(ticker: string): Promise<CompanyReport | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(`company:${ticker}`);

  const list = await getTickerList();
  const ref = list.find((c) => c.ticker === ticker) ?? findCompanies(list, ticker)[0];
  if (!ref || ref.ticker !== ticker) return null;

  const filings = await loadFilings(ref.cik);
  const support = checkSupport(filings);
  const base: CompanyReport = {
    company: {
      name: displayName(filings.name || ref.name),
      ticker: ref.ticker,
      cik: ref.cik,
      industry: filings.industry,
      sic: filings.sic,
      exchanges: filings.exchanges,
      fiscalYearEnd: filings.fiscalYearEnd || undefined,
    },
    support,
    statements: [],
    announcements: [],
    tradingViewSymbol: tradingViewSymbol(ref.ticker, filings.exchanges),
    explanationKey: filingsKey(currentReports(filings)),
    generatedAt: new Date().toISOString(),
  };
  if (!support.supported) return base;

  const facts = await loadCompanyFacts(ref.cik);
  const numbers = computeNumbers(facts, filings);

  return {
    ...base,
    annualReport: toReportFiling(latestFiling(filings, "10-K")),
    quarterlyReport: toReportFiling(latestFiling(filings, "10-Q")),
    numbers,
    statements: buildStatements(numbers),
    announcements: recentAnnouncements(filings, 120)
      .map((f) => ({ filingDate: f.filingDate, events: describeAnnouncement(f.items), codes: eventCodes(f.items), url: f.url }))
      .filter((a) => a.events.length > 0)
      .slice(0, 12),
    governance: governanceCheck(filings),
  };
}
