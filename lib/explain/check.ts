/**
 * The checker. Every AI claim must pass all of these, or it is thrown away:
 *
 *  1. It names one of the report sections the AI was given.
 *  2. Its quote appears word-for-word in that section (ignoring spacing and quote styles).
 *  3. Any number in the claim also appears in its quote, so no number is made up.
 *  4. It contains no investment advice (buy/sell/hold, price targets, "undervalued"...).
 *  5. It is short enough to read easily.
 */
import { formatDate } from "../financials/format";
import { ExplanationSchema, MAX_CLAIMS, TOPICS, type CheckedClaim, type RawClaim, type SourceSection, type TopicId } from "./types";

/** Lowercase, straight quotes and dashes, single spaces: so formatting differences don't matter. */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”‟″]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ADVICE = [
  /\b(you|investors|readers) should\b/i,
  /\bwe (recommend|suggest|believe)\b/i,
  /\b(strong )?(buy|sell|hold) (rating|recommendation|the stock|the shares|this stock)\b/i,
  /\bprice target\b/i,
  /\b(under|over)valued\b/i,
  /\b(good|great|bad|safe|risky) (investment|stock to)\b/i,
  /\bworth (buying|investing)\b/i,
  /\bshare price (will|is likely to|could) (rise|fall|go up|go down)\b/i,
];

const MAX_TEXT_CHARS = 420;
const MIN_QUOTE_WORDS = 4;
const MAX_QUOTE_WORDS = 60;

function numbersIn(text: string): string[] {
  return [...text.matchAll(/\d[\d,.]*\d|\d/g)].map((m) => m[0].replace(/[,.]$/, ""));
}

export type CheckResult = { ok: true; claim: CheckedClaim } | { ok: false; reason: string };

/** A link that opens the filing and highlights the quoted words (supported in most modern browsers). */
export function highlightLink(url: string, quote: string): string {
  const words = quote.replace(/\s+/g, " ").trim().split(" ").slice(0, 10).join(" ");
  return `${url}#:~:text=${encodeURIComponent(words).replace(/-/g, "%2D")}`;
}

export function checkClaim(raw: RawClaim, sections: SourceSection[]): CheckResult {
  const text = raw.text.trim();
  const quote = raw.quote.trim().replace(/^["'“‘]+|["'”’]+$/g, "");
  if (!text) return { ok: false, reason: "empty" };
  if (text.length > MAX_TEXT_CHARS) return { ok: false, reason: "too long" };

  const section = sections.find((s) => normalise(s.id) === normalise(raw.section));
  if (!section) return { ok: false, reason: `unknown section "${raw.section}"` };

  const quoteWords = quote.split(/\s+/).filter(Boolean).length;
  if (quoteWords < MIN_QUOTE_WORDS || quoteWords > MAX_QUOTE_WORDS) return { ok: false, reason: "quote length" };
  if (!normalise(section.text).includes(normalise(quote))) return { ok: false, reason: "quote not found in report" };

  const quoteNumbers = new Set(numbersIn(quote));
  const invented = numbersIn(text).filter((n) => !quoteNumbers.has(n));
  if (invented.length > 0) return { ok: false, reason: `number not in quote (${invented.join(", ")})` };

  if (ADVICE.some((re) => re.test(text))) return { ok: false, reason: "advice language" };

  return {
    ok: true,
    claim: {
      text,
      quote,
      source: {
        label: `${section.form} filed ${formatDate(section.filingDate)} · ${section.id.replace(/^10-[KQ] /, "")}, ${section.title}`,
        url: highlightLink(section.url, quote),
        section: section.id,
      },
    },
  };
}

/** Check a whole AI answer. Bad claims are dropped and listed; good ones are kept in order. */
export function checkExplanation(rawJson: unknown, sections: SourceSection[]) {
  const parsed = ExplanationSchema.safeParse(rawJson);
  if (!parsed.success) throw new Error(`AI answer was not in the expected shape: ${parsed.error.message.slice(0, 300)}`);

  const topics = {} as Record<TopicId, CheckedClaim[]>;
  const dropped: { topic: string; reason: string; text: string }[] = [];
  for (const topic of Object.keys(TOPICS) as TopicId[]) {
    const kept: CheckedClaim[] = [];
    const seen = new Set<string>();
    for (const raw of parsed.data[topic]) {
      const result = checkClaim(raw, sections);
      if (!result.ok) {
        dropped.push({ topic, reason: result.reason, text: raw.text });
        continue;
      }
      const key = normalise(result.claim.text);
      if (seen.has(key)) continue;
      seen.add(key);
      if (kept.length < MAX_CLAIMS[topic]) kept.push(result.claim);
    }
    topics[topic] = kept;
  }
  return { topics, dropped };
}

/** Pull the JSON object out of a model's reply, even if it added words around it. */
export function extractJson(reply: string): unknown {
  const fenced = reply.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : reply;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON object found in the AI reply");
  return JSON.parse(body.slice(start, end + 1));
}
