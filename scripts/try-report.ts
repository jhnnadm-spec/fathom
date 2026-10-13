/**
 * Try the SEC data steps on real companies and save what comes back.
 *
 *   npx tsx scripts/try-report.ts AAPL KO
 *
 * For each company it saves, under out/<TICKER>/:
 *   summary.json   the company, its latest reports, recent announcements and key numbers
 *   sections/      the text of each report section, one file per section
 *
 * Needs SEC_USER_AGENT to be set (your name and email).
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { describeAnnouncement } from "../lib/sec/events";
import { getSeries, loadCompanyFacts } from "../lib/sec/facts";
import {
  checkSupport,
  latestFiling,
  loadFilings,
  previousFiling,
  recentAnnouncements,
  type Filing,
} from "../lib/sec/filings";
import { loadSections } from "../lib/sec/sections";
import { findCompanies, loadTickers } from "../lib/sec/tickers";

// A first list of tags to look at. The numbers step decides the final choice per company.
const CHECKS = {
  revenue: ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues", "SalesRevenueNet"],
  netIncome: ["NetIncomeLoss"],
  cash: ["CashAndCashEquivalentsAtCarryingValue"],
  longTermDebt: ["LongTermDebtNoncurrent", "LongTermDebt"],
};

async function run(query: string) {
  const all = await loadTickers();
  const company = findCompanies(all, query)[0];
  if (!company) {
    console.log(`No company found for "${query}"`);
    return;
  }
  console.log(`\n=== ${company.name} (${company.ticker}, SEC ID ${company.cik}) ===`);

  const filings = await loadFilings(company.cik);
  const support = checkSupport(filings);
  console.log(`Supported: ${support.supported ? "yes" : `no (${support.reason})`}`);
  if (!support.supported) return;

  const tenK = latestFiling(filings, "10-K");
  const tenQ = latestFiling(filings, "10-Q");
  const outDir = path.join("out", company.ticker);
  await mkdir(path.join(outDir, "sections"), { recursive: true });

  const reports: Record<string, unknown>[] = [];
  for (const filing of [tenK, tenQ].filter((f): f is Filing => Boolean(f))) {
    const { text, sections } = await loadSections(filing.url, filing.form);
    console.log(`${filing.form} filed ${filing.filingDate}: ${text.length.toLocaleString()} characters, ${sections.length} sections`);
    for (const s of sections) {
      const file = `${filing.form}_${s.id}.txt`.replace(/[^\w.-]/g, "_");
      await writeFile(path.join(outDir, "sections", file), `${s.title}\nSource: ${filing.url}\n\n${s.text}`);
      console.log(`  ${s.id.padEnd(6)} ${s.title.slice(0, 60).padEnd(60)} ${s.text.length.toLocaleString()} chars`);
    }
    const previous = previousFiling(filings, filing);
    reports.push({
      form: filing.form,
      filingDate: filing.filingDate,
      periodEnd: filing.reportDate,
      url: filing.url,
      previous: previous ? { filingDate: previous.filingDate, url: previous.url } : null,
      sections: sections.map((s) => ({ id: s.id, title: s.title, characters: s.text.length })),
    });
  }

  const announcements = recentAnnouncements(filings, 120).map((f) => ({
    filingDate: f.filingDate,
    events: describeAnnouncement(f.items),
    url: f.url,
  }));
  console.log(`8-K announcements in the last 120 days: ${announcements.length}`);

  const facts = await loadCompanyFacts(company.cik);
  const numbers: Record<string, unknown> = {};
  for (const [name, tags] of Object.entries(CHECKS)) {
    const kind = name === "cash" || name === "longTermDebt" ? "instant" : "annual";
    const series = getSeries(facts, tags, kind).slice(0, 3);
    numbers[name] = series;
    const latest = series[0];
    console.log(`  ${name.padEnd(13)} ${latest ? `${latest.value.toLocaleString()} ${latest.unit} at ${latest.end} (${latest.concept}, ${latest.form})` : "not found"}`);
  }

  await writeFile(
    path.join(outDir, "summary.json"),
    JSON.stringify(
      {
        company: { ...company, industry: filings.industry, fiscalYearEnd: filings.fiscalYearEnd, exchanges: filings.exchanges },
        reports,
        announcements,
        numbers,
        fetchedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log(`Saved to ${outDir}`);
}

async function main() {
  const queries = process.argv.slice(2);
  if (queries.length === 0) {
    console.log("Usage: npx tsx scripts/try-report.ts AAPL [KO ...]");
    process.exit(1);
  }
  for (const q of queries) {
    try {
      await run(q);
    } catch (err) {
      console.error(`Failed for ${q}: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  }
}

void main();
