/** Plain-English explanations of finance terms, shown when someone taps an underlined word. */
import glossary from "@/content/glossary.json";

export type GlossaryEntry = {
  term: string; // the full name
  short: string; // the name shown in brackets after plain words, e.g. "net income"
  definition: string; // what it is, in plain English
  why?: string; // why someone looking at a company should care
  analyst?: string; // why analysts look at this number
  reading?: string; // what a high or low figure can suggest
  caveat?: string; // the devil's advocate: why that reading can mislead
};

const entries = glossary as Record<string, GlossaryEntry>;

export function lookupTerm(key: string): GlossaryEntry | undefined {
  return entries[key];
}

export function glossaryKeys(): string[] {
  return Object.keys(entries);
}

/** The real term to show in brackets, or nothing when the plain words already say it. */
export function bracketFor(shown: string, short: string): string | undefined {
  // Compare loosely: ignore case, punctuation and plural "s" ("buybacks" already says "buyback").
  const norm = (x: string) =>
    x
      .toLowerCase()
      .replace(/[^a-z0-9/]+/g, " ")
      .trim()
      .split(" ")
      .map((w) => w.replace(/s$/, ""))
      .join(" ");
  const a = norm(shown);
  const b = norm(short);
  // Skip when the plain words already contain the term ("restatement notices"), or are its last word ("buybacks" for "share buyback").
  return a.includes(b) || b.endsWith(a) ? undefined : short;
}

/** A sentence as plain text, with the real term in brackets after plain words: for the PDF. */
export function withTerms(text: string): string {
  return text.replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, (_, key: string, shown: string) => {
    const e = lookupTerm(key);
    const b = e ? bracketFor(shown, e.short) : undefined;
    return b ? `${shown} (${b})` : shown;
  });
}
