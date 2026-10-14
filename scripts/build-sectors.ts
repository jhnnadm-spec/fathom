/**
 * Build content/sectors.json: every company listed on a US exchange, with the
 * industry code it gives the SEC and its latest yearly sales (to list bigger
 * companies first). Run by the "Build sector list" workflow about once a month.
 *
 *   npx tsx scripts/build-sectors.ts
 *
 * Takes about half an hour, because it asks the SEC about each company
 * one at a time, within the SEC's rate limit.
 */
import { writeFile } from "node:fs/promises";
import { padCik, secFetchJson } from "../lib/sec/client";
import { sectorOf, type SectorRow } from "../lib/sectors";

type Exchanges = { fields: string[]; data: (string | number | null)[][] };
type Frame = { data: { cik: number; val: number }[] };

const LISTED = new Set(["Nasdaq", "NYSE", "CBOE"]);
const REVENUE_TAGS = [
  "RevenueFromContractWithCustomerExcludingAssessedTax",
  "Revenues",
  "SalesRevenueNet",
  "RevenuesNetOfInterestExpense",
];

/** Latest yearly sales per company, from the SEC's "frames" (one value per company per year). */
async function yearlySales(): Promise<Map<number, number>> {
  const sales = new Map<number, number>();
  for (const year of ["CY2024", "CY2025"]) {
    const thisYear = new Map<number, number>();
    for (const tag of REVENUE_TAGS) {
      try {
        const f = await secFetchJson<Frame>(`https://data.sec.gov/api/xbrl/frames/us-gaap/${tag}/USD/${year}.json`);
        for (const row of f.data) if (row.val > (thisYear.get(row.cik) ?? 0)) thisYear.set(row.cik, row.val);
      } catch (err) {
        console.log(`  no ${tag} for ${year}: ${(err as Error).message}`);
      }
    }
    for (const [cik, val] of thisYear) sales.set(cik, val); // the later year replaces the earlier one
    console.log(`Sales figures for ${year}: ${thisYear.size}`);
  }
  return sales;
}

async function main() {
  const ex = await secFetchJson<Exchanges>("https://www.sec.gov/files/company_tickers_exchange.json");
  const col = (name: string) => ex.fields.indexOf(name);
  const seen = new Set<number>();
  const companies: { cik: number; name: string; ticker: string }[] = [];
  for (const row of ex.data) {
    const cik = Number(row[col("cik")]);
    const exchange = String(row[col("exchange")] ?? "");
    if (!LISTED.has(exchange) || seen.has(cik)) continue; // the first ticker listed is the main one
    seen.add(cik);
    companies.push({ cik, name: String(row[col("name")]), ticker: String(row[col("ticker")]).toUpperCase() });
  }
  console.log(`Listed companies: ${companies.length}`);

  const sales = await yearlySales();
  const rows: SectorRow[] = [];
  let i = 0;
  for (const c of companies) {
    i++;
    try {
      const sub = await secFetchJson<{ sic?: string; sicDescription?: string }>(`https://data.sec.gov/submissions/CIK${padCik(c.cik)}.json`);
      const sic = Number(sub.sic);
      if (!sic || !sectorOf(sic)) continue;
      const r = sales.get(c.cik);
      rows.push({ t: c.ticker, n: c.name, s: sic, d: sub.sicDescription ?? "", ...(r ? { r } : {}) });
    } catch (err) {
      console.log(`  skipped ${c.ticker}: ${(err as Error).message}`);
    }
    if (i % 500 === 0) console.log(`  ${i} of ${companies.length}`);
  }
  rows.sort((a, b) => (b.r ?? 0) - (a.r ?? 0) || a.n.localeCompare(b.n));
  await writeFile("content/sectors.json", JSON.stringify({ builtAt: new Date().toISOString(), rows }) + "\n");
  console.log(`Saved ${rows.length} companies to content/sectors.json`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
