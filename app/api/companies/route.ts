/** GET /api/companies?q=coca → up to 8 matching US-listed companies, for the comparison picker. */
import { NextResponse } from "next/server";
import { displayName, searchCompanies } from "@/lib/report/company";

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < 1) return NextResponse.json({ companies: [] });
  try {
    const found = await searchCompanies(q);
    return NextResponse.json({ companies: found.slice(0, 8).map((c) => ({ ticker: c.ticker, name: displayName(c.name) })) });
  } catch {
    return NextResponse.json({ companies: [] }, { status: 503 });
  }
}
