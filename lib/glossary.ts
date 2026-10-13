/** Plain-English explanations of finance terms, shown when someone taps an underlined word. */
import glossary from "@/content/glossary.json";

export type GlossaryEntry = { term: string; definition: string };

const entries = glossary as Record<string, GlossaryEntry>;

export function lookupTerm(key: string): GlossaryEntry | undefined {
  return entries[key];
}

export function glossaryKeys(): string[] {
  return Object.keys(entries);
}
