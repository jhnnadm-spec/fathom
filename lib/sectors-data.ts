/** The sector list built from SEC data (content/sectors.json), ready for the sector pages. */
import data from "@/content/sectors.json";
import { SECTORS, sectorOf, type SectorId, type SectorRow } from "./sectors";

const rows = (data as { builtAt: string | null; rows: SectorRow[] }).rows;
export const SECTORS_BUILT_AT = (data as { builtAt: string | null }).builtAt;

const bySector = new Map<SectorId, SectorRow[]>();
for (const r of rows) {
  const s = sectorOf(r.s);
  if (!s) continue;
  if (!bySector.has(s)) bySector.set(s, []);
  bySector.get(s)!.push(r); // rows are already biggest sales first
}

export function sectorSummaries() {
  return (Object.keys(SECTORS) as SectorId[]).map((id) => ({
    id,
    ...SECTORS[id],
    count: bySector.get(id)?.length ?? 0,
    top: (bySector.get(id) ?? []).slice(0, 3),
  }));
}

export function companiesIn(id: SectorId, genre?: string): SectorRow[] {
  const list = bySector.get(id) ?? [];
  return genre ? list.filter((r) => r.d === genre) : list;
}

/** The industries ("genres") inside a sector, most companies first. */
export function genresIn(id: SectorId): { name: string; label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of bySector.get(id) ?? []) if (r.d) counts.set(r.d, (counts.get(r.d) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, label: plainIndustry(name), count }));
}

/** The biggest companies by yearly sales across all sectors. */
export function largestCompanies(n: number): SectorRow[] {
  return rows.filter((r) => r.r).slice(0, n);
}

/** "SERVICES-PREPACKAGED SOFTWARE" → "Services: prepackaged software" */
export function plainIndustry(sec: string): string {
  const lower = sec.toLowerCase().replace(/\s*-\s*/g, ": ").replace(/\s+/g, " ").trim();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function isSectorId(x: string): x is SectorId {
  return x in SECTORS;
}
