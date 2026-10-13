/**
 * Saving and loading AI explanations in Supabase.
 *
 * Only Fathom's server talks to the database, using the secret key in
 * SUPABASE_SECRET_KEY. If Supabase isn't set up, Fathom still works: it just
 * can't write explanations on demand.
 */
import type { SavedExplanation } from "../explain/types";

export type StoredExplanation = {
  ticker: string;
  status: "none" | "working" | "ready" | "failed";
  data: SavedExplanation | null;
  filings_key: string | null;
  queued: boolean;
  attempts: number;
  last_error: string | null;
  updated_at: string;
};

export type ClaimResult = "claimed" | "already-ready" | "already-working" | "visitor-limit" | "queued";

function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY;
  return url && key ? { url, key } : undefined;
}

export function storeEnabled(): boolean {
  return Boolean(config());
}

async function call(path: string, init: RequestInit = {}): Promise<unknown> {
  const c = config();
  if (!c) throw new Error("Supabase is not set up (SUPABASE_URL and SUPABASE_SECRET_KEY)");
  const res = await fetch(`${c.url}/rest/v1/${path}`, {
    signal: AbortSignal.timeout(8000), // never let a slow database hold up a page
    ...init,
    cache: "no-store",
    headers: {
      apikey: c.key, // Supabase secret keys go in the apikey header, not as a Bearer token
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase returned ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

export async function getStored(ticker: string): Promise<StoredExplanation | null> {
  if (!storeEnabled()) return null;
  const rows = (await call(`explanations?ticker=eq.${encodeURIComponent(ticker)}&select=*`)) as StoredExplanation[];
  return rows[0] ?? null;
}

export async function claim(args: {
  ticker: string;
  filingsKey: string;
  dailyLimit: number;
  visitor?: string;
  visitorLimit?: number;
}): Promise<ClaimResult> {
  return (await call("rpc/claim_explanation", {
    method: "POST",
    body: JSON.stringify({
      p_ticker: args.ticker,
      p_filings_key: args.filingsKey,
      p_daily_limit: args.dailyLimit,
      p_visitor: args.visitor ?? null,
      p_visitor_limit: args.visitorLimit ?? 3,
    }),
  })) as ClaimResult;
}

export async function saveReady(ticker: string, data: SavedExplanation, filingsKey: string): Promise<void> {
  await call(`explanations?ticker=eq.${encodeURIComponent(ticker)}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "ready",
      data,
      filings_key: filingsKey,
      queued: false,
      attempts: 0,
      last_error: null,
      updated_at: new Date().toISOString(),
    }),
  });
}

/** Seed a row from an explanation bundled with the app, without overwriting anything newer. */
export async function seedReady(ticker: string, data: SavedExplanation, filingsKey: string): Promise<void> {
  await call("explanations?on_conflict=ticker", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates" },
    body: JSON.stringify({ ticker, status: "ready", data, filings_key: filingsKey, updated_at: data.generatedAt }),
  });
}

export async function saveFailure(ticker: string, error: string, retry: boolean): Promise<void> {
  await call(`explanations?ticker=eq.${encodeURIComponent(ticker)}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "failed", last_error: error.slice(0, 500), queued: retry, updated_at: new Date().toISOString() }),
  });
}

export async function markQueued(ticker: string): Promise<void> {
  await call(`explanations?ticker=eq.${encodeURIComponent(ticker)}`, {
    method: "PATCH",
    body: JSON.stringify({ queued: true, updated_at: new Date().toISOString() }),
  });
}

/**
 * Companies waiting to be written, oldest request first: those queued, plus any
 * whose writing stopped part-way (still "working" after 15 minutes).
 */
export async function listQueued(limit = 20): Promise<StoredExplanation[]> {
  const stuck = new Date(Date.now() - 15 * 60_000).toISOString();
  const filter = `or=(queued.is.true,and(status.eq.working,updated_at.lt.${stuck}))`;
  return (await call(`explanations?${filter}&attempts=lt.4&order=updated_at.asc&limit=${limit}&select=*`)) as StoredExplanation[];
}

/** All ready explanations, to check whether any company has filed a newer report. */
export async function listReady(): Promise<Pick<StoredExplanation, "ticker" | "filings_key">[]> {
  return (await call("explanations?status=eq.ready&select=ticker,filings_key")) as Pick<StoredExplanation, "ticker" | "filings_key">[];
}
