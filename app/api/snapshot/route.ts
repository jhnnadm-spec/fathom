/**
 * GET /api/snapshot?t=AAPL,KO  → short summaries for watchlist cards.
 * GET /api/snapshot?t=AAPL,KO&light=1 → just names and news symbols.
 */
import { NextResponse } from "next/server";
import { getSnapshot, getSymbol } from "@/lib/report/snapshot";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tickers = [
    ...new Set(
      (url.searchParams.get("t") ?? "")
        .split(",")
        .map((t) => t.trim().toUpperCase())
        .filter((t) => /^[A-Z0-9.-]{1,10}$/.test(t)),
    ),
  ].slice(0, 20);
  const light = url.searchParams.get("light") === "1";
  const results = await Promise.all(
    tickers.map(async (t) => {
      try {
        return light ? await getSymbol(t) : await getSnapshot(t);
      } catch {
        return null;
      }
    }),
  );
  return NextResponse.json({ companies: results.filter(Boolean) });
}
