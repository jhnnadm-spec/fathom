"use client";

/** Every finance term Fathom explains, with a box to narrow them down as you type. */
import { useMemo, useState } from "react";
import { glossaryKeys, lookupTerm } from "@/lib/glossary";
import { searchTerms } from "@/lib/term-search";
import { AnalystView } from "./Term";

export function TermsBrowser({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const all = useMemo(
    () =>
      glossaryKeys()
        .map((key) => ({ key, entry: lookupTerm(key)!, score: 0 }))
        .sort((a, b) => a.entry.term.localeCompare(b.entry.term)),
    [],
  );
  const list = query.trim() ? searchTerms(query, 100) : all;
  // A clear match opens straight away, so "pe ratio" shows the P/E ratio in full.
  const openFirst = query.trim() !== "" && list[0]?.score === 100;

  return (
    <div className="flex flex-col gap-5">
      <form role="search" onSubmit={(e) => e.preventDefault()} className="flex max-w-2xl items-center gap-2.5 rounded-2xl border border-line bg-panel p-2 px-4">
        <label htmlFor="term-q" className="sr-only">
          Search finance terms
        </label>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4A6573" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" />
        </svg>
        <input
          id="term-q"
          type="search"
          autoFocus
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Try P/E ratio, ROE, dividend yield or capex"
          className="w-full bg-transparent py-3 text-lg text-ink outline-none placeholder:text-[#6B8592]"
        />
      </form>

      <p className="text-[14px] text-muted" aria-live="polite">
        {query.trim()
          ? list.length
            ? `${list.length} term${list.length === 1 ? "" : "s"} match “${query.trim()}”`
            : `No term matches “${query.trim()}” yet. Try another name for it, such as “EPS” or “earnings per share”.`
          : `${list.length} terms, A to Z. Ratios marked “both sides” show when a high or low figure can be good or bad.`}
      </p>

      <ul className="grid grid-cols-1 items-start gap-3 md:grid-cols-2">
        {list.map(({ key, entry }, i) => (
          <li key={key} id={key} className="scroll-mt-6">
            <details open={openFirst && i === 0} className="group rounded-2xl bg-panel p-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none flex-col gap-1.5">
                <span className="flex items-start justify-between gap-3">
                  <span className="font-display text-xl font-bold leading-tight">{entry.term}</span>
                  <span className="flex flex-none items-center gap-2">
                    {entry.sides && (
                      <span className="rounded-full bg-[#fbe9e1] px-2 py-0.5 text-[12px] font-semibold text-[#9a4320]">both sides</span>
                    )}
                    <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-180">
                      ▾
                    </span>
                  </span>
                </span>
                <span className="text-[15px] leading-relaxed">{entry.definition}</span>
              </summary>
              <div className="mt-3 flex flex-col">
                {entry.why && (
                  <p className="text-[14px] leading-relaxed text-muted">
                    <strong className="font-semibold text-ink">Why it matters: </strong>
                    {entry.why}
                  </p>
                )}
                <AnalystView analyst={entry.analyst} reading={entry.reading} caveat={entry.caveat} sides={entry.sides} />
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
