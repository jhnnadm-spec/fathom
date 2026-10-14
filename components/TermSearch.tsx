"use client";

/**
 * Look up a finance term by typing it: "pe ratio", "roe", "free cash flow".
 * Matching terms appear as you type; choosing one shows its full explanation,
 * including the analyst's view and the devil's advocate for key ratios.
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { lookupTerm } from "@/lib/glossary";
import { searchTerms } from "@/lib/term-search";
import { AnalystView } from "./Term";

export function TermSearch({
  onPick,
  placeholder = "Look up a term, like P/E ratio or free cash flow",
  label = "Look up a finance term",
}: {
  /** Return true when the caller has shown the term itself (for example on the map); otherwise it's shown here. */
  onPick?: (key: string) => boolean;
  placeholder?: string;
  label?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [shown, setShown] = useState<string | null>(null);
  const [missed, setMissed] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();
  const inputId = useId();

  const matches = useMemo(() => (query.trim() ? searchTerms(query, 7) : []), [query]);

  // Clicking anywhere outside the search closes its list of suggestions.
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const pick = (key: string) => {
    setOpen(false);
    setMissed(null);
    setQuery(lookupTerm(key)?.term ?? query);
    if (onPick?.(key)) setShown(null);
    else setShown(key);
  };

  const submit = () => {
    if (matches[cursor]) pick(matches[cursor].key);
    else if (query.trim()) {
      setShown(null);
      setMissed(query.trim());
      setOpen(false);
    }
  };

  const entry = shown ? lookupTerm(shown) : undefined;

  return (
    <div ref={box} className="relative flex w-full max-w-xl flex-col gap-3">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-center gap-2.5 rounded-xl border border-line bg-white/85 px-3 focus-within:border-mid"
      >
        <label htmlFor={inputId} className="sr-only">
          {label}
        </label>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A6573" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" />
        </svg>
        <input
          id={inputId}
          type="search"
          role="combobox"
          aria-expanded={open && matches.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && matches[cursor] ? `${listId}-${matches[cursor].key}` : undefined}
          autoComplete="off"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setCursor(0);
            setOpen(true);
            setMissed(null);
          }}
          onFocus={() => query && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setCursor((c) => Math.min(c + 1, matches.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setCursor((c) => Math.max(c - 1, 0));
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className="w-full bg-transparent py-2.5 text-[15px] text-ink outline-none placeholder:text-[#6B8592]"
        />
      </form>

      {open && matches.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Matching terms"
          className="fathom-pop absolute left-0 right-0 top-[50px] z-30 flex flex-col overflow-hidden rounded-xl border border-line bg-white py-1 shadow-[0_12px_32px_rgba(11,79,108,0.18)]"
        >
          {matches.map((m, i) => (
            <li
              key={m.key}
              id={`${listId}-${m.key}`}
              role="option"
              aria-selected={i === cursor}
              onMouseEnter={() => setCursor(i)}
              onMouseDown={(e) => e.preventDefault()} // keep focus in the box until the click lands
              onClick={() => pick(m.key)}
              className={`flex cursor-pointer flex-col px-3.5 py-2 ${i === cursor ? "bg-surface/50" : ""}`}
            >
              <span className="text-[15px] font-semibold text-ink">{m.entry.term}</span>
              <span className="line-clamp-1 text-[13px] text-muted">{m.entry.definition}</span>
            </li>
          ))}
        </ul>
      )}

      {missed && (
        <p className="text-[14px] text-muted" aria-live="polite">
          No term matches &ldquo;{missed}&rdquo; yet. Try another name for it, such as &ldquo;EPS&rdquo; or &ldquo;earnings per
          share&rdquo;.
        </p>
      )}

      {entry && shown && (
        <div className="fathom-pop flex flex-col rounded-2xl border border-line bg-white p-5 shadow-[0_8px_24px_rgba(11,79,108,0.08)]" aria-live="polite">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-xl font-bold leading-tight">{entry.term}</h3>
            <button type="button" onClick={() => setShown(null)} className="text-[13px] font-semibold text-muted hover:text-ink">
              Close
            </button>
          </div>
          <p className="mt-1.5 text-[15px] leading-relaxed">{entry.definition}</p>
          {entry.why && (
            <p className="mt-2 text-[14px] leading-relaxed text-muted">
              <strong className="font-semibold text-ink">Why it matters: </strong>
              {entry.why}
            </p>
          )}
          <AnalystView analyst={entry.analyst} reading={entry.reading} caveat={entry.caveat} sides={entry.sides} />
        </div>
      )}
    </div>
  );
}
