/**
 * Everything the company page needs, gathered from SEC and calculated once,
 * then cached for a few hours so SEC isn't asked again on every visit.
 */
import { cacheLife, cacheTag } from "next/cache";
import { computeNumbers, type CompanyNumbers } from "../financials/metrics";
import { buildStatements, type Statement } from "../financials/templates";
import { describeAnnouncement } from "../sec/events";
import { loadCompanyFacts } from "../sec/facts";
import {
  checkSupport,
  latestFiling,
  loadFilings,
  recentAnnouncements,
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

export type Announcement = { filingDate: string; events: string[]; url: string };

export type CompanyReport = {
  company: {
    name: string;
    ticker: string;
    cik: string;
    industry: string;
    exchanges: string[];
  };
  support: Support;
  annualReport?: ReportFiling;
  quarterlyReport?: ReportFiling;
  numbers?: CompanyNumbers;
  statements: Statement[];
  announcements: Announcement[];
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
      exchanges: filings.exchanges,
    },
    support,
    statements: [],
    announcements: [],
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
      .map((f) => ({ filingDate: f.filingDate, events: describeAnnouncement(f.items), url: f.url }))
      .filter((a) => a.events.length > 0)
      .slice(0, 6),
  };
}
