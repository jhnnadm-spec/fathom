/**
 * GET /api/lens/fundamental?t=KO        → the Fundamental lens for one company, as JSON
 * GET /api/lens/fundamental?t=KO,PEP    → several companies
 * GET /api/lens/compare?t=KO,PEP        → the side-by-side comparison (2 to 5 companies)
 *
 * The same structured results the pages show: figures with periods, currencies and
 * sources, and plain-English summaries built from them.
 */
import { NextResponse } from "next/server";
import { buildComparison, MIN_COMPANIES, parseTickers } from "@/lib/compare/compare";
import { fundamentalLens } from "@/lib/lens/fundamental";

const LENSES = { fundamental: fundamentalLens } as const;

export async function GET(req: Request, ctx: RouteContext<"/api/lens/[lens]">) {
  const { lens } = await ctx.params;
  const tickers = parseTickers(new URL(req.url).searchParams.get("t") ?? "");
  if (tickers.length === 0) return NextResponse.json({ error: "Add one or more tickers, like ?t=KO,PEP" }, { status: 400 });

  const run = async (t: string) => {
    try {
      return await fundamentalLens.run(t, "US");
    } catch {
      return null;
    }
  };

  if (lens === "compare") {
    const results = await Promise.all(tickers.map(run));
    const found = results.filter((r) => r !== null);
    const missing = tickers.filter((_, i) => !results[i]);
    if (found.length < MIN_COMPANIES) return NextResponse.json({ error: "Fathom needs at least two companies it can explain to compare.", missing }, { status: 400 });
    return NextResponse.json({ ...buildComparison(found), missing, disclaimer: "For information only. Not investment advice." });
  }

  if (!(lens in LENSES)) return NextResponse.json({ error: `No lens called "${lens}" yet. Available: ${Object.keys(LENSES).join(", ")}, compare.` }, { status: 404 });
  const results = await Promise.all(tickers.map(run));
  return NextResponse.json({
    results: results.filter(Boolean),
    missing: tickers.filter((_, i) => !results[i]),
    disclaimer: "For information only. Not investment advice.",
  });
}
