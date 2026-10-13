/**
 * Write one company's explanation: gather its report sections, ask the AI,
 * check every claim, give important empty topics one checked retry.
 * Used by the website, the GitHub "Write explanations" button and the nightly job.
 */
import { checkExplanation, extractJson } from "./check";
import { buildRetryPrompt, buildUserPrompt, RETRY_TOPICS, SYSTEM_PROMPT } from "./prompt";
import { cloudflareProvider, type AiProvider } from "./provider";
import { gatherSections } from "./sources";
import type { SavedExplanation, TopicId } from "./types";

export async function generateExplanation(
  company: { cik: string; ticker: string },
  options: { provider?: AiProvider; log?: (line: string) => void } = {},
): Promise<{ explanation: SavedExplanation; filingsKey: string }> {
  const log = options.log ?? (() => undefined);
  const { name, sections, filingsKey } = await gatherSections(company.cik);
  if (sections.length === 0) throw new Error("No report sections found");
  const user = buildUserPrompt(name, sections);
  log(`Sections: ${sections.map((s) => `${s.id} (${s.text.length.toLocaleString()} chars)`).join(", ")}`);
  log(`Prompt size: about ${Math.round((SYSTEM_PROMPT.length + user.length) / 4).toLocaleString()} tokens`);

  const provider = options.provider ?? cloudflareProvider();
  const ask = async (prompt: string): Promise<unknown> => {
    for (let attempt = 1; ; attempt++) {
      const reply = await provider.complete(SYSTEM_PROMPT, prompt);
      try {
        return extractJson(reply);
      } catch (err) {
        log(`Attempt ${attempt}: reply wasn't valid JSON (${(err as Error).message}).`);
        if (attempt >= 2) throw err;
      }
    }
  };

  const { topics, dropped } = checkExplanation(await ask(user), sections);

  // Second chance for important topics that came back empty because every claim failed.
  const failures = dropped.filter(
    (d) => (RETRY_TOPICS as readonly string[]).includes(d.topic) && topics[d.topic as TopicId].length === 0,
  );
  if (failures.length > 0) {
    const cited = new Set(failures.map((f) => f.topic));
    const relevant = sections.filter((s) => s.id.startsWith("10-K Item 1"));
    log(`Retrying ${[...cited].join(", ")} with ${relevant.map((s) => s.id).join(", ")}`);
    const retry = checkExplanation(await ask(buildRetryPrompt(name, relevant, failures)), relevant);
    for (const t of cited) {
      const id = t as TopicId;
      if (topics[id].length === 0 && retry.topics[id].length > 0) {
        topics[id] = retry.topics[id];
        log(`  ${id}: ${retry.topics[id].length} kept on retry`);
      }
    }
    dropped.push(...retry.dropped.filter((d) => cited.has(d.topic)).map((d) => ({ ...d, reason: `retry: ${d.reason}` })));
  }

  return {
    filingsKey,
    explanation: {
      ticker: company.ticker,
      generatedAt: new Date().toISOString(),
      model: provider.name,
      sources: sections.map((s) => ({ id: s.id, form: s.form, filingDate: s.filingDate, url: s.url })),
      topics,
      dropped,
    },
  };
}
