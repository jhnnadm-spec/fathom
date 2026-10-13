import { describe, expect, it } from "vitest";
import { formatDate, formatMoney, formatPercent, percentChange } from "@/lib/financials/format";
import { computeNumbers } from "@/lib/financials/metrics";
import { buildStatements, plainText, termsIn } from "@/lib/financials/templates";
import { lookupTerm } from "@/lib/glossary";
import type { CompanyFacts, FactValue } from "@/lib/sec/facts";
import { parseSubmissions } from "@/lib/sec/filings";

describe("formatting", () => {
  it("writes money the way people say it", () => {
    expect(formatMoney(416_161_000_000)).toBe("$416.2 billion");
    expect(formatMoney(9_000_000_000)).toBe("$9 billion");
    expect(formatMoney(850_400_000)).toBe("$850.4 million");
    expect(formatMoney(12_400)).toBe("$12,400");
    expect(formatMoney(1_250_000_000_000)).toBe("$1.3 trillion");
  });

  it("writes percentages and dates", () => {
    expect(formatPercent(0.0643)).toBe("6.4%");
    expect(formatPercent(-0.031)).toBe("3.1%");
    expect(formatDate("2025-09-27")).toBe("September 27, 2025");
  });

  it("refuses percentage growth from a loss or from zero", () => {
    expect(percentChange(110, 100)).toBeCloseTo(0.1);
    expect(percentChange(50, -20)).toBeUndefined();
    expect(percentChange(50, 0)).toBeUndefined();
    expect(percentChange(-5, 20)).toBeUndefined();
  });
});

// ---- A made-up company, shaped like real SEC data ------------------------

const filings = parseSubmissions({
  cik: 1234,
  name: "Example Corp",
  filings: {
    recent: {
      accessionNumber: ["0001-26-000002", "0001-25-000009", "0001-25-000001"],
      form: ["10-Q", "10-K", "10-K"],
      filingDate: ["2026-05-01", "2026-02-20", "2025-02-20"],
      reportDate: ["2026-03-31", "2025-12-31", "2024-12-31"],
      primaryDocument: ["q.htm", "k25.htm", "k24.htm"],
    },
  },
});

const K25 = "0001-25-000009";
const Q26 = "0001-26-000002";

function year(endYear: number, val: number, accn = K25): FactValue {
  return { start: `${endYear}-01-01`, end: `${endYear}-12-31`, val, accn, form: "10-K", filed: "2026-02-20", fp: "FY" };
}
function quarterOf(endYear: number, val: number, accn = Q26): FactValue {
  return { start: `${endYear}-01-01`, end: `${endYear}-03-31`, val, accn, form: "10-Q", filed: "2026-05-01", fp: "Q1" };
}
function onDate(date: string, val: number, accn = Q26): FactValue {
  return { end: date, val, accn, form: "10-Q", filed: "2026-05-01" };
}
function tag(values: FactValue[]) {
  return { units: { USD: values } };
}

function makeFacts(overrides: Record<string, FactValue[]> = {}): CompanyFacts {
  const base: Record<string, FactValue[]> = {
    Revenues: [year(2021, 60e9), year(2022, 70e9), year(2023, 80e9), year(2024, 100e9), year(2025, 108e9), quarterOf(2025, 25e9), quarterOf(2026, 24e9)],
    GrossProfit: [year(2025, 43.2e9)],
    NetIncomeLoss: [year(2024, 20e9), year(2025, 27e9)],
    NetCashProvidedByUsedInOperatingActivities: [year(2025, 30e9)],
    CashAndCashEquivalentsAtCarryingValue: [onDate("2026-03-31", 15e9)],
    // Like Coca-Cola: an old tag that stopped being used...
    LongTermDebtNoncurrent: [onDate("2024-03-29", 35e9, K25)],
    // ...and the newer tag the company uses now.
    LongTermDebt: [onDate("2026-03-31", 40e9)],
    ...overrides,
  };
  const facts: CompanyFacts["facts"] = { "us-gaap": {} };
  for (const [name, values] of Object.entries(base)) facts["us-gaap"][name] = tag(values);
  return { cik: 1234, entityName: "Example Corp", facts };
}

describe("numbers engine", () => {
  const numbers = computeNumbers(makeFacts(), filings);

  it("works out yearly growth and links the filing", () => {
    const rev = numbers.annual.revenue!;
    expect(rev.latest.value).toBe(108e9);
    expect(rev.previous?.value).toBe(100e9);
    expect(rev.change).toBeCloseTo(0.08);
    expect(rev.latest.source.label).toBe("10-K filed February 20, 2026");
    expect(rev.latest.source.url).toBe("https://www.sec.gov/Archives/edgar/data/1234/000125000009/k25.htm");
  });

  it("compares a quarter with the same quarter a year earlier", () => {
    const q = numbers.quarter.revenue!;
    expect(q.latest.end).toBe("2026-03-31");
    expect(q.previous?.end).toBe("2025-03-31");
    expect(q.change).toBeCloseTo(-0.04);
  });

  it("uses the tag with the newest data, with that tag's exact meaning", () => {
    const debt = numbers.balance.longTermDebt!;
    expect(debt.latest.value).toBe(40e9);
    expect(debt.latest.tag).toBe("LongTermDebt");
    expect(debt.latest.label).toContain("including the part due within 12 months");
  });

  it("only calculates margins when both numbers cover the same year", () => {
    expect(numbers.margins.gross).toBeCloseTo(0.4);
    expect(numbers.margins.net).toBeCloseTo(0.25);
    expect(numbers.margins.operating).toBeUndefined();
  });

  it("builds up to five years of revenue history, oldest first", () => {
    expect(numbers.revenueHistory.map((f) => f.end.slice(0, 4))).toEqual(["2021", "2022", "2023", "2024", "2025"]);
  });

  it("leaves out numbers that are stale or not reported", () => {
    const stale = computeNumbers(
      makeFacts({ CashAndCashEquivalentsAtCarryingValue: [onDate("2024-06-30", 15e9)] }),
      filings,
    );
    expect(stale.balance.cash).toBeUndefined();
    expect(stale.omitted).toContainEqual({ id: "cash", period: "instant", reason: "stale" });
    expect(numbers.omitted).toContainEqual({ id: "operatingIncome", period: "annual", reason: "not-reported" });
  });
});

describe("plain-English sentences", () => {
  const statements = buildStatements(computeNumbers(makeFacts(), filings));
  const byId = (id: string) => statements.find((s) => s.id === id)!;

  it("describes growth in plain words", () => {
    expect(plainText(byId("revenue-year").text)).toBe(
      "Revenue grew 8% in the year ended December 31, 2025, to $108 billion. This means the company sold more than the year before.",
    );
    expect(plainText(byId("revenue-quarter").text)).toBe(
      "In the quarter ended March 31, 2026, revenue was $24 billion, down 4% from the same quarter a year earlier.",
    );
  });

  it("describes profit and margins", () => {
    expect(plainText(byId("net-income-year").text)).toBe(
      "Net income, the profit left after all costs and taxes, rose 35% to $27 billion in the year ended December 31, 2025.",
    );
    expect(plainText(byId("gross-margin").text)).toContain("about $40 of every $100 of sales");
    expect(plainText(byId("net-margin").text)).toContain("about $25 was left as profit");
  });

  it("compares cash and debt only on the same date", () => {
    expect(plainText(byId("cash-vs-debt").text)).toBe("On that date it owed more in long-term debt than it held in cash.");
  });

  it("explains a loss without a misleading percentage", () => {
    const loss = buildStatements(
      computeNumbers(makeFacts({ NetIncomeLoss: [year(2024, 5e9), year(2025, -2e9)] }), filings),
    );
    expect(plainText(loss.find((s) => s.id === "net-income-year")!.text)).toBe(
      "The company made a net loss of $2 billion in the year ended December 31, 2025, meaning its costs were bigger than its income.",
    );
    expect(loss.find((s) => s.id === "net-margin")).toBeUndefined();
  });

  it("says 'about the same' for tiny changes", () => {
    const flat = buildStatements(
      computeNumbers(makeFacts({ Revenues: [year(2024, 100e9), year(2025, 100.2e9)] }), filings),
    );
    expect(plainText(flat.find((s) => s.id === "revenue-year")!.text)).toContain("about the same as the year before");
  });

  it("links every sentence to at least one source filing", () => {
    for (const s of statements) expect(s.sources.length).toBeGreaterThan(0);
  });

  it("only uses finance terms that the glossary explains", () => {
    for (const s of statements) for (const key of termsIn(s.text)) expect(lookupTerm(key), key).toBeDefined();
  });

  it("never uses buy, sell or hold language", () => {
    const advice = /\b(buy|sell|hold|price target|undervalued|overvalued|recommend)\b/i;
    for (const s of statements) expect(plainText(s.text)).not.toMatch(advice);
  });
});
