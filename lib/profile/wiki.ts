/**
 * Background facts about a company from Wikimedia, used where the SEC reports
 * don't say (who runs it, when it was founded, where it's based, how many people work there).
 *
 *  - Wikidata facts are CC0: free for anyone to reuse, no conditions.
 *  - The Wikipedia introduction is CC BY-SA 4.0: it may be reused with credit and
 *    a link to the licence, which the page shows next to it.
 *
 *  - The logo and photos come from Wikimedia Commons, where every file is free to
 *    reuse under its licence. Photos are shown with their author and licence.
 *
 * Both are edited by volunteers, so Fathom labels them as background and never
 * uses them for financial figures. If Wikimedia can't be reached, nothing is shown.
 */
import { cacheLife, cacheTag } from "next/cache";
import { fromCache, toCache } from "../offline-cache";

export type CompanyProfile = {
  wikidataUrl: string;
  ceo?: string;
  founded?: string; // year
  founders?: string[];
  headquarters?: string;
  employees?: { count: number; asOf?: string }; // asOf: year
  website?: string;
  logo?: string; // the company's logo from Wikimedia Commons, as an image address
  wikipedia?: { title: string; url: string; extract: string };
  photos?: Photo[]; // freely licensed photos from the company's Wikipedia article
};

/** A photo from Wikimedia Commons, with what the licence asks us to show. */
export type Photo = {
  src: string;
  width: number;
  height: number;
  caption?: string;
  credit: string; // the author, as Commons names them
  license?: string; // e.g. "CC BY-SA 4.0"
  page: string; // the photo's page on Commons, with the full licence
};

const UA = "Fathom/1.0 (plain-English company explainer; https://github.com/jhnnadm-spec/fathom)";

async function getJson(url: string): Promise<unknown> {
  const cached = await fromCache(url);
  if (cached !== undefined) return JSON.parse(cached);
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`${res.status} from ${new URL(url).host}`);
  const body = await res.text();
  await toCache(url, body);
  return JSON.parse(body);
}

type Binding = Record<string, { value: string } | undefined>;

/** One query to Wikidata, finding the company by its SEC number (Wikidata property P5531). */
export function query(cik: string): string {
  const padded = cik.padStart(10, "0");
  const plain = String(Number(cik));
  return `
SELECT ?item ?ceoLabel ?inception ?hqLabel ?founderLabel ?employees ?empDate ?website ?logo ?article WHERE {
  VALUES ?cik { "${padded}" "${plain}" }
  ?item wdt:P5531 ?cik .
  OPTIONAL { ?item p:P169 ?ceoSt . ?ceoSt ps:P169 ?ceo . FILTER NOT EXISTS { ?ceoSt pq:P582 ?ceoEnd } }
  OPTIONAL { ?item wdt:P571 ?inception }
  OPTIONAL { ?item wdt:P159 ?hq }
  OPTIONAL { ?item wdt:P112 ?founder }
  OPTIONAL { ?item p:P1128 ?empSt . ?empSt ps:P1128 ?employees . OPTIONAL { ?empSt pq:P585 ?empDate } }
  OPTIONAL { ?item wdt:P856 ?website }
  OPTIONAL { ?item p:P154 ?logoSt . ?logoSt ps:P154 ?logo . FILTER NOT EXISTS { ?logoSt pq:P582 ?logoEnd } }
  OPTIONAL { ?article schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT 1000`;
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
  // Some companies list several websites (one per country); prefer the main ".com" one.
  const sites = uniq("website").filter((u) => /^https?:\/\//.test(u));
  const host = (u: string) => new URL(u).hostname.replace(/^www\./, "");
  const website = sites.sort((a, b) => Number(host(b).endsWith(".com")) - Number(host(a).endsWith(".com")) || host(a).split(".").length - host(b).split(".").length)[0];
  return {
    wikidataUrl: item.replace("http://", "https://"),
    ceo: ceos.length === 1 ? ceos[0] : undefined, // more than one current CEO listed means the data is unclear: leave it out
    founded: inception?.replace(/^\+/, "").slice(0, 4),
    founders: founders.length > 0 && founders.length <= 4 ? founders : undefined,
    headquarters: hq.length === 1 ? hq[0] : undefined,
    employees,
    website,
    logo: logoUrl(uniq("logo")[0]),
    article: uniq("article")[0],
  };
}

/** Wikidata gives a Commons file address; ask Commons for a small, sharp copy of it. */
export function logoUrl(file?: string): string | undefined {
  if (!file || !/Special:FilePath\//.test(file)) return undefined;
  return `${file.replace(/^http:/, "https:")}?width=256`;
}

// ---------------------------------------------------------------- photos

/** The Wikipedia API addresses used for photos (exported so previews can be seeded). */
export function imagesUrl(title: string): string {
  return `https://en.wikipedia.org/w/api.php?action=parse&format=json&formatversion=2&redirects=1&prop=images&page=${encodeURIComponent(title)}`;
}
export function imageInfoUrl(names: string[]): string {
  const titles = names.map((n) => `File:${n.replace(/_/g, " ")}`).join("|");
  return `https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=960&iiextmetadatafilter=Artist|LicenseShortName|ImageDescription&titles=${encodeURIComponent(titles)}`;
}

/** Files in an article that are almost never photos of the company: logos, maps, flags, charts and the like. */
const NOT_A_PHOTO =
  /(^|[^a-z])(logos?|icons?|flags?|maps?|seals?|signatures?|coat[_ ]of[_ ]arms|emblems?|charts?|graphs?|diagrams?|symbols?|wordmarks?|banners?|stock[_ ]price|portal|question[_ ]book|ambox|nuvola|padlock|wiki[a-z]*)([^a-z]|$)/i;

/** Which of an article's files might be photos, in the order they appear. Exported for tests. */
export function photoCandidates(names: string[]): string[] {
  return names.filter((n) => /\.(jpe?g)$/i.test(n) && !NOT_A_PHOTO.test(n)).slice(0, 12);
}

type InfoPage = {
  title: string;
  imagerepository?: string;
  imageinfo?: {
    width: number;
    height: number;
    mime: string;
    thumburl?: string;
    thumbwidth?: number;
    thumbheight?: number;
    descriptionurl: string;
    extmetadata?: Record<string, { value?: string } | undefined>;
  }[];
};

/** Plain text from the small bits of HTML Commons uses in its descriptions. */
function plain(html?: string): string {
  return (html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** A short caption: the first sentence of the description, if it's short enough to read at a glance. */
function shortCaption(text: string): string | undefined {
  const first = text.split(/(?<=[.!?])\s/)[0]?.trim();
  if (!first || first.length < 8) return undefined;
  return first.length > 110 ? undefined : first.replace(/\.$/, "");
}

/**
 * The photos worth showing: only files shared from Commons (so they're freely licensed),
 * real photos of a decent size and a normal shape, in the article's order. Exported for tests.
 */
export function pickPhotos(candidates: string[], pages: InfoPage[], max = 4): Photo[] {
  const byTitle = new Map(pages.map((p) => [p.title, p]));
  const photos: Photo[] = [];
  for (const name of candidates) {
    const page = byTitle.get(`File:${name.replace(/_/g, " ")}`);
    const info = page?.imageinfo?.[0];
    if (!page || page.imagerepository !== "shared" || !info || info.mime !== "image/jpeg") continue;
    const ratio = info.width / info.height;
    if (info.width < 640 || info.height < 400 || ratio < 0.65 || ratio > 2.4) continue;
    const meta = info.extmetadata ?? {};
    const author = plain(meta.Artist?.value);
    photos.push({
      src: info.thumburl ?? "",
      width: info.thumbwidth ?? info.width,
      height: info.thumbheight ?? info.height,
      caption: shortCaption(plain(meta.ImageDescription?.value)),
      credit: author && author.length <= 60 ? author : "Wikimedia Commons contributor",
      license: plain(meta.LicenseShortName?.value) || undefined,
      page: info.descriptionurl,
    });
    if (photos.length >= max) break;
  }
  return photos.filter((p) => p.src);
}

async function fetchPhotos(title: string): Promise<Photo[]> {
  try {
    const parsed = (await getJson(imagesUrl(title))) as { parse?: { images?: string[] } };
    const candidates = photoCandidates(parsed.parse?.images ?? []);
    if (candidates.length === 0) return [];
    const info = (await getJson(imageInfoUrl(candidates))) as { query?: { pages?: InfoPage[] } };
    return pickPhotos(candidates, info.query?.pages ?? []);
  } catch {
    return []; // photos are a nice extra; the page works without them
  }
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
      const title = decodeURIComponent(article.split("/wiki/")[1] ?? "");
      const [wikipedia, photos] = await Promise.all([fetchSummary(title, article), fetchPhotos(title)]);
      return { ...profile, wikipedia, photos: photos.length > 0 ? photos : undefined };
    }
    return profile;
  } catch {
    return undefined;
  }
}

/** The opening of the Wikipedia article, or nothing if it can't be had. */
async function fetchSummary(title: string, article: string): Promise<CompanyProfile["wikipedia"]> {
  try {
    const summary = (await getJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)) as {
      title: string;
      extract?: string;
      type?: string;
      content_urls?: { desktop?: { page?: string } };
    };
    if (summary.extract && summary.type !== "disambiguation") {
      return { title: summary.title, url: summary.content_urls?.desktop?.page ?? article, extract: summary.extract };
    }
  } catch {
    // The facts are still useful without the introduction.
  }
  return undefined;
}
