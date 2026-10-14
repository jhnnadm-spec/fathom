import { describe, expect, it } from "vitest";
import { sectorOf } from "@/lib/sectors";

describe("sectors from SEC industry codes", () => {
  it("groups well-known companies where a beginner would look for them", () => {
    expect(sectorOf(3571)).toBe("technology"); // Apple
    expect(sectorOf(7370)).toBe("technology"); // Alphabet, Meta
    expect(sectorOf(2080)).toBe("consumer"); // Coca-Cola
    expect(sectorOf(3021)).toBe("consumer"); // Nike
    expect(sectorOf(6021)).toBe("banks"); // JPMorgan
    expect(sectorOf(6324)).toBe("health"); // UnitedHealth
    expect(sectorOf(5122)).toBe("health"); // McKesson
    expect(sectorOf(7990)).toBe("media"); // Disney
    expect(sectorOf(5331)).toBe("shops"); // Walmart, Costco
    expect(sectorOf(2911)).toBe("energy"); // Exxon
    expect(sectorOf(4922)).toBe("energy"); // gas pipelines
    expect(sectorOf(3721)).toBe("industrials"); // Boeing
    expect(sectorOf(6798)).toBe("real-estate"); // REITs
  });

  it("leaves out shell companies with no business yet", () => {
    expect(sectorOf(6770)).toBeUndefined();
  });
});
