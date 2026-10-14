/**
 * The one place that talks to SEC EDGAR.
 *
 * SEC rules (https://www.sec.gov/os/accessing-edgar-data):
 *  - every request must say who is asking (the User-Agent header)
 *  - no more than 10 requests per second. We stay at 5 to be safe.
 */
import { fromCache, toCache } from "../offline-cache";

const MIN_GAP_MS = 200; // 5 requests per second
const MAX_ATTEMPTS = 4;

export class SecError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly url?: string,
  ) {
    super(message);
    this.name = "SecError";
  }
}

function userAgent(): string {
  const ua = process.env.SEC_USER_AGENT?.trim();
  if (!ua) {
    throw new SecError(
      'SEC_USER_AGENT is not set. Add it as a secret, e.g. "Your Name you@example.com".',
    );
  }
  return ua;
}

// Requests wait in a single line so we never go faster than MIN_GAP_MS apart.
let queue: Promise<void> = Promise.resolve();
let lastRequestAt = 0;
function waitYourTurn(): Promise<void> {
  const turn = queue.then(async () => {
    const wait = lastRequestAt + MIN_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
  });
  queue = turn.catch(() => undefined);
  return turn;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Download a page or file from SEC as text. */
export async function secFetchText(url: string): Promise<string> {
  const cached = await fromCache(url);
  if (cached !== undefined) return cached;

  const headers = { "User-Agent": userAgent(), "Accept-Encoding": "gzip, deflate" };
  let lastStatus: number | undefined;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    await waitYourTurn();
    let res: Response;
    try {
      res = await fetch(url, { headers });
    } catch (err) {
      // Network hiccup: wait and try again.
      if (attempt === MAX_ATTEMPTS - 1) {
        throw new SecError(`Could not reach SEC: ${(err as Error).message}`, undefined, url);
      }
      await sleep(1000 * 2 ** attempt);
      continue;
    }

    if (res.ok) {
      const body = await res.text();
      await toCache(url, body);
      return body;
    }

    lastStatus = res.status;
    // 429 = too many requests, 5xx = SEC having trouble. Both are worth a retry.
    if (res.status === 429 || res.status >= 500) {
      await sleep(1000 * 2 ** attempt);
      continue;
    }
    throw new SecError(`SEC returned ${res.status} for ${url}`, res.status, url);
  }
  throw new SecError(`SEC kept failing (last status ${lastStatus})`, lastStatus, url);
}

/** Download and read a JSON file from SEC. */
export async function secFetchJson<T = unknown>(url: string): Promise<T> {
  const text = await secFetchText(url);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new SecError(`SEC sent something that is not JSON for ${url}`, undefined, url);
  }
}

/** SEC's company ID (CIK) is written with 10 digits in some web addresses. */
export function padCik(cik: string | number): string {
  return String(cik).replace(/^0+/, "").padStart(10, "0");
}

export const SEC_URLS = {
  tickers: "https://www.sec.gov/files/company_tickers.json",
  submissions: (cik: string | number) =>
    `https://data.sec.gov/submissions/CIK${padCik(cik)}.json`,
  companyFacts: (cik: string | number) =>
    `https://data.sec.gov/api/xbrl/companyfacts/CIK${padCik(cik)}.json`,
  /** Address of one document inside a filing. */
  document: (cik: string | number, accessionNumber: string, fileName: string) =>
    `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accessionNumber.replace(/-/g, "")}/${fileName}`,
  /** The filing's index page, listing all its documents. */
  filingIndex: (cik: string | number, accessionNumber: string) =>
    `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accessionNumber.replace(/-/g, "")}/${accessionNumber}-index.htm`,
};
