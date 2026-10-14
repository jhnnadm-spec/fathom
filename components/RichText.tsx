import { Fragment } from "react";
import { bracketFor, lookupTerm } from "@/lib/glossary";

export { bracketFor };
import { Term } from "./Term";

/**
 * Shows a sentence, turning markers like [[net-income|kept as profit]] into
 * plain words with the real term in brackets, "kept as profit (net income)",
 * that explain themselves when pointed at or tapped. Unknown terms are shown as plain text.
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
          <Term key={i} term={entry.term} definition={entry.definition} why={entry.why} bracket={bracketFor(m[2], entry.short)}>
            {m[2]}
          </Term>
        );
      })}
    </>
  );
}
