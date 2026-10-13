/**
 * Turning what a person types ("apple", "AAPL", "coca cola") into the
 * company's SEC ID number (CIK).
 */
import { padCik, secFetchJson, SEC_URLS } from "./client";

export type CompanyRef = {
  cik: string; // 10 digits, e.g. "0000320193"
  ticker: string; // e.g. "AAPL"
  name: string; // e.g. "Apple Inc."
};

type RawTickers = Record<string, { cik_str: number; ticker: string; title: string }>;

export function parseTickers(raw: RawTickers): CompanyRef[] {
  return Object.values(raw).map((row) => ({
    cik: padCik(row.cik_str),
    ticker: row.ticker.toUpperCase(),
    name: row.title,
  }));
}

export async function loadTickers(): Promise<CompanyRef[]> {
  return parseTickers(await secFetchJson<RawTickers>(SEC_URLS.tickers));
}

/** Makes "Coca-Cola Co" and "coca cola" compare equal. */
function simplify(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(inc|corp|corporation|co|company|ltd|plc|the|holdings?|group|class [a-c])\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Tickers use "." in everyday writing (BRK.B) but "-" at SEC (BRK-B). */
function normaliseTicker(text: string): string {
  return text.trim().toUpperCase().replace(/\./g, "-");
}

/**
 * Find companies matching a search. Best matches first:
 * exact ticker, then exact name, then names starting with the search, then names containing it.
 */
export function findCompanies(list: CompanyRef[], query: string, limit = 8): CompanyRef[] {
  const q = query.trim();
  if (!q) return [];
  const ticker = normaliseTicker(q);
  const name = simplify(q);

  const scored: { ref: CompanyRef; score: number }[] = [];
  for (const ref of list) {
    let score = 0;
    const refName = simplify(ref.name);
    if (ref.ticker === ticker) score = 100;
    else if (name && refName === name) score = 90;
    else if (name && refName.startsWith(name + " ")) score = 70;
    else if (name && refName.startsWith(name)) score = 60;
    else if (name.length >= 3 && refName.includes(name)) score = 40;
    if (score > 0) scored.push({ ref, score });
  }

  // SEC lists a company once per share class; keep one entry per company.
  const seen = new Set<string>();
  return scored
    .sort((a, b) => b.score - a.score || a.ref.ticker.length - b.ref.ticker.length)
    .filter(({ ref }) => (seen.has(ref.cik) ? false : (seen.add(ref.cik), true)))
    .slice(0, limit)
    .map(({ ref }) => ref);
}
