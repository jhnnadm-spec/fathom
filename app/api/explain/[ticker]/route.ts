/**
 * GET  /api/explain/AAPL  → is an explanation ready, being written, or queued?
 * POST /api/explain/AAPL  → ask Fathom to write one (within the daily limits).
 */
import { headers } from "next/headers";
import { after, NextResponse } from "next/server";
import { explanationState, requestExplanation, storeIsEnabled, visitorId } from "@/lib/explain/ondemand";
import { getCompanyReport } from "@/lib/report/company";

// Writing an explanation takes a minute or two; this is the most Vercel's free plan allows.
export const maxDuration = 300;

async function company(ctx: RouteContext<"/api/explain/[ticker]">) {
  const { ticker } = await ctx.params;
  const t = decodeURIComponent(ticker).toUpperCase();
  if (!/^[A-Z0-9.-]{1,10}$/.test(t)) return null;
  return getCompanyReport(t);
}

export async function GET(_req: Request, ctx: RouteContext<"/api/explain/[ticker]">) {
  const report = await company(ctx);
  if (!report) return NextResponse.json({ error: "Company not found" }, { status: 404 });
  const state = await explanationState(report.company.ticker, report.explanationKey);
  return NextResponse.json({ status: state.status, stale: state.stale ?? false });
}

export async function POST(_req: Request, ctx: RouteContext<"/api/explain/[ticker]">) {
  if (!storeIsEnabled()) return NextResponse.json({ result: "unavailable" }, { status: 503 });
  const report = await company(ctx);
  if (!report) return NextResponse.json({ error: "Company not found" }, { status: 404 });
  if (!report.support.supported) return NextResponse.json({ result: "unsupported" }, { status: 400 });

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  const visitor = visitorId(ip, h.get("user-agent") ?? "");

  try {
    const { result, write } = await requestExplanation(report.company, report.explanationKey, visitor);
    if (result === "claimed") after(write); // keep writing after the reply is sent
    return NextResponse.json({ result });
  } catch (err) {
    console.error("explain request failed", err);
    return NextResponse.json({ result: "error" }, { status: 500 });
  }
}
