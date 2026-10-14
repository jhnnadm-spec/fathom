/**
 * Explanations on demand: when a visitor asks for a company that doesn't have
 * one yet, check the limits, then write it in the background.
 */
import { createHash } from "node:crypto";
import { EXPLANATIONS } from "@/content/explanations";
import { claim, getStored, saveFailure, saveReady, seedReady, storeEnabled, type ClaimResult } from "../store/explanations";
import { generateExplanation } from "./generate";
import type { SavedExplanation } from "./types";

/** How many new explanations may be written per day (UTC), to stay inside the free AI allowance. */
export const DAILY_LIMIT = Number(process.env.EXPLAIN_DAILY_LIMIT ?? 6);
/** How many new companies one visitor may ask for in 24 hours. */
export const VISITOR_LIMIT = Number(process.env.EXPLAIN_VISITOR_LIMIT ?? 3);

export type ExplanationState = {
  status: "ready" | "working" | "queued" | "failed" | "none" | "unavailable";
  explanation?: SavedExplanation;
  stale?: boolean; // a newer report exists than the one the explanation was written from
};

/** What the page should show: a saved explanation (newest first), and whether one is being written. */
export async function explanationState(ticker: string, currentKey?: string): Promise<ExplanationState> {
  const bundled = EXPLANATIONS[ticker];
  let stored = null;
  try {
    stored = await getStored(ticker);
  } catch {
    // If the database can't be reached, fall back to what's bundled with the app.
  }
  // A bundled copy from the same run (or later) is the reviewed one, with any editorial fixes, so it wins.
  const useBundled = Boolean(bundled && (!stored?.data || bundled.generatedAt >= stored.data.generatedAt));
  const explanation = useBundled ? bundled : (stored?.data ?? undefined);
  const writtenFrom = useBundled ? bundledKey(bundled!) : (stored?.filings_key ?? undefined);
  const stale = Boolean(explanation && currentKey && writtenFrom && writtenFrom !== currentKey);

  if (!storeEnabled()) return { status: explanation ? "ready" : "unavailable", explanation };
  if (stored?.status === "working" && Date.parse(stored.updated_at) > Date.now() - 10 * 60_000) {
    return { status: "working", explanation, stale };
  }
  if (stored?.queued) return { status: "queued", explanation, stale };
  if (explanation) return { status: "ready", explanation, stale };
  if (stored?.status === "failed") return { status: "failed" };
  return { status: "none" };
}

/** A one-way fingerprint of the visitor, so limits work without storing who they are. */
export function visitorId(ip: string, userAgent: string): string {
  const salt = process.env.VISITOR_SALT ?? "fathom";
  return createHash("sha256").update(`${salt}|${ip}|${userAgent}`).digest("hex").slice(0, 32);
}

/**
 * Ask for an explanation. Returns what happened; when the answer is "claimed",
 * the caller should run `write()` in the background.
 */
export async function requestExplanation(
  company: { cik: string; ticker: string },
  key: string,
  visitor?: string,
): Promise<{ result: ClaimResult; write: () => Promise<void> }> {

  // Companies bundled with the app are copied into the database first, so they aren't rewritten needlessly.
  const bundled = EXPLANATIONS[company.ticker];
  if (bundled) await seedReady(company.ticker, bundled, bundledKey(bundled));

  const result = await claim({ ticker: company.ticker, filingsKey: key, dailyLimit: DAILY_LIMIT, visitor, visitorLimit: VISITOR_LIMIT });
  return {
    result,
    write: async () => {
      try {
        const { explanation, filingsKey: writtenKey } = await generateExplanation(company);
        await saveReady(company.ticker, explanation, writtenKey);
      } catch (err) {
        await saveFailure(company.ticker, (err as Error).message, true);
      }
    },
  };
}

/** The "which reports" key for an explanation bundled with the app, read from its source links. */
export function bundledKey(e: SavedExplanation): string {
  const accession = (url: string) => {
    const m = url.match(/\/(\d{18})\//);
    return m ? `${m[1].slice(0, 10)}-${m[1].slice(10, 12)}-${m[1].slice(12)}` : undefined;
  };
  const k = e.sources.find((s) => s.form === "10-K");
  const q = e.sources.find((s) => s.form === "10-Q");
  return [k && accession(k.url), q && accession(q.url)].filter(Boolean).join("+");
}

export function storeIsEnabled() {
  return storeEnabled();
}
