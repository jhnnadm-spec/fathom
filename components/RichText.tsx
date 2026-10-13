import { Fragment } from "react";
import { lookupTerm } from "@/lib/glossary";
import { Term } from "./Term";

/**
 * Shows a sentence, turning markers like [[revenue|Revenue]] into tappable
 * explanations. Unknown terms are shown as plain text.
 */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\[\[[^|\]]+\|[^\]]+\]\])/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\[\[([^|\]]+)\|([^\]]+)\]\]$/);
        if (!m) return <Fragment key={i}>{part}</Fragment>;
        const entry = lookupTerm(m[1]);
        if (!entry) return <Fragment key={i}>{m[2]}</Fragment>;
        return (
          <Term key={i} term={entry.term} definition={entry.definition}>
            {m[2]}
          </Term>
        );
      })}
    </>
  );
}
