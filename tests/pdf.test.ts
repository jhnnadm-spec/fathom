import { renderToBuffer } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";
import { EXPLANATIONS } from "@/content/explanations";
import { ReportPdf } from "@/lib/pdf/ReportPdf";
import type { CompanyReport } from "@/lib/report/company";

const report: CompanyReport = {
  company: { name: "Apple Inc.", ticker: "AAPL", cik: "0000320193", industry: "Electronic Computers", sic: 3571, exchanges: ["Nasdaq"] },
  support: { supported: true } as CompanyReport["support"],
  annualReport: {
    form: "10-K",
    filingDate: "2025-10-31",
    periodEnd: "2025-09-27",
    url: "https://www.sec.gov/Archives/edgar/data/320193/000032019325000079/aapl-20250927.htm",
    indexUrl: "https://www.sec.gov/Archives/edgar/data/320193/000032019325000079/",
  },
  statements: [],
  announcements: [{ filingDate: "2026-07-30", events: ["Shared financial results"], url: "https://www.sec.gov/x.htm" }],
  tradingViewSymbol: "NASDAQ:AAPL",
  explanationKey: "",
  generatedAt: "2026-10-13T00:00:00Z",
};

describe("PDF download", () => {
  it("makes a PDF with and without an AI explanation", async () => {
    for (const explanation of [EXPLANATIONS.AAPL, undefined]) {
      const pdf = await renderToBuffer(
        ReportPdf({ report, explanation, pageUrl: "https://example.com/stock/AAPL", createdAt: new Date("2026-10-13") }),
      );
      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
      expect(pdf.length).toBeGreaterThan(10_000);
    }
  }, 30_000);
});
