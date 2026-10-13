import { describe, expect, it } from "vitest";
import { padCik, SEC_URLS } from "@/lib/sec/client";
import { findCompanies, parseTickers } from "@/lib/sec/tickers";
import {
  checkSupport,
  latestFiling,
  parseSubmissions,
  previousFiling,
  recentAnnouncements,
} from "@/lib/sec/filings";
import { describeAnnouncement } from "@/lib/sec/events";
import { getSeries, type CompanyFacts } from "@/lib/sec/facts";
import { findSection, htmlToText, splitSections } from "@/lib/sec/sections";

// Small made-up examples in the same shape as SEC's real data.
const tickers = parseTickers({
  "0": { cik_str: 320193, ticker: "AAPL", title: "Apple Inc." },
  "1": { cik_str: 21344, ticker: "KO", title: "COCA COLA CO" },
  "2": { cik_str: 1067983, ticker: "BRK-B", title: "BERKSHIRE HATHAWAY INC" },
  "3": { cik_str: 1067983, ticker: "BRK-A", title: "BERKSHIRE HATHAWAY INC" },
  "4": { cik_str: 999, ticker: "APLE", title: "Apple Hospitality REIT, Inc." },
});

describe("company search", () => {
  it("pads SEC IDs to 10 digits", () => {
    expect(padCik(320193)).toBe("0000320193");
    expect(padCik("0000320193")).toBe("0000320193");
  });

  it("matches an exact ticker first", () => {
    expect(findCompanies(tickers, "aapl")[0].name).toBe("Apple Inc.");
  });

  it("matches names regardless of punctuation and 'Co'", () => {
    expect(findCompanies(tickers, "Coca-Cola")[0].ticker).toBe("KO");
  });

  it("accepts BRK.B written with a dot and lists each company once", () => {
    const results = findCompanies(tickers, "BRK.B");
    expect(results[0].ticker).toBe("BRK-B");
    expect(findCompanies(tickers, "berkshire").length).toBe(1);
  });

  it("ranks the exact name above longer names", () => {
    const results = findCompanies(tickers, "apple");
    expect(results.map((r) => r.ticker)).toEqual(["AAPL", "APLE"]);
  });

  it("returns nothing for an empty search", () => {
    expect(findCompanies(tickers, "  ")).toEqual([]);
  });
});

const submissions = parseSubmissions({
  cik: 320193,
  name: "Apple Inc.",
  tickers: ["AAPL"],
  exchanges: ["Nasdaq"],
  sicDescription: "Electronic Computers",
  fiscalYearEnd: "0926",
  filings: {
    recent: {
      accessionNumber: ["0000320193-26-000010", "0000320193-26-000008", "0000320193-25-000079", "0000320193-25-000070", "0000320193-24-000123"],
      form: ["8-K", "10-Q", "10-K", "10-K/A", "10-K"],
      filingDate: ["2026-07-31", "2026-08-01", "2025-10-31", "2025-06-01", "2024-11-01"],
      reportDate: ["2026-07-31", "2026-06-27", "2025-09-27", "2024-09-28", "2024-09-28"],
      primaryDocument: ["a8k.htm", "a10q.htm", "a10k.htm", "a10ka.htm", "a10k24.htm"],
      items: ["2.02,9.01", "", "", "", ""],
    },
  },
});

describe("filings", () => {
  it("sorts newest first and builds document addresses", () => {
    expect(submissions.filings[0].form).toBe("10-Q");
    expect(submissions.filings[0].url).toBe(
      "https://www.sec.gov/Archives/edgar/data/320193/000032019326000008/a10q.htm",
    );
  });

  it("finds the latest original report, skipping corrections", () => {
    expect(latestFiling(submissions, "10-K")?.accessionNumber).toBe("0000320193-25-000079");
    expect(latestFiling(submissions, "10-Q")?.primaryDocument).toBe("a10q.htm");
  });

  it("finds the previous report of the same type", () => {
    const latest = latestFiling(submissions, "10-K")!;
    expect(previousFiling(submissions, latest)?.accessionNumber).toBe("0000320193-24-000123");
  });

  it("lists recent announcements with their item codes", () => {
    const recent = recentAnnouncements(submissions, 90, new Date("2026-10-13"));
    expect(recent).toHaveLength(1);
    expect(recent[0].items).toEqual(["2.02", "9.01"]);
  });

  it("supports US filers and explains foreign ones", () => {
    expect(checkSupport(submissions, new Date("2026-10-13"))).toEqual({ supported: true });
    const foreign = { ...submissions, filings: [{ ...submissions.filings[0], form: "20-F" }] };
    expect(checkSupport(foreign, new Date("2026-10-13"))).toEqual({
      supported: false,
      reason: "foreign-filer",
    });
  });

  it("builds the SEC data addresses", () => {
    expect(SEC_URLS.companyFacts(320193)).toBe(
      "https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json",
    );
  });
});

describe("announcement labels", () => {
  it("translates item codes and drops the attachments-only code", () => {
    expect(describeAnnouncement(["2.02", "9.01"])).toEqual(["Shared financial results"]);
    expect(describeAnnouncement(["5.02"])).toEqual(["Change in its leaders or board"]);
  });
});

const facts: CompanyFacts = {
  cik: 320193,
  entityName: "Apple Inc.",
  facts: {
    "us-gaap": {
      RevenueFromContractWithCustomerExcludingAssessedTax: {
        units: {
          USD: [
            // Full year, reported first in the 2025 10-K and repeated in the 2026 10-K.
            { start: "2024-09-29", end: "2025-09-27", val: 500, accn: "A", form: "10-K", filed: "2025-10-31", fp: "FY" },
            { start: "2024-09-29", end: "2025-09-27", val: 505, accn: "B", form: "10-K", filed: "2026-10-30", fp: "FY" },
            // A quarter.
            { start: "2025-03-30", end: "2025-06-28", val: 120, accn: "C", form: "10-Q", filed: "2025-08-01", fp: "Q3" },
            // Nine months so far: neither a year nor a quarter, so ignored.
            { start: "2024-09-29", end: "2025-06-28", val: 380, accn: "C", form: "10-Q", filed: "2025-08-01", fp: "Q3" },
          ],
        },
      },
      Revenues: {
        units: {
          USD: [
            // An older year only reported under a different tag fills the gap.
            { start: "2023-10-01", end: "2024-09-28", val: 450, accn: "D", form: "10-K", filed: "2024-11-01", fp: "FY" },
            // Same year as above under the second tag: the first tag wins.
            { start: "2024-09-29", end: "2025-09-27", val: 999, accn: "E", form: "10-K", filed: "2025-10-31", fp: "FY" },
          ],
        },
      },
      CashAndCashEquivalentsAtCarryingValue: {
        units: { USD: [{ end: "2025-09-27", val: 30, accn: "A", form: "10-K", filed: "2025-10-31" }] },
      },
    },
  },
};

describe("financial numbers", () => {
  const revenueTags = ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues"];

  it("keeps one value per year, using the most recently filed figure", () => {
    const annual = getSeries(facts, revenueTags, "annual");
    expect(annual.map((p) => [p.end, p.value, p.accn])).toEqual([
      ["2025-09-27", 505, "B"],
      ["2024-09-28", 450, "D"],
    ]);
  });

  it("separates quarters from year-to-date totals", () => {
    const quarterly = getSeries(facts, revenueTags, "quarterly");
    expect(quarterly).toHaveLength(1);
    expect(quarterly[0].value).toBe(120);
  });

  it("reads balance-sheet amounts as of a date", () => {
    const cash = getSeries(facts, ["CashAndCashEquivalentsAtCarryingValue"], "instant");
    expect(cash[0]).toMatchObject({ end: "2025-09-27", value: 30, form: "10-K" });
  });

  it("returns nothing for a tag the company doesn't use", () => {
    expect(getSeries(facts, ["NotARealTag"], "annual")).toEqual([]);
  });
});

const tenK = `
<html><body>
<div style="display:none"><ix:header>hidden tagging data</ix:header></div>
<table>
<tr><td>PART I</td></tr>
<tr><td>Item 1.</td><td>Business</td><td>1</td></tr>
<tr><td>Item 1A.</td><td>Risk Factors</td><td>5</td></tr>
<tr><td>Item 7.</td><td>Management&#8217;s Discussion and Analysis</td><td>20</td></tr>
</table>
<p>PART I</p>
<p>Item 1.&nbsp;&nbsp;Business</p>
<p>The Company designs, manufactures and markets smartphones and personal computers.</p>
<p>It also sells a range of services.</p>
<p>Item 1A. Risk Factors</p>
<p>The Company depends on component and product manufacturing performed by outsourcing partners.</p>
<p>Item 7.</p>
<p>Management&#8217;s Discussion and Analysis</p>
<p>Net sales increased during the year.</p>
</body></html>`;

const tenQ = `
<html><body>
<p>PART I &#8212; FINANCIAL INFORMATION</p>
<p>Item 1. Financial Statements</p>
<p>Tables of numbers appear here, and they go on for a while.</p>
<p>Item 2. Management's Discussion and Analysis</p>
<p>Sales rose compared with the same quarter a year ago.</p>
<p>PART II &#8212; OTHER INFORMATION</p>
<p>Item 1. Legal Proceedings</p>
<p>No material changes.</p>
<p>Item 1A. Risk Factors</p>
<p>There have been no material changes to the risk factors.</p>
</body></html>`;

describe("filing sections", () => {
  it("turns HTML into clean text and drops hidden blocks", () => {
    const text = htmlToText(tenK);
    expect(text).not.toContain("hidden tagging data");
    expect(text).toContain("Item 1. Business");
  });

  it("skips the table of contents and keeps the real sections", () => {
    const sections = splitSections(htmlToText(tenK), "10-K");
    expect(sections.map((s) => s.id)).toEqual(["1", "1A", "7"]);
    expect(findSection(sections, "1")?.text).toContain("designs, manufactures and markets");
    expect(findSection(sections, "1A")?.title).toBe("Risk Factors");
    expect(findSection(sections, "1A")?.text).toContain("outsourcing partners");
  });

  it("reads a title written on the line after the heading", () => {
    const sections = splitSections(htmlToText(tenK), "10-K");
    expect(findSection(sections, "7")?.title).toBe("Management’s Discussion and Analysis");
    expect(findSection(sections, "7")?.text).toContain("Net sales increased");
  });

  it("treats headings repeated at the top of every page as one section", () => {
    // Like Microsoft's reports: "PART II / Item 7" printed on each page of the section.
    const html = `<body>
      <p>Item 6. [Reserved]</p>
      <p>PART II</p><p>Item 7</p>
      <p>ITEM 7. MANAGEMENT'S DISCUSSION AND ANALYSIS</p>
      <p>First page of the discussion.</p><p>41</p>
      <p>PART II</p><p>Item 7</p>
      <p>Second page of the discussion, which is longer than the first page by quite a bit.</p><p>42</p>
      <p>PART II</p><p>Item 7A</p>
      <p>ITEM 7A. QUANTITATIVE AND QUALITATIVE DISCLOSURES ABOUT MARKET RISK</p>
      <p>Market risk text.</p>
    </body>`;
    const sections = splitSections(htmlToText(html), "10-K");
    expect(sections.map((s) => s.id)).toEqual(["6", "7", "7A"]);
    const md = findSection(sections, "7")!;
    expect(md.title).toBe("Management's Discussion and Analysis");
    expect(md.text).toContain("First page");
    expect(md.text).toContain("Second page");
    expect(findSection(sections, "6")?.text).not.toContain("discussion");
  });

  it("keeps Part I and Part II apart in quarterly reports", () => {
    const sections = splitSections(htmlToText(tenQ), "10-Q");
    expect(sections.map((s) => s.id)).toEqual(["I-1", "I-2", "II-1", "II-1A"]);
    expect(findSection(sections, "I-2")?.text).toContain("same quarter a year ago");
    expect(findSection(sections, "II-1A")?.text).toContain("no material changes");
  });
});
