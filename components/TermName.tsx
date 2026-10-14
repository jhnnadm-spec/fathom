import { lookupTerm } from "@/lib/glossary";
import { Term } from "./Term";

/**
 * A real finance term on its own, e.g. "income statement", that explains itself
 * when pointed at. `full` shows the capitalised name for headings ("Income statement").
 */
export function TermName({ k, full = false, label }: { k: string; full?: boolean; label?: string }) {
  const e = lookupTerm(k);
  if (!e) return null;
  return (
    <Term term={e.term} definition={e.definition} why={e.why} more={e}>
      {label ?? (full ? e.term : e.short)}
    </Term>
  );
}
