/**
 * The economy right now, from official US government sources (public domain):
 *  - interest rates: US Treasury, daily yield curve (3-month bill and 10-year note)
 *  - inflation and unemployment: Bureau of Labor Statistics (BLS)
 * Fetched at most once a day. If a source can't be reached, that figure is left out.
 */
import { cacheLife, cacheTag } from "next/cache";

export type Indicator = {
  id: "short-rate" | "long-rate" | "inflation" | "unemployment";
  value: number; // percent
  yearAgo?: number; // percent, about a year earlier
  date: string; // YYYY-MM-DD (or YYYY-MM-01 for monthly figures)
  source: { name: string; url: string };
};

const UA = "Fathom/1.0 (plain-English company explainer; https://github.com/jhnnadm-spec/fathom)";

async function get(url: string, init: RequestInit = {}): Promise<Response> {
  let last: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { "User-Agent": UA, Accept: "text/csv, application/json, */*", ...(init.headers ?? {}) },
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`${res.status} from ${new URL(url).host}`);
      return res;
    } catch (err) {
      last = err;
    }
  }
  throw last;
}

/** Treasury's daily yield curve CSV for one year: rows of date and yields. Exported for tests. */
export function parseTreasuryCsv(csv: string): { date: string; short?: number; long?: number }[] {
  const lines = csv.trim().split(/\r?\n/);
  const head = lines[0].split(",").map((h) => h.replace(/"/g, "").trim());
  const iDate = head.indexOf("Date");
  const iShort = head.indexOf("3 Mo");
  const iLong = head.indexOf("10 Yr");
  return lines.slice(1).map((l) => {
    const c = l.split(",").map((x) => x.replace(/"/g, "").trim());
    const [m, d, y] = (c[iDate] ?? "").split("/");
    const num = (i: number) => (i >= 0 && c[i] !== "" && !Number.isNaN(Number(c[i])) ? Number(c[i]) : undefined);
    return { date: `${y}-${m}-${d}`, short: num(iShort), long: num(iLong) };
  });
}

async function treasuryYear(year: number) {
  const url = `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/${year}/all?type=daily_treasury_yield_curve&field_tdr_date_value=${year}&page&_format=csv`;
  return parseTreasuryCsv(await (await get(url)).text());
}

async function rates(): Promise<Indicator[]> {
  const now = new Date();
  const [thisYear, lastYear] = await Promise.all([treasuryYear(now.getUTCFullYear()), treasuryYear(now.getUTCFullYear() - 1)]);
  const all = [...thisYear, ...lastYear].filter((r) => r.date.length === 10).sort((a, b) => b.date.localeCompare(a.date));
  const latest = all.find((r) => r.short !== undefined && r.long !== undefined);
  if (!latest) return [];
  const target = new Date(Date.parse(latest.date) - 365 * 86_400_000).toISOString().slice(0, 10);
  const ago = all.find((r) => r.date <= target && r.short !== undefined);
  const source = { name: "US Treasury", url: "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=daily_treasury_yield_curve" };
  return [
    { id: "short-rate", value: latest.short!, yearAgo: ago?.short, date: latest.date, source },
    { id: "long-rate", value: latest.long!, yearAgo: ago?.long, date: latest.date, source },
  ];
}

type BlsSeries = { seriesID: string; data: { year: string; period: string; value: string }[] };

/** BLS monthly series, newest first. Exported for tests. */
export function blsPoints(s: BlsSeries): { date: string; value: number }[] {
  return s.data
    .filter((d) => /^M(0[1-9]|1[0-2])$/.test(d.period) && d.value !== "-")
    .map((d) => ({ date: `${d.year}-${d.period.slice(1)}-01`, value: Number(d.value) }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

async function bls(): Promise<Indicator[]> {
  const res = await get("https://api.bls.gov/publicAPI/v1/timeseries/data/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seriesid: ["CUUR0000SA0", "LNS14000000"] }),
  });
  const json = (await res.json()) as { status: string; Results?: { series: BlsSeries[] } };
  if (json.status !== "REQUEST_SUCCEEDED" || !json.Results) throw new Error(`BLS: ${json.status}`);
  const out: Indicator[] = [];
  const source = (id: string) => ({ name: "US Bureau of Labor Statistics", url: `https://data.bls.gov/timeseries/${id}` });
  const cpi = json.Results.series.find((s) => s.seriesID === "CUUR0000SA0");
  if (cpi) {
    const p = blsPoints(cpi);
    const yoy = (i: number) => {
      const prior = p.find((x) => x.date === `${Number(p[i].date.slice(0, 4)) - 1}${p[i].date.slice(4)}`);
      return prior ? Math.round((p[i].value / prior.value - 1) * 1000) / 10 : undefined;
    };
    const now = p.length ? yoy(0) : undefined;
    const twelve = p.findIndex((x) => x.date === `${Number(p[0]?.date.slice(0, 4)) - 1}${p[0]?.date.slice(4)}`);
    if (now !== undefined) out.push({ id: "inflation", value: now, yearAgo: twelve >= 0 ? yoy(twelve) : undefined, date: p[0].date, source: source("CUUR0000SA0") });
  }
  const un = json.Results.series.find((s) => s.seriesID === "LNS14000000");
  if (un) {
    const p = blsPoints(un);
    if (p.length) {
      const prior = p.find((x) => x.date === `${Number(p[0].date.slice(0, 4)) - 1}${p[0].date.slice(4)}`);
      out.push({ id: "unemployment", value: p[0].value, yearAgo: prior?.value, date: p[0].date, source: source("LNS14000000") });
    }
  }
  return out;
}

/** Everything that could be fetched, without the website's cache (used by scripts). */
export async function fetchMacro(): Promise<Indicator[]> {
  const parts = await Promise.allSettled([rates(), bls()]);
  for (const p of parts) if (p.status === "rejected") console.warn("Economy data unavailable:", (p.reason as Error)?.message ?? p.reason);
  return parts.flatMap((p) => (p.status === "fulfilled" ? p.value : []));
}

export async function getMacro(): Promise<Indicator[]> {
  "use cache";
  cacheLife("days");
  cacheTag("macro");
  return fetchMacro();
}
