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
import { figureAppearsInText } from "../lib/financials/crosscheck";
import { computeNumbers, type Figure } from "../lib/financials/metrics";
import { buildStatements, plainText } from "../lib/financials/templates";
import { describeAnnouncement } from "../lib/sec/events";
import { availableConcepts, getSeries, loadCompanyFacts } from "../lib/sec/facts";
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
  const filingText = new Map<string, string>(); // filing address -> its text
  for (const filing of [tenK, tenQ].filter((f): f is Filing => Boolean(f))) {
    const { text, sections } = await loadSections(filing.url, filing.form);
    filingText.set(filing.url, text);
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
  const numbers = computeNumbers(facts, filings);
  const statements = buildStatements(numbers);
  console.log(`Numbers as of ${numbers.asOf}:`);
  for (const st of statements) console.log(`  [${st.section}] ${plainText(st.text)}`);
  if (numbers.omitted.length) {
    console.log(`  Left out: ${numbers.omitted.map((o) => `${o.id}/${o.period} (${o.reason})`).join(", ")}`);
  }

  // Safety check: each figure should appear in the text of the filing it came from.
  const figures: Figure[] = [];
  for (const group of [numbers.annual, numbers.quarter, numbers.balance]) {
    for (const c of Object.values(group)) if (c) figures.push(c.latest, ...(c.previous ? [c.previous] : []));
  }
  const checks = figures
    .filter((f) => filingText.has(f.source.url))
    .map((f) => ({ tag: f.tag, end: f.end, value: f.value, filing: f.source.label, found: figureAppearsInText(f, filingText.get(f.source.url)!) }));
  const missing = checks.filter((c) => !c.found);
  console.log(`  Cross-check: ${checks.length - missing.length} of ${checks.length} figures found in the filing text`);
  for (const m of missing) console.log(`    NOT FOUND: ${m.tag} ${m.end} ${m.value} (${m.filing})`);

  await writeFile(
    path.join(outDir, "summary.json"),
    JSON.stringify(
      {
        company: { ...company, industry: filings.industry, fiscalYearEnd: filings.fiscalYearEnd, exchanges: filings.exchanges },
        reports,
        announcements,
        numbers,
        statements,
        crossCheck: checks,
        // Which debt-related tags this company uses, newest first, to help choose tags.
        debtTags: availableConcepts(facts)
          .filter((t) => /Debt|Borrowing|CommercialPaper/.test(t))
          .map((t) => ({ tag: t, latest: getSeries(facts, [t], "instant")[0] }))
          .filter((x) => x.latest)
          .sort((a, b) => b.latest!.end.localeCompare(a.latest!.end))
          .slice(0, 15)
          .map((x) => ({ tag: x.tag, end: x.latest!.end, value: x.latest!.value })),
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
