import { describe, expect, it } from "vitest";
import { checkClaim, checkExplanation, extractJson, highlightLink, locateQuote, normalise } from "@/lib/explain/check";
import { readReply } from "@/lib/explain/provider";
import { trimAtParagraph } from "@/lib/explain/sources";
import type { SourceSection } from "@/lib/explain/types";

const sections: SourceSection[] = [
  {
    id: "10-K Item 1",
    title: "Business",
    form: "10-K",
    filingDate: "2025-10-31",
    url: "https://www.sec.gov/Archives/edgar/data/320193/000032019325000079/aapl-20250927.htm",
    text: "The Company designs, manufactures and markets smartphones, personal computers, tablets, wearables and accessories, and sells a variety of related services. The Company’s fiscal year is the 52- or 53-week period that ends on the last Saturday of September.",
  },
  {
    id: "10-K Item 1A",
    title: "Risk Factors",
    form: "10-K",
    filingDate: "2025-10-31",
    url: "https://www.sec.gov/Archives/edgar/data/320193/000032019325000079/aapl-20250927.htm",
    text: "The Company depends on component and product manufacturing and logistical services provided by outsourcing partners, many of which are located outside of the U.S.",
  },
];

const good = {
  text: "Apple designs and sells phones, computers, tablets and wearables, plus related services.",
  section: "10-K Item 1",
  quote: "designs, manufactures and markets smartphones, personal computers, tablets, wearables and accessories",
};

describe("checking AI claims", () => {
  it("accepts a claim whose quote is in the report, and links to the highlighted words", () => {
    const r = checkClaim(good, sections);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.claim.source.label).toBe("10-K filed October 31, 2025 · Item 1, Business");
      expect(r.claim.source.url).toContain("#:~:text=designs%2C%20manufactures");
    }
  });

  it("ignores differences in quote marks, capitals and spacing", () => {
    const r = checkClaim(
      { text: "Its year ends in late September.", section: "10-K Item 1", quote: "The Company's fiscal year is the 52- or 53-week   period" },
      sections,
    );
    expect(r.ok).toBe(true);
  });

  it("drops a claim whose quote isn't in the report", () => {
    const r = checkClaim({ ...good, quote: "designs and sells the world's best smartphones and computers" }, sections);
    expect(r).toEqual({ ok: false, reason: "quote not found in report" });
  });

  it("drops a claim citing a section it wasn't given", () => {
    const r = checkClaim({ ...good, section: "10-K Item 7" }, sections);
    expect(r.ok).toBe(false);
  });

  it("drops a claim with a number that isn't in its quote", () => {
    const r = checkClaim({ ...good, text: "Apple sells 5 kinds of products and related services." }, sections);
    expect(r).toEqual({ ok: false, reason: "number not in quote (5)" });
  });

  it("allows a number that is copied from the quote", () => {
    const r = checkClaim(
      { text: "Its year is 52 or 53 weeks long.", section: "10-K Item 1", quote: "fiscal year is the 52- or 53-week period that ends" },
      sections,
    );
    expect(r.ok).toBe(true);
  });

  it("drops investment advice", () => {
    for (const text of [
      "Investors should consider buying the shares.",
      "The stock looks undervalued.",
      "Our price target is higher.",
      "It is a good investment for beginners.",
    ]) {
      expect(checkClaim({ ...good, text }, sections)).toEqual({ ok: false, reason: "advice language" });
    }
  });

  it("drops quotes that are too short to prove anything", () => {
    expect(checkClaim({ ...good, quote: "the Company" }, sections)).toEqual({ ok: false, reason: "quote length" });
  });
});

describe("checking a whole AI answer", () => {
  it("keeps good claims, drops bad ones, removes duplicates and fills missing topics", () => {
    const { topics, dropped } = checkExplanation(
      {
        whatItDoes: [good, good, { ...good, quote: "made up words that are not anywhere in the report" }],
        biggestRisks: [
          {
            text: "It relies on outside partners, many abroad, to build its products.",
            section: "10-K Item 1A",
            quote: "depends on component and product manufacturing and logistical services provided by outsourcing partners",
          },
        ],
      },
      sections,
    );
    expect(topics.whatItDoes).toHaveLength(1);
    expect(topics.biggestRisks).toHaveLength(1);
    expect(topics.outlook).toEqual([]);
    expect(dropped).toEqual([
      { topic: "whatItDoes", reason: "quote not found in report", text: good.text, quote: "made up words that are not anywhere in the report" },
    ]);
  });

  it("refuses an answer in the wrong shape", () => {
    expect(() => checkExplanation({ whatItDoes: "not a list" }, sections)).toThrow(/expected shape/);
  });
});

describe("reading AI replies", () => {
  it("finds JSON even when the model wraps it in words or code fences", () => {
    expect(extractJson('Here you go:\n```json\n{"a": 1}\n```')).toEqual({ a: 1 });
    expect(extractJson('Sure! {"a": {"b": 2}} Hope this helps.')).toEqual({ a: { b: 2 } });
    expect(() => extractJson("no json here")).toThrow();
  });

  it("finds the answer text in each Cloudflare reply format", () => {
    expect(readReply({ result: { response: "hello" } })).toBe("hello");
    expect(readReply({ result: { choices: [{ message: { content: "hi" } }] } })).toBe("hi");
    expect(
      readReply({ result: { output: [{ type: "reasoning" }, { type: "message", content: [{ type: "output_text", text: "yo" }] }] } }),
    ).toBe("yo");
  });
});

describe("helpers", () => {
  it("normalises text for comparison", () => {
    expect(normalise("The  Company’s “best” — year")).toBe("the company's \"best\" - year");
  });

  it("cuts long sections at a paragraph break", () => {
    const text = "First paragraph here.\nSecond paragraph is a bit longer.\nThird.";
    expect(trimAtParagraph(text, 60)).toBe("First paragraph here.\nSecond paragraph is a bit longer.");
    expect(trimAtParagraph(text, 500)).toBe(text);
  });

  it("builds highlight links with the first words of the quote", () => {
    expect(highlightLink("https://x.test/doc.htm", "fiscal year is the 52- or 53-week period")).toBe(
      "https://x.test/doc.htm#:~:text=fiscal%20year%20is%20the%2052%2D%20or%2053%2Dweek%20period",
    );
  });
});

describe("repairing almost-exact quotes", () => {
  const text = sections[1].text;

  it("returns the report's real words when the quote differs by one word", () => {
    const repaired = locateQuote(text, "The Company depends on component and product manufacturing and logistics services provided by outsourcing partners");
    expect(repaired).toBe("The Company depends on component and product manufacturing and logistical services provided by outsourcing partners");
  });

  it("returns the real words when the quote drops a word", () => {
    expect(locateQuote(text, "depends on component and product manufacturing and logistical services provided by partners, many of which")).toBe(
      "depends on component and product manufacturing and logistical services provided by outsourcing partners, many of which",
    );
  });

  it("refuses a quote that only shares some words", () => {
    expect(locateQuote(text, "The Company depends on its own factories and logistics teams located inside the U.S.")).toBeUndefined();
  });

  it("refuses short quotes it can't match exactly", () => {
    expect(locateQuote(text, "Company relies on outsourcing partners")).toBeUndefined();
  });

  it("uses the repaired quote in a checked claim", () => {
    const r = checkClaim(
      {
        text: "It relies on outside partners to make and ship its products.",
        section: "10-K Item 1A",
        quote: "The Company depends on component and product manufacturing and logistics services provided by outsourcing partners",
      },
      sections,
    );
    expect(r.ok && r.claim.quote).toContain("logistical services");
  });
});
