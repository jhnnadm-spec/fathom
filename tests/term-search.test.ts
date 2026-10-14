import { describe, expect, it } from "vitest";
import { glossaryKeys, lookupTerm } from "@/lib/glossary";
import { searchTerms } from "@/lib/term-search";

const top = (q: string) => searchTerms(q)[0]?.key;

describe("finding a term from what people type", () => {
  it("finds the P/E ratio however it's written", () => {
    for (const q of ["pe ratio", "PE", "p/e", "P/E ratio", "price to earnings", "Price-to-earnings"]) {
      expect(top(q), q).toBe("pe-ratio");
    }
  });
  it("knows common short names", () => {
    expect(top("roe")).toBe("return-on-equity");
    expect(top("capex")).toBe("capital-expenditure");
    expect(top("fcf")).toBe("free-cash-flow");
    expect(top("eps")).toBe("eps");
    expect(top("dividend yield")).toBe("dividend-yield");
    expect(top("market cap")).toBe("market-cap");
  });
  it("finds partial words", () => {
    expect(searchTerms("cash flow").map((m) => m.key)).toContain("free-cash-flow");
    expect(top("debt to eq")).toBe("debt-to-equity");
  });
  it("returns nothing for gibberish", () => {
    expect(searchTerms("zzqqx")).toEqual([]);
  });
});

describe("both sides of the key ratios", () => {
  it("covers the main ratios", () => {
    for (const k of ["pe-ratio", "return-on-equity", "debt-to-equity", "current-ratio", "profit-margin", "dividend-yield"]) {
      const s = lookupTerm(k)?.sides;
      expect(s, k).toBeDefined();
      for (const side of [s!.high, s!.low]) {
        expect(side.label.length).toBeGreaterThan(3);
        expect(side.good.length).toBeGreaterThan(20);
        expect(side.bad.length).toBeGreaterThan(20);
      }
    }
  });
  it("every entry is complete", () => {
    for (const k of glossaryKeys()) {
      const e = lookupTerm(k)!;
      expect(e.term && e.short && e.definition, k).toBeTruthy();
    }
  });
});
