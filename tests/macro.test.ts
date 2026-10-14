import { describe, expect, it } from "vitest";
import { blsPoints, parseTreasuryCsv } from "@/lib/macro/data";

describe("economy data", () => {
  it("reads Treasury's yield curve file", () => {
    const rows = parseTreasuryCsv(`Date,"1 Mo","2 Mo","3 Mo","4 Mo","6 Mo","1 Yr","2 Yr","3 Yr","5 Yr","7 Yr","10 Yr","20 Yr","30 Yr"
10/09/2026,4.10,4.08,4.02,3.99,3.90,3.75,3.60,3.58,3.66,3.80,4.05,4.50,4.62
10/08/2026,4.11,4.09,4.03,4.00,3.91,3.76,3.61,3.59,3.67,3.81,4.06,4.51,4.63`);
    expect(rows[0]).toEqual({ date: "2026-10-09", short: 4.02, long: 4.05 });
  });

  it("reads BLS monthly figures, newest first, skipping yearly averages", () => {
    const p = blsPoints({
      seriesID: "LNS14000000",
      data: [
        { year: "2026", period: "M08", value: "4.3" },
        { year: "2026", period: "M09", value: "4.4" },
        { year: "2025", period: "M13", value: "4.1" },
      ],
    });
    expect(p).toEqual([
      { date: "2026-09-01", value: 4.4 },
      { date: "2026-08-01", value: 4.3 },
    ]);
  });
});
