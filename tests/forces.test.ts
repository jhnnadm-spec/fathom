import { describe, expect, it } from "vitest";
import type { CheckedClaim, SavedExplanation, TopicId } from "@/lib/explain/types";
import { TOPICS } from "@/lib/explain/types";
import type { CompanyNumbers } from "@/lib/financials/metrics";
import type { Indicator } from "@/lib/macro/data";
import { conceptMap, EDGES } from "@/lib/report/concept-map";
import { buildForces, classifyClaims } from "@/lib/report/forces";

const claim = (text: string): CheckedClaim => ({ text, quote: text, source: { label: "10-K Item 1A", url: "https://www.sec.gov/x", section: "10-K Item 1A" } });

function explanation(topics: Partial<Record<TopicId, string[]>>): SavedExplanation {
  const all = Object.fromEntries(Object.keys(TOPICS).map((k) => [k, (topics[k as TopicId] ?? []).map(claim)])) as Record<TopicId, CheckedClaim[]>;
  return { ticker: "TEST", generatedAt: "2026-10-01T00:00:00Z", model: "test", sources: [], topics: all, dropped: [] };
}

const numbers = {
  asOf: "2025-12-31",
  annual: {
    revenue: { latest: { value: 100e9, end: "2025-12-31", start: "2025-01-01" }, previous: { value: 90e9, end: "2024-12-31" }, change: 0.111 },
    netIncome: { latest: { value: 10e9, end: "2025-12-31", start: "2025-01-01" } },
  },
  quarter: {},
  balance: { longTermDebt: { latest: { value: 40e9, end: "2025-12-31" } }, cash: { latest: { value: 12e9, end: "2025-12-31" } } },
  margins: { gross: 0.4, net: 0.1, periodEnd: "2025-12-31" },
  marginHistory: [],
  revenueHistory: [],
  ratios: {},
  omitted: [],
} as unknown as CompanyNumbers;

const macro: Indicator[] = [
  { id: "short-rate", value: 4.26, yearAgo: 4.02, date: "2026-10-13", source: { name: "US Treasury", url: "https://home.treasury.gov" } },
  { id: "inflation", value: 3.4, yearAgo: 2.9, date: "2026-08-01", source: { name: "US Bureau of Labor Statistics", url: "https://data.bls.gov" } },
];

describe("sorting the company's own words into forces", () => {
  it("puts each sentence under one force", () => {
    const e = explanation({
      biggestRisks: [
        "Higher interest rates could raise our borrowing costs.",
        "Rising commodity prices could increase our costs.",
        "We face intense competition from larger rivals.",
        "New tariffs and tax laws could affect our results.",
        "A cyber attack could disrupt our systems.",
        "Our stock price may be volatile.",
      ],
      demandDrivers: ["Consumer spending falls in a recession."],
    });
    const w = classifyClaims(e);
    expect(Object.fromEntries(Object.entries(w).map(([k, v]) => [k, v.length]))).toEqual({
      rates: 1,
      inflation: 1,
      competition: 1,
      rules: 1,
      tech: 1,
      sentiment: 1,
      demand: 1,
    });
  });

  it("only counts an edge when it is about competitors", () => {
    const w = classifyClaims(explanation({ competitiveEdge: ["Our brand helps us win against competitors.", "Our global distribution network."] }));
    expect(w.competition).toHaveLength(1);
    expect(w.world).toBeUndefined();
  });

  it("does not read 'trademark' as world trade", () => {
    expect(classifyClaims(explanation({ biggestRisks: ["We rely on our trademarks."] })).world).toBeUndefined();
  });
});

describe("building the forces", () => {
  const forces = buildForces("Test", numbers, undefined, macro);

  it("covers the company, the economy and market mood even without an explanation", () => {
    const groups = new Set(forces.map((f) => f.group));
    expect(groups).toEqual(new Set(["company", "economy", "sentiment"]));
    expect(forces.filter((f) => f.group === "outside")).toHaveLength(0);
  });

  it("uses official readings with a source", () => {
    const rates = forces.find((f) => f.id === "rates")!;
    expect(rates.now?.text).toContain("4.26%");
    expect(rates.now?.text).toContain("up from 4.02%");
    expect(rates.now?.source?.name).toBe("US Treasury");
    expect(forces.find((f) => f.id === "inflation")!.now?.text).toContain("3.4%");
    expect(forces.find((f) => f.id === "demand")!.now).toBeUndefined(); // no unemployment reading given
  });

  it("states the company's own exposure from its figures", () => {
    expect(forces.find((f) => f.id === "rates")!.company).toContain("$40");
    expect(forces.find((f) => f.id === "growth")!.now?.text).toMatch(/rose 11/);
  });

  it("links every consequence to a box on the map", () => {
    const ids = new Set(conceptMap(numbers).map((n) => n.id));
    for (const f of forces) for (const a of f.affects) expect(ids.has(a), `${f.id} → ${a}`).toBe(true);
    for (const e of EDGES) expect(ids.has(e.from) && ids.has(e.to), `${e.from} → ${e.to}`).toBe(true);
  });

  it("adds outside forces only when the company talks about them", () => {
    const e = explanation({ biggestRisks: ["A drought could reduce water supply and hurt crops due to climate change."] });
    const f = buildForces("Test", numbers, e, []);
    const outside = f.filter((x) => x.group === "outside").map((x) => x.id);
    expect(outside).toEqual(["nature"]); // the specific cause wins over the general word "supply"
    expect(f.find((x) => x.id === "rates")!.now).toBeUndefined(); // no data, no reading
  });
});
