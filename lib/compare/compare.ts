/**
 * Comparing 2 to 5 companies side by side, from each one's lens result.
 *
 * The comparison never says which company is "better": it only marks the
 * highest and lowest figure in each row, warns when figures aren't like for
 * like, and describes the differences in plain words from the numbers alone.
 */
import { formatDate } from "../financials/format";
import { figureValue, yearEndText } from "../lens/format";
import { FUNDAMENTAL_METRICS, type FundamentalData, type FundamentalMetricId, type MetricRow } from "../lens/fundamental";
import type { Figure, LensResult } from "../lens/types";

export const MIN_COMPANIES = 2;
export const MAX_COMPANIES = 5;

export type Mark = "highest" | "lowest";

export type CompareCell = { ticker: string; figure: Figure; mark?: Mark };

export type CompareRow = Omit<MetricRow, "figure" | "reading"> & { cells: CompareCell[] };

export type CompareWarning = { kind: "fiscal-year" | "period" | "sector" | "currency" | "standard"; text: string };

export type Comparison = {
  companies: LensResult<FundamentalData>["meta"][];
  rows: CompareRow[];
  warnings: CompareWarning[];
  summary: string[];
};

/** Tickers from a link like ?t=KO,PEP: cleaned, without repeats, at most five. */
export function parseTickers(raw: string | string[] | undefined): string[] {
  const text = (Array.isArray(raw) ? raw.join(",") : raw) ?? "";
  const list = text
    .split(/[\s,]+/)
    .map((t) => t.trim().toUpperCase().replace(/\./g, "-"))
    .filter((t) => /^[A-Z0-9-]{1,10}$/.test(t));
  return [...new Set(list)].slice(0, MAX_COMPANIES);
}

/** Which cells hold the highest and lowest value, when at least two companies reported it and they differ. */
export function markExtremes(cells: CompareCell[]): CompareCell[] {
  const values = cells.flatMap((c) => (c.figure.status === "reported" ? [c.figure.value] : []));
  if (values.length < 2) return cells;
  const max = Math.max(...values);
  const min = Math.min(...values);
  if (max === min) return cells;
  return cells.map((c) => {
    if (c.figure.status !== "reported") return c;
    if (c.figure.value === max) return { ...c, mark: "highest" };
    if (c.figure.value === min) return { ...c, mark: "lowest" };
    return c;
  });
}

const MMDD = (mmdd: string) => yearEndText(mmdd) ?? mmdd;
const days = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / 86_400_000;

/** Reasons the side-by-side figures aren't exactly like for like, in plain words. */
export function warningsFor(results: LensResult<FundamentalData>[]): CompareWarning[] {
  const out: CompareWarning[] = [];
  const name = (r: LensResult<FundamentalData>) => r.meta.company;

  const ends = results.filter((r) => r.meta.fiscalYearEnd);
  const distinctEnds = [...new Set(ends.map((r) => r.meta.fiscalYearEnd!))];
  // A difference of a few days (a 52/53-week year ending on the nearest Saturday) isn't a real difference.
  const yearEnds = results.flatMap((r) => {
    const f = r.data.rows.find((x) => x.id === "revenue")?.figure;
    return f?.status === "reported" ? [{ r, end: f.period.end }] : [];
  });
  const spread = yearEnds.length > 1 ? Math.max(...yearEnds.map((a) => Math.max(...yearEnds.map((b) => days(a.end, b.end))))) : 0;
  if (distinctEnds.length > 1 && spread > 14) {
    out.push({
      kind: "fiscal-year",
      text: `Their financial years end at different times (${ends.map((r) => `${name(r)}: ${MMDD(r.meta.fiscalYearEnd!)}`).join("; ")}), so the yearly figures cover different 12-month periods.`,
    });
  }
  if (spread > 60) {
    out.push({
      kind: "period",
      text: `Some latest yearly figures are much older than others (${yearEnds.map((y) => `${name(y.r)}: year to ${formatDate(y.end)}`).join("; ")}). Check the period under each figure.`,
    });
  }
  const sectors = [...new Set(results.map((r) => r.meta.sector ?? "Unknown"))];
  if (sectors.length > 1) {
    out.push({
      kind: "sector",
      text: `They're in different types of business (${results.map((r) => `${name(r)}: ${r.meta.sector ?? "not classified"}`).join("; ")}). Normal levels for margins, debt and cash differ a lot between industries, so differences may reflect the industry rather than the company.`,
    });
  }
  const currencies = [...new Set(results.map((r) => r.meta.currency))];
  if (currencies.length > 1) out.push({ kind: "currency", text: `They report in different currencies (${currencies.join(", ")}).` });
  const standards = [...new Set(results.map((r) => r.meta.accountingStandard))];
  if (standards.length > 1) out.push({ kind: "standard", text: `They use different accounting rules (${standards.join(", ")}), which can change how the same thing is counted.` });
  return out;
}

/** Plain sentences on the main differences, from the structured figures only. Neutral: highest and lowest, never better or worse. */
export function compareSummary(rows: CompareRow[], companies: LensResult<FundamentalData>["meta"][]): string[] {
  const nameOf = (t: string) => companies.find((c) => c.ticker === t)?.company ?? t;
  const lines: string[] = [];
  const phrase: Partial<Record<FundamentalMetricId, [string, string]>> = {
    revenue: ["is the biggest by sales", "the smallest"],
    revenueGrowth: ["grew its sales fastest", "the slowest"],
    netMargin: ["kept the largest share of each sale as profit", "the smallest share"],
    freeCashFlow: ["had the most spare cash after investing", "the least"],
    debtToEquity: ["had borrowed the most compared with its owners' money", "the least"],
    returnOnEquity: ["made the most profit on its owners' money", "the least"],
  };
  for (const [id, [hi, lo]] of Object.entries(phrase) as [FundamentalMetricId, [string, string]][]) {
    const row = rows.find((r) => r.id === id);
    if (!row) continue;
    const high = row.cells.find((c) => c.mark === "highest");
    const low = row.cells.find((c) => c.mark === "lowest");
    if (!high || !low || high.figure.status !== "reported" || low.figure.status !== "reported") continue;
    lines.push(`${nameOf(high.ticker)} ${hi} (${figureValue(high.figure)}); ${nameOf(low.ticker)} ${lo} (${figureValue(low.figure)}).`);
  }
  const missing = rows
    .filter((r) => r.group !== "valuation")
    .flatMap((r) => r.cells.filter((c) => c.figure.status === "not-reported").map((c) => ({ r, c })));
  if (missing.length > 0) {
    const byCompany = [...new Set(missing.map((m) => m.c.ticker))];
    lines.push(`Some figures weren't reported, so they're left blank rather than counted as zero (${byCompany.map(nameOf).join(", ")}).`);
  }
  return lines;
}

/** The whole comparison, from each company's Fundamental lens result. */
export function buildComparison(results: LensResult<FundamentalData>[]): Comparison {
  const companies = results.map((r) => r.meta);
  const ids = Object.keys(FUNDAMENTAL_METRICS) as FundamentalMetricId[];
  const rows: CompareRow[] = ids.map((id) => {
    const def = FUNDAMENTAL_METRICS[id];
    const cells = results.map((r) => ({
      ticker: r.ticker,
      figure: r.data.rows.find((x) => x.id === id)?.figure ?? ({ status: "not-reported", reason: "Not reported in its SEC filings." } as Figure),
    }));
    return { ...def, cells: markExtremes(cells) };
  });
  return { companies, rows, warnings: warningsFor(results), summary: compareSummary(rows, companies) };
}
