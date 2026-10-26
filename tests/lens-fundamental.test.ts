import { describe, expect, it } from "vitest";
import { buildComparison, markExtremes, parseTickers, type CompareCell } from "@/lib/compare/compare";
import { computeNumbers } from "@/lib/financials/metrics";
import { fundamentalFigures, fundamentalFromReport } from "@/lib/lens/fundamental";
import type { Figure } from "@/lib/lens/types";
import type { CompanyReport } from "@/lib/report/company";
import type { CompanyFacts, FactValue } from "@/lib/sec/facts";
import { parseSubmissions } from "@/lib/sec/filings";

// ---- A made-up company with round numbers you can check by hand (all in $ millions)
//
//   Sales 80 → 100 (growth 25%)       Gross profit 40 (margin 40%)
//   Operating income 20 (margin 20%)  Depreciation 5 (EBITDA 25)
//   Net income 10 (margin 10%)        Cash from operations 18, equipment 6 (free cash flow 12)
//   Cash 15, long-term debt 30 (net debt 15)
//   Equity 40 at the start of the year, 60 at the end (debt-to-equity 30 ÷ 60 = 0.5; ROE 10 ÷ 50 = 20%)
//   Current assets 50, current liabilities 25 (current ratio 2.0)     EPS $2.50

const M = 1e6;

function company(fye: "1231" | "0930") {
  const y = fye === "1231" ? { s: "2025-01-01", e: "2025-12-31", ps: "2024-01-01", pe: "2024-12-31", prev: "2024-12-31" } : { s: "2024-10-01", e: "2025-09-30", ps: "2023-10-01", pe: "2024-09-30", prev: "2024-09-30" };
  const filings = parseSubmissions({
    cik: fye === "1231" ? 1111 : 2222,
    name: fye === "1231" ? "Round Numbers Inc" : "Autumn Year Corp",
    fiscalYearEnd: fye,
    filings: {
      recent: {
        accessionNumber: ["0001-25-000009", "0001-24-000001"],
        form: ["10-K", "10-K"],
        filingDate: ["2026-02-20", "2025-02-20"],
        reportDate: [y.e, y.pe],
        primaryDocument: ["k25.htm", "k24.htm"],
      },
    },
  });
  const K = "0001-25-000009";
  const yr = (val: number, prev = false): FactValue => ({ start: prev ? y.ps : y.s, end: prev ? y.pe : y.e, val: val * M, accn: K, form: "10-K", filed: "2026-02-20", fp: "FY" });
  const on = (end: string, val: number): FactValue => ({ end, val: val * M, accn: K, form: "10-K", filed: "2026-02-20" });
  const tag = (values: FactValue[], unit = "USD") => ({ units: { [unit]: values } });
  return { filings, y, yr, on, tag };
}

function facts(c: ReturnType<typeof company>, change: (f: Record<string, FactValue[]>) => void = () => undefined, scale = 1): CompanyFacts {
  const { yr, on, y } = c;
  const f: Record<string, FactValue[]> = {
    Revenues: [yr(80 * scale, true), yr(100 * scale)],
    GrossProfit: [yr(40 * scale)],
    OperatingIncomeLoss: [yr(20 * scale)],
    DepreciationDepletionAndAmortization: [yr(5 * scale)],
    NetIncomeLoss: [yr(10 * scale)],
    NetCashProvidedByUsedInOperatingActivities: [yr(18 * scale)],
    PaymentsToAcquirePropertyPlantAndEquipment: [yr(6 * scale)],
    CashAndCashEquivalentsAtCarryingValue: [on(y.e, 15 * scale)],
    LongTermDebt: [on(y.e, 30 * scale)],
    StockholdersEquity: [on(y.prev, 40 * scale), on(y.e, 60 * scale)],
    AssetsCurrent: [on(y.e, 50 * scale)],
    LiabilitiesCurrent: [on(y.e, 25 * scale)],
  };
  change(f);
  const tags: CompanyFacts["facts"]["us-gaap"] = {};
  for (const [k, v] of Object.entries(f)) tags[k] = c.tag(v);
  tags.EarningsPerShareDiluted = c.tag([{ ...yr(0), val: 2.5 }], "USD/shares");
  return { cik: 1, entityName: "x", facts: { "us-gaap": tags } } as CompanyFacts;
}

function report(fye: "1231" | "0930", opts: { sic?: number; change?: (f: Record<string, FactValue[]>) => void; scale?: number; ticker?: string; name?: string } = {}): CompanyReport {
  const c = company(fye);
  return {
    company: { name: opts.name ?? c.filings.name, ticker: opts.ticker ?? (fye === "1231" ? "RND" : "AUT"), cik: c.filings.cik, industry: "", sic: opts.sic ?? 2080, exchanges: ["NYSE"], fiscalYearEnd: fye },
    support: { supported: true } as CompanyReport["support"],
    numbers: computeNumbers(facts(c, opts.change, opts.scale), c.filings),
    statements: [],
    announcements: [],
    tradingViewSymbol: "NYSE:RND",
    explanationKey: "",
    generatedAt: "2026-10-26T00:00:00Z",
  };
}

const value = (f: Figure) => (f.status === "reported" ? f.value : undefined);

describe("Fundamental lens: the sums, checked by hand", () => {
  const f = fundamentalFigures(report("1231").numbers!);

  it("works out growth and margins", () => {
    expect(value(f.revenue)).toBe(100 * M);
    expect(value(f.revenueGrowth)).toBeCloseTo(0.25);
    expect(value(f.grossMargin)).toBeCloseTo(0.4);
    expect(value(f.operatingMargin)).toBeCloseTo(0.2);
    expect(value(f.netMargin)).toBeCloseTo(0.1);
    expect(value(f.ebitda)).toBe(25 * M);
  });

  it("works out cash, debt and returns", () => {
    expect(value(f.operatingCashFlow)).toBe(18 * M);
    expect(value(f.freeCashFlow)).toBe(12 * M);
    expect(value(f.netDebt)).toBe(15 * M);
    expect(value(f.debtToEquity)).toBeCloseTo(0.5);
    expect(value(f.currentRatio)).toBeCloseTo(2);
    expect(value(f.returnOnEquity)).toBeCloseTo(0.2);
    expect(value(f.eps)).toBeCloseTo(2.5);
  });

  it("keeps the period, currency and source of every figure", () => {
    const g = f.grossMargin;
    expect(g.status).toBe("reported");
    if (g.status !== "reported") return;
    expect(g.currency).toBe("USD");
    expect(g.period).toEqual({ kind: "year", start: "2025-01-01", end: "2025-12-31" });
    expect(g.sources[0].url).toContain("sec.gov");
    const d = f.debtToEquity;
    expect(d.status === "reported" && d.period).toEqual({ kind: "date", end: "2025-12-31" });
  });

  it("leaves out ratios that need a share price, and says why", () => {
    expect(f.peRatio.status).toBe("needs-price");
    expect(f.evToEbitda.status).toBe("needs-price");
  });

  it("says 'not reported' instead of zero", () => {
    const g = fundamentalFigures(report("1231", { change: (x) => delete x.GrossProfit }).numbers!).grossMargin;
    expect(g).toEqual({ status: "not-reported", reason: "Not reported in its SEC filings." });
  });

  it("doesn't divide by owners' money below zero", () => {
    const n = report("1231", {
      change: (x) => {
        x.StockholdersEquity = [company("1231").on("2024-12-31", -5), company("1231").on("2025-12-31", -10)];
      },
    }).numbers!;
    const f2 = fundamentalFigures(n);
    expect(f2.debtToEquity.status).toBe("not-comparable");
    expect(f2.returnOnEquity.status).toBe("not-comparable");
  });
});

describe("Fundamental lens: plain-English output", () => {
  const r = fundamentalFromReport(report("1231"))!;

  it("returns the shared shape", () => {
    expect(r.lens).toBe("fundamental");
    expect(r.meta).toMatchObject({ company: "Round Numbers", currency: "USD", accountingStandard: "US GAAP", fiscalYearEnd: "1231" });
    expect(r.sources.length).toBeGreaterThan(0);
  });

  it("explains every row in everyday words", () => {
    for (const row of r.data.rows) {
      expect(row.meaning.length, row.id).toBeGreaterThan(40);
      if (row.figure.status === "reported") expect(row.reading, row.id).toBeTruthy();
    }
    const net = r.data.rows.find((x) => x.id === "netMargin")!;
    expect(net.reading).toBe("After every cost, including interest and tax, about $10 of every $100 of sales was left as profit.");
  });

  it("writes the summary from the figures", () => {
    expect(r.summary[0]).toBe("In the year to December 31, 2025, Round Numbers sold $100 million of goods and services, up 25% on the year before.");
    expect(r.summary.join(" ")).toContain("leaving $12 million after paying for buildings and equipment");
  });
});

describe("comparison", () => {
  it("reads tickers from a shared link", () => {
    expect(parseTickers("ko, pep,KO,brk.b")).toEqual(["KO", "PEP", "BRK-B"]);
    expect(parseTickers("A,B,C,D,E,F")).toHaveLength(5);
  });

  it("marks highest and lowest, and nothing when there's no real difference", () => {
    const f = (v?: number): Figure => (v === undefined ? { status: "not-reported", reason: "x" } : { status: "reported", value: v, unit: "ratio", currency: "USD", period: { kind: "date", end: "2025-12-31" }, sources: [] });
    const cells: CompareCell[] = [
      { ticker: "A", figure: f(1) },
      { ticker: "B", figure: f(3) },
      { ticker: "C", figure: f() },
    ];
    expect(markExtremes(cells).map((c) => c.mark)).toEqual(["lowest", "highest", undefined]);
    expect(markExtremes([{ ticker: "A", figure: f(2) }, { ticker: "B", figure: f(2) }]).map((c) => c.mark)).toEqual([undefined, undefined]);
    expect(markExtremes([{ ticker: "A", figure: f(2) }, { ticker: "B", figure: f() }]).map((c) => c.mark)).toEqual([undefined, undefined]);
  });

  it("warns when the figures aren't like for like", () => {
    const a = fundamentalFromReport(report("1231"))!;
    const b = fundamentalFromReport(report("0930", { sic: 7372 }))!;
    const kinds = buildComparison([a, b]).warnings.map((w) => w.kind);
    expect(kinds).toEqual(expect.arrayContaining(["fiscal-year", "period", "sector"]));
    const same = buildComparison([a, fundamentalFromReport(report("1231", { ticker: "TWO", scale: 2 }))!]);
    expect(same.warnings).toEqual([]);
  });

  it("describes differences without calling either better or worse", () => {
    const a = fundamentalFromReport(report("1231"))!;
    const b = fundamentalFromReport(report("1231", { ticker: "BIG", scale: 3, name: "Big Bottle Co" }))!;
    const c = buildComparison([a, b]);
    const sales = c.rows.find((r) => r.id === "revenue")!;
    expect(sales.cells.map((x) => x.mark)).toEqual(["lowest", "highest"]);
    expect(c.summary[0]).toBe("Big Bottle is the biggest by sales ($300 million); Round Numbers the smallest ($100 million).");
    expect(c.summary.join(" ")).not.toMatch(/better|worse/i);
    // Same margins at any size: no highest or lowest marked.
    expect(c.rows.find((r) => r.id === "netMargin")!.cells.every((x) => !x.mark)).toBe(true);
  });
});

describe("every figure explains itself", () => {
  it("has a dictionary entry with both sides for each ratio people compare", async () => {
    const { FUNDAMENTAL_METRICS } = await import("@/lib/lens/fundamental");
    const { lookupTerm } = await import("@/lib/glossary");
    for (const m of Object.values(FUNDAMENTAL_METRICS)) {
      const e = lookupTerm(m.term);
      expect(e, m.id).toBeTruthy();
      expect(e?.sides, m.id).toBeTruthy();
    }
  });
});
