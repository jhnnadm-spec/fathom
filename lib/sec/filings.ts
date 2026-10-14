/**
 * A company's list of filings: which reports exist, when they were filed,
 * and the web address of each one.
 */
import { padCik, secFetchJson, SEC_URLS } from "./client";

export type Filing = {
  accessionNumber: string; // SEC's ID for the filing, e.g. "0000320193-25-000079"
  form: string; // "10-K", "10-Q", "8-K", "10-K/A" ...
  filingDate: string; // when it was filed, "YYYY-MM-DD"
  reportDate: string; // the period it covers, "YYYY-MM-DD" (may be empty)
  primaryDocument: string; // file name of the main document
  items: string[]; // for 8-Ks: which kinds of event, e.g. ["2.02", "9.01"]
  url: string; // the main document
  indexUrl: string; // the page listing every document in the filing
};

export type CompanyFilings = {
  cik: string;
  name: string;
  tickers: string[];
  exchanges: string[];
  industry: string; // SEC's industry description, e.g. "Electronic Computers"
  sic: number; // SEC's industry code, e.g. 3571 (0 when not given)
  fiscalYearEnd: string; // "MMDD", e.g. "0926"
  filings: Filing[]; // newest first
};

type RawSubmissions = {
  cik: string | number;
  name: string;
  tickers?: string[];
  exchanges?: string[];
  sic?: string;
  sicDescription?: string;
  fiscalYearEnd?: string;
  filings: {
    recent: {
      accessionNumber: string[];
      form: string[];
      filingDate: string[];
      reportDate: string[];
      primaryDocument: string[];
      items?: string[];
    };
  };
};

export function parseSubmissions(raw: RawSubmissions): CompanyFilings {
  const r = raw.filings.recent;
  const cik = padCik(raw.cik);
  const filings: Filing[] = r.accessionNumber.map((acc, i) => ({
    accessionNumber: acc,
    form: r.form[i] ?? "",
    filingDate: r.filingDate[i] ?? "",
    reportDate: r.reportDate[i] ?? "",
    primaryDocument: r.primaryDocument[i] ?? "",
    items: (r.items?.[i] ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    url: SEC_URLS.document(cik, acc, r.primaryDocument[i] ?? ""),
    indexUrl: SEC_URLS.filingIndex(cik, acc),
  }));
  filings.sort((a, b) => b.filingDate.localeCompare(a.filingDate));

  return {
    cik,
    name: raw.name,
    tickers: raw.tickers ?? [],
    exchanges: raw.exchanges ?? [],
    industry: raw.sicDescription ?? "",
    sic: Number(raw.sic) || 0,
    fiscalYearEnd: raw.fiscalYearEnd ?? "",
    filings,
  };
}

export async function loadFilings(cik: string): Promise<CompanyFilings> {
  return parseSubmissions(await secFetchJson<RawSubmissions>(SEC_URLS.submissions(cik)));
}

/** The newest original filing of a type. Corrections ("10-K/A") are skipped. */
export function latestFiling(company: CompanyFilings, form: "10-K" | "10-Q"): Filing | undefined {
  return company.filings.find((f) => f.form === form);
}

/** The filing of the same type that came just before this one. */
export function previousFiling(company: CompanyFilings, filing: Filing): Filing | undefined {
  return company.filings.find(
    (f) => f.form === filing.form && f.filingDate < filing.filingDate,
  );
}

/** 8-K announcements filed in the last `days` days, newest first. */
export function recentAnnouncements(
  company: CompanyFilings,
  days: number,
  today: Date = new Date(),
): Filing[] {
  const cutoff = new Date(today.getTime() - days * 86_400_000).toISOString().slice(0, 10);
  return company.filings.filter((f) => f.form === "8-K" && f.filingDate >= cutoff);
}

export type Support =
  | { supported: true }
  | { supported: false; reason: "foreign-filer" | "no-recent-reports" };

/**
 * Version 1 covers companies that file US annual and quarterly reports.
 * Foreign companies file a different report (20-F or 40-F) and come later.
 */
export function checkSupport(company: CompanyFilings, today: Date = new Date()): Support {
  const twoYearsAgo = new Date(today.getTime() - 730 * 86_400_000).toISOString().slice(0, 10);
  const recent = company.filings.filter((f) => f.filingDate >= twoYearsAgo);
  if (recent.some((f) => f.form === "10-K" || f.form === "10-Q")) return { supported: true };
  if (recent.some((f) => f.form === "20-F" || f.form === "40-F")) {
    return { supported: false, reason: "foreign-filer" };
  }
  return { supported: false, reason: "no-recent-reports" };
}
