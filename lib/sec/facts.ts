/**
 * Financial numbers from SEC's "company facts" data.
 *
 * Companies tag every number in their reports (revenue, cash, debt...).
 * SEC collects those tags per company. The same number often appears in
 * several filings (this year's report repeats last year's figures), so this
 * file picks one clean value per period and remembers which filing it came from.
 */
import { secFetchJson, SEC_URLS } from "./client";

export type FactValue = {
  start?: string; // first day of the period (missing for balance-sheet amounts)
  end: string; // last day of the period, or the balance-sheet date
  val: number;
  accn: string; // filing it was reported in
  fy?: number;
  fp?: string; // "FY", "Q1", "Q2", "Q3"
  form: string; // "10-K", "10-Q" ...
  filed: string;
  frame?: string;
};

type RawConcept = {
  label?: string;
  description?: string;
  units: Record<string, FactValue[]>;
};

export type CompanyFacts = {
  cik: string | number;
  entityName: string;
  facts: Record<string, Record<string, RawConcept>>; // taxonomy -> concept -> data
};

export async function loadCompanyFacts(cik: string): Promise<CompanyFacts> {
  return secFetchJson<CompanyFacts>(SEC_URLS.companyFacts(cik));
}

export type PeriodKind = "annual" | "quarterly" | "instant";

export type SeriesPoint = {
  start?: string;
  end: string;
  value: number;
  concept: string; // which tag the number came from
  unit: string;
  accn: string; // filing it was reported in
  form: string;
  filed: string;
};

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

function matchesKind(v: FactValue, kind: PeriodKind): boolean {
  if (kind === "instant") return !v.start;
  if (!v.start) return false;
  const days = daysBetween(v.start, v.end);
  // Most companies use 52 or 53 week years, so allow a little slack.
  return kind === "annual" ? days >= 350 && days <= 380 : days >= 80 && days <= 100;
}

const ACCEPTED_FORMS = new Set(["10-K", "10-Q", "10-K/A", "10-Q/A"]);

/**
 * One value per period for the first of `concepts` that has data,
 * filling gaps from the later ones. Newest period first.
 *
 * When the same period is reported more than once, the most recently filed
 * value wins, because companies sometimes restate earlier numbers.
 */
export function getSeries(
  facts: CompanyFacts,
  concepts: string[],
  kind: PeriodKind,
  unit = "USD",
  taxonomy = "us-gaap",
): SeriesPoint[] {
  const byPeriod = new Map<string, SeriesPoint>();

  concepts.forEach((concept) => {
    const values = facts.facts[taxonomy]?.[concept]?.units[unit] ?? [];
    const own = new Map<string, SeriesPoint>();
    for (const v of values) {
      if (!ACCEPTED_FORMS.has(v.form) || !matchesKind(v, kind)) continue;
      const key = `${v.start ?? ""}|${v.end}`;
      const existing = own.get(key);
      if (!existing || v.filed > existing.filed) {
        own.set(key, {
          start: v.start,
          end: v.end,
          value: v.val,
          concept,
          unit,
          accn: v.accn,
          form: v.form,
          filed: v.filed,
        });
      }
    }
    // Earlier concepts in the list are preferred; later ones only fill gaps.
    for (const [key, point] of own) if (!byPeriod.has(key)) byPeriod.set(key, point);
  });

  return [...byPeriod.values()].sort((a, b) => b.end.localeCompare(a.end));
}

/** The concept names this company actually reports, useful when deciding which tag to use. */
export function availableConcepts(facts: CompanyFacts, taxonomy = "us-gaap"): string[] {
  return Object.keys(facts.facts[taxonomy] ?? {});
}
