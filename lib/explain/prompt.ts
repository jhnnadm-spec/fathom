/**
 * The instructions given to the AI. It only sees the report sections we give it,
 * and must answer in a fixed JSON shape so the checker can test every claim.
 */
import { TOPICS, type SourceSection } from "./types";

export const SYSTEM_PROMPT = `You explain US public companies to people who have never invested before.
You will be given sections of a company's official SEC reports. Using ONLY those sections, fill in each topic.

Rules:
- Write in plain, friendly, professional English. No jargon; if a finance word is unavoidable, explain it in the same sentence. No hype, no slang.
- Each claim is one or two short sentences (under 40 words) in your own words.
- Every claim must include "section" (exactly one of the section names given) and "quote": one continuous passage of 8 to 30 words copied EXACTLY, character for character, from that section. Copy it; do not shorten, reword or join separate sentences.
- The quote must directly support EVERYTHING the claim says. If part of the claim is not in the quote, remove that part.
- Aim for 2 or 3 claims per topic when the report supports them, each with its own quote.
- Only state what the report says. Do not add facts from your own knowledge. If the report does not cover a topic, return an empty list for it.
- Do not write any number unless the same number appears in your quote.
- For "competitiveEdge" and "marketPosition", describe what the COMPANY says about itself, e.g. "The company says...". Do not give your own opinion.
- Never give investment advice: no buy, sell or hold, no price targets, no "undervalued" or "overvalued", no predictions about the share price.
- "biggestRisks": the risks the report gives most weight to, most important first, each explained simply.
- "newRisks": only from the quarterly report's risk factor section, and only risks it describes as new or changed. If it says there were no material changes, return an empty list.
- "outlook": only expectations management states for the future. If none are stated, return an empty list.
- "upcoming": only specific future events the company mentions (launches, expansions, completed deals, programmes). If none, return an empty list.

Answer with a single JSON object and nothing else, in this shape:
{
${Object.entries(TOPICS)
  .map(([id, label]) => `  "${id}": [{"text": "...", "section": "...", "quote": "..."}]   // ${label}`)
  .join(",\n")}
}`;

/** The user message: the company name and each allowed section, clearly labelled. */
export function buildUserPrompt(companyName: string, sections: SourceSection[]): string {
  const parts = sections.map(
    (s) => `=== SECTION: ${s.id} (${s.title}, ${s.form} filed ${s.filingDate}) ===\n${s.text}\n=== END OF ${s.id} ===`,
  );
  return `Company: ${companyName}\nAllowed section names: ${sections.map((s) => `"${s.id}"`).join(", ")}\n\n${parts.join("\n\n")}`;
}

/** Topics worth a second try when every claim for them failed the checks. */
export const RETRY_TOPICS = ["whatItDoes", "howItMakesMoney", "competitiveEdge", "biggestRisks"] as const;

/**
 * A second, smaller request: the AI sees only the sections it cited, is told which
 * quotes failed and why, and tries again for just those topics.
 */
export function buildRetryPrompt(
  companyName: string,
  sections: SourceSection[],
  failures: { topic: string; text: string; quote?: string; reason: string }[],
): string {
  const list = failures
    .map((f) => `- Topic "${f.topic}": your claim "${f.text}" used the quote "${f.quote ?? ""}", which failed because: ${f.reason}.`)
    .join("\n");
  const topics = [...new Set(failures.map((f) => f.topic))];
  return `${buildUserPrompt(companyName, sections)}

Your previous answer had claims that failed the checks:
${list}

Try again for these topics only: ${topics.map((t) => `"${t}"`).join(", ")}.
Find a sentence in the sections above that supports each claim, and copy one continuous passage of it EXACTLY as the quote.
If no passage supports a claim, leave it out. Return the same JSON shape; topics not listed may be empty lists.`;
}
