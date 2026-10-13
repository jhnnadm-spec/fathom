/**
 * GET /stock/AAPL/pdf → the company report as a PDF file to download.
 */
import { renderToBuffer } from "@react-pdf/renderer";
import { explanationState } from "@/lib/explain/ondemand";
import { ReportPdf } from "@/lib/pdf/ReportPdf";
import { getCompanyReport } from "@/lib/report/company";

export async function GET(req: Request, ctx: RouteContext<"/stock/[ticker]/pdf">) {
  const { ticker } = await ctx.params;
  const t = decodeURIComponent(ticker).toUpperCase();
  const report = /^[A-Z0-9.-]{1,10}$/.test(t) ? await getCompanyReport(t) : null;
  if (!report) return new Response("Company not found", { status: 404 });
  if (!report.support.supported) return new Response("Fathom doesn't cover this company yet", { status: 400 });

  const { explanation } = await explanationState(report.company.ticker, report.explanationKey);
  const createdAt = new Date();
  const pageUrl = new URL(`/stock/${encodeURIComponent(report.company.ticker)}`, req.url).toString();

  const pdf = await renderToBuffer(ReportPdf({ report, explanation, pageUrl, createdAt }));
  const filename = `Fathom-${report.company.ticker}-${createdAt.toISOString().slice(0, 10)}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
