import { describe, expect, it } from "vitest";
import { bracketFor } from "@/components/RichText";

describe("real terms in brackets", () => {
  it("adds the real term after plain words", () => {
    expect(bracketFor("kept as profit", "net income")).toBe("net income");
    expect(bracketFor("loans and bonds", "long-term debt")).toBe("long-term debt");
    expect(bracketFor("Earnings per share", "EPS")).toBe("EPS");
    expect(bracketFor("market value", "market capitalisation")).toBe("market capitalisation");
    expect(bracketFor("cash", "operating cash flow")).toBe("operating cash flow");
  });
  it("leaves it out when the words already say it", () => {
    expect(bracketFor("Revenue", "revenue")).toBeUndefined();
    expect(bracketFor("buybacks", "share buyback")).toBeUndefined();
    expect(bracketFor("dividends", "dividend")).toBeUndefined();
    expect(bracketFor("shareholders' equity", "shareholders' equity")).toBeUndefined();
    expect(bracketFor("restatement notices", "restatement")).toBeUndefined();
  });
});
