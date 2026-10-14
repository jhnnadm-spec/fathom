/**
 * Background facts about a company from Wikimedia, used where the SEC reports
 * don't say (who runs it, when it was founded, where it's based, how many people work there).
 *
 *  - Wikidata facts are CC0: free for anyone to reuse, no conditions.
 *  - The Wikipedia introduction is CC BY-SA 4.0: it may be reused with credit and
 *    a link to the licence, which the page shows next to it.
 *
 * Both are edited by volunteers, so Fathom labels them as background and never
 * uses them for financial figures. If Wikimedia can't be reached, nothing is shown.
 */
import { cacheLife, cacheTag } from "next/cache";

export type CompanyProfile = {
  wikidataUrl: string;
  ceo?: string;
  founded?: string; // year
  founders?: string[];
  headquarters?: string;
  employees?: { count: number; asOf?: string }; // asOf: year
  website?: string;
  wikipedia?: { title: string; url: string; extract: string };
};

const UA = "Fathom/1.0 (plain-English company explainer; https://github.com/jhnnadm-spec/fathom)";

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`${res.status} from ${new URL(url).host}`);
  return res.json();
}

type Binding = Record<string, { value: string } | undefined>;

/** One query to Wikidata, finding the company by its SEC number (Wikidata property P5531). */
function query(cik: string): string {
  const padded = cik.padStart(10, "0");
  const plain = String(Number(cik));
  return `
SELECT ?item ?ceoLabel ?inception ?hqLabel ?founderLabel ?employees ?empDate ?website ?article WHERE {
  VALUES ?cik { "${padded}" "${plain}" }
  ?item wdt:P5531 ?cik .
  OPTIONAL { ?item p:P169 ?ceoSt . ?ceoSt ps:P169 ?ceo . FILTER NOT EXISTS { ?ceoSt pq:P582 ?ceoEnd } }
  OPTIONAL { ?item wdt:P571 ?inception }
  OPTIONAL { ?item wdt:P159 ?hq }
  OPTIONAL { ?item wdt:P112 ?founder }
  OPTIONAL { ?item p:P1128 ?empSt . ?empSt ps:P1128 ?employees . OPTIONAL { ?empSt pq:P585 ?empDate } }
  OPTIONAL { ?item wdt:P856 ?website }
  OPTIONAL { ?article schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT 200`;
}

/** Turn Wikidata's rows into one tidy profile. Exported for tests. */
export function parseProfile(rows: Binding[]): Omit<CompanyProfile, "wikipedia"> & { article?: string } | undefined {
  if (rows.length === 0) return undefined;
  const v = (r: Binding, k: string) => r[k]?.value;
  // Several companies can share an old SEC number; keep the first item only.
  const item = v(rows[0], "item")!;
  const mine = rows.filter((r) => v(r, "item") === item);
  const uniq = (k: string) => [...new Set(mine.map((r) => v(r, k)).filter((x): x is string => Boolean(x) && !/^Q\d+$/.test(x!)))];

  const ceos = uniq("ceoLabel");
  const inception = uniq("inception").sort()[0];
  const hq = uniq("hqLabel");
  const founders = uniq("founderLabel");
  let employees: CompanyProfile["employees"];
  for (const r of mine) {
    const count = Number(v(r, "employees"));
    if (!Number.isFinite(count) || count <= 0) continue;
    const date = v(r, "empDate");
    if (!employees || (date && (!employees.asOf || date.slice(0, 4) > employees.asOf))) {
      employees = { count: Math.round(count), asOf: date?.slice(0, 4) };
    }
  }
  const website = uniq("website")[0];
  return {
    wikidataUrl: item.replace("http://", "https://"),
    ceo: ceos.length === 1 ? ceos[0] : undefined, // more than one current CEO listed means the data is unclear: leave it out
    founded: inception?.replace(/^\+/, "").slice(0, 4),
    founders: founders.length > 0 && founders.length <= 4 ? founders : undefined,
    headquarters: hq.length === 1 ? hq[0] : undefined,
    employees,
    website: website && /^https?:\/\//.test(website) ? website : undefined,
    article: uniq("article")[0],
  };
}

/** Background facts for a company, or undefined when Wikimedia has none or can't be reached. */
export async function getCompanyProfile(cik: string): Promise<CompanyProfile | undefined> {
  "use cache";
  cacheLife("days");
  cacheTag(`profile:${cik}`);
  return fetchCompanyProfile(cik);
}

/** The same, without the website's cache (used by scripts). */
export async function fetchCompanyProfile(cik: string): Promise<CompanyProfile | undefined> {
  try {
    const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query(cik))}`;
    const data = (await getJson(url)) as { results: { bindings: Binding[] } };
    const parsed = parseProfile(data.results.bindings);
    if (!parsed) return undefined;
    const { article, ...profile } = parsed;
    if (article) {
      try {
        const title = decodeURIComponent(article.split("/wiki/")[1] ?? "");
        const summary = (await getJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)) as {
          title: string;
          extract?: string;
          type?: string;
          content_urls?: { desktop?: { page?: string } };
        };
        if (summary.extract && summary.type !== "disambiguation") {
          return { ...profile, wikipedia: { title: summary.title, url: summary.content_urls?.desktop?.page ?? article, extract: summary.extract } };
        }
      } catch {
        // The facts are still useful without the introduction.
      }
    }
    return profile;
  } catch {
    return undefined;
  }
}
