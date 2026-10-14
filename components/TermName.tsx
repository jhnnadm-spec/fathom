import { lookupTerm } from "@/lib/glossary";
import { Term } from "./Term";

/** A real finance term on its own, e.g. "income statement", that explains itself when pointed at. */
export function TermName({ k }: { k: string }) {
  const e = lookupTerm(k);
  if (!e) return null;
  return (
    <Term term={e.term} definition={e.definition} why={e.why}>
      {e.short}
    </Term>
  );
}
