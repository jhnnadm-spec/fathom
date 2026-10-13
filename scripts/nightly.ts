/**
 * The daily job (GitHub Actions, just before the free AI allowance resets):
 *   1. copies the explanations bundled with the app into Supabase,
 *   2. queues an update for any company that has filed a newer report,
 *   3. writes queued explanations with whatever is left of today's allowance.
 * Running every day also keeps the free Supabase project from pausing.
 *
 *   npx tsx scripts/nightly.ts
 */
import { EXPLANATIONS } from "../content/explanations";
import { generateExplanation } from "../lib/explain/generate";
import { bundledKey, DAILY_LIMIT } from "../lib/explain/ondemand";
import { currentReports, filingsKey } from "../lib/explain/sources";
import { loadFilings } from "../lib/sec/filings";
import { loadTickers } from "../lib/sec/tickers";
import { claim, listQueued, listReady, markQueued, saveFailure, saveReady, seedReady, storeEnabled } from "../lib/store/explanations";

const MAX_ATTEMPTS = 4;

async function main() {
  if (!storeEnabled()) {
    console.log("Supabase isn't set up (SUPABASE_URL, SUPABASE_SECRET_KEY); nothing to do.");
    return;
  }

  // 1. Bundled explanations (never overwrites a newer one).
  for (const [ticker, e] of Object.entries(EXPLANATIONS)) await seedReady(ticker, e, bundledKey(e));
  console.log(`Seeded ${Object.keys(EXPLANATIONS).length} bundled explanations`);

  // 2. Newer reports → queue an update.
  const tickers = await loadTickers();
  const cikOf = new Map(tickers.map((t) => [t.ticker, t.cik]));
  for (const row of await listReady()) {
    const cik = cikOf.get(row.ticker);
    if (!cik) continue;
    try {
      const key = filingsKey(currentReports(await loadFilings(cik)));
      if (key && key !== row.filings_key) {
        await markQueued(row.ticker);
        console.log(`${row.ticker}: newer report filed, queued for an update`);
      }
    } catch (err) {
      console.log(`${row.ticker}: couldn't check for newer reports (${(err as Error).message})`);
    }
  }

  // 3. Write what's queued, until today's allowance runs out.
  for (const row of await listQueued(DAILY_LIMIT)) {
    const cik = cikOf.get(row.ticker);
    if (!cik) {
      await saveFailure(row.ticker, "Ticker no longer listed by SEC", false);
      continue;
    }
    const key = filingsKey(currentReports(await loadFilings(cik)));
    const result = await claim({ ticker: row.ticker, filingsKey: key, dailyLimit: DAILY_LIMIT });
    console.log(`${row.ticker}: ${result}`);
    if (result === "queued") break; // allowance used up; the rest wait for tomorrow
    if (result !== "claimed") continue;
    try {
      const { explanation, filingsKey: written } = await generateExplanation({ cik, ticker: row.ticker }, { log: (l) => console.log(`  ${l}`) });
      await saveReady(row.ticker, explanation, written);
      console.log(`  written`);
    } catch (err) {
      const message = (err as Error).message;
      await saveFailure(row.ticker, message, row.attempts + 1 < MAX_ATTEMPTS);
      console.log(`  failed: ${message}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
