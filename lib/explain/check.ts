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

/**
 * Find the quote in the section text. First an exact match (ignoring spacing and
 * quote styles); failing that, a passage with at least 90% of the same words in
 * the same order, starting and ending on the same words. Returns the report's
 * ACTUAL words, so whatever is shown is always real text from the filing.
 */
export function locateQuote(sectionText: string, quote: string): string | undefined {
  const nq = normalise(quote);
  const ns = normalise(sectionText);
  if (ns.includes(nq)) return quote;

  const wordRe = /[\p{L}\p{N}]+(?:['\u2019][\p{L}]+)?/gu;
  const sectionWords = [...sectionText.matchAll(wordRe)].map((m) => ({ w: normalise(m[0]).replace(/\u2019/g, "'"), start: m.index!, end: m.index! + m[0].length }));
  const quoteWords = [...quote.matchAll(wordRe)].map((m) => normalise(m[0]).replace(/\u2019/g, "'"));
  const n = quoteWords.length;
  if (n < 8) return undefined;

  let best: { score: number; from: number; to: number } | undefined;
  for (let i = 0; i < sectionWords.length; i++) {
    if (sectionWords[i].w !== quoteWords[0]) continue;
    // Walk the quote and the text together, allowing a few skipped words on either side.
    let qi = 1;
    let si = i + 1;
    let matched = 1;
    let last = i;
    while (qi < n && si < sectionWords.length && si <= i + n + 3) {
      if (sectionWords[si].w === quoteWords[qi]) {
        matched++;
        last = si;
        qi++;
        si++;
      } else if (qi + 1 < n && sectionWords[si].w === quoteWords[qi + 1]) {
        qi++; // the quote has an extra word
      } else {
        si++; // the text has an extra word
      }
    }
    const endsMatch = sectionWords[last].w === quoteWords[n - 1];
    const span = last - i + 1;
    const score = matched / Math.max(n, span);
    if (endsMatch && score >= 0.9 && (!best || score > best.score)) best = { score, from: i, to: last };
  }
  if (!best) return undefined;
  return sectionText.slice(sectionWords[best.from].start, sectionWords[best.to].end);
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
  const found = locateQuote(section.text, quote);
  if (!found) return { ok: false, reason: "quote not found in report" };

  const quoteNumbers = new Set(numbersIn(found));
  const invented = numbersIn(text).filter((n) => !quoteNumbers.has(n));
  if (invented.length > 0) return { ok: false, reason: `number not in quote (${invented.join(", ")})` };

  if (ADVICE.some((re) => re.test(text))) return { ok: false, reason: "advice language" };

  return {
    ok: true,
    claim: {
      text,
      quote: found,
      source: {
        label: `${section.form} filed ${formatDate(section.filingDate)} · ${section.id.replace(/^10-[KQ] /, "")}, ${section.title}`,
        url: highlightLink(section.url, found),
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
  const seen = new Set<string>(); // the same point is only kept once, under the first topic it appears in
  const dropped: { topic: string; reason: string; text: string; quote?: string }[] = [];
  for (const topic of Object.keys(TOPICS) as TopicId[]) {
    const kept: CheckedClaim[] = [];
    for (const raw of parsed.data[topic]) {
      const result = checkClaim(raw, sections);
      if (!result.ok) {
        dropped.push({ topic, reason: result.reason, text: raw.text, quote: raw.quote });
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
