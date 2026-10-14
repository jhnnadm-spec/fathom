/**
 * Finding a finance term from whatever someone types: "pe ratio", "P/E",
 * "price to earnings" and "pe" all find the P/E ratio.
 */
import { glossaryKeys, lookupTerm, type GlossaryEntry } from "./glossary";

export type TermMatch = { key: string; entry: GlossaryEntry; score: number };

/** Lowercase words only: "P/E ratio (price-to-earnings)" -> "p e ratio price to earnings". */
const words = (x: string) =>
  x
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
/** No spaces at all, so "pe ratio", "p/e ratio" and "PE-ratio" all read the same. */
const compact = (x: string) => words(x).replace(/ /g, "");
/** Without the filler words people add or leave out. */
const core = (x: string) =>
  words(x)
    .split(" ")
    .filter((w) => !["ratio", "the", "a", "of", "what", "is", "s"].includes(w))
    .join("");

/** The names a term goes by: its title, short name, key, the part in brackets, and any aliases. */
function namesOf(key: string, e: GlossaryEntry): string[] {
  const names = [e.term, e.short, key.replace(/-/g, " "), ...(e.aliases ?? [])];
  const bracket = e.term.match(/\(([^)]+)\)/);
  if (bracket) names.push(bracket[1], e.term.replace(/\s*\([^)]*\)/, ""));
  return names;
}

function score(query: string, key: string, e: GlossaryEntry): number {
  const q = compact(query);
  const qc = core(query);
  if (!q) return 0;
  let best = 0;
  for (const name of namesOf(key, e)) {
    const n = compact(name);
    const nc = core(name);
    if (n === q || (qc && nc === qc)) return 100;
    if (q.length >= 2 && (n.startsWith(q) || (qc.length >= 2 && nc.startsWith(qc)))) best = Math.max(best, 80);
    // The typed words appear inside a longer name, starting at a word: "margin" in "gross margin".
    else if (q.length >= 3 && ` ${words(name)}`.includes(` ${words(query)}`)) best = Math.max(best, 65);
  }
  if (best) return best;
  // Every word typed appears somewhere in the term's names: "cash flow" finds free cash flow.
  // Whole words, except a last word of three letters or more, which may still be being typed.
  const typed = words(query).split(" ").filter((w) => w.length > 1 && w !== "ratio");
  const haystack = ` ${namesOf(key, e).map(words).join(" ")} `;
  const found = (w: string, i: number) =>
    haystack.includes(` ${w} `) || (i === typed.length - 1 && w.length >= 3 && haystack.includes(` ${w}`));
  if (typed.length && typed.every(found)) return 50;
  // Finally, the explanation itself mentions it.
  const longWords = typed.filter((w) => w.length >= 3);
  const definition = ` ${words(e.definition)} `;
  if (longWords.length && longWords.every((w) => definition.includes(` ${w} `) || definition.includes(` ${w}s `))) return 20;
  return 0;
}

/** The terms that match, best first. */
export function searchTerms(query: string, limit = 8): TermMatch[] {
  return glossaryKeys()
    .map((key) => {
      const entry = lookupTerm(key)!;
      return { key, entry, score: score(query, key, entry) };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.term.localeCompare(b.entry.term))
    .slice(0, limit);
}
