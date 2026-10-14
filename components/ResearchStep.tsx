"use client";

/**
 * One step of the research path. It starts with the short version; the reader
 * chooses to go deeper (Below), then all the way (Deep), right where they are.
 */
import { useRef, useState, type ReactNode } from "react";
import { markStep } from "@/lib/client/store";

export function ResearchStep({
  ticker,
  id,
  number,
  title,
  question,
  surface,
  below,
  deep,
  why,
  term,
}: {
  ticker: string;
  id: string;
  number: number;
  title: string;
  question: string;
  surface: ReactNode;
  below?: ReactNode;
  deep?: ReactNode;
  why: string; // why a first-timer is being shown this step
  term?: ReactNode; // the real name for what this step covers, e.g. "income statement"
}) {
  const [depth, setDepth] = useState(0);
  const top = useRef<HTMLElement>(null);

  function go(to: number) {
    setDepth(to);
    if (to > 0) markStep(ticker, id, "explored");
    if (to === 0) top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section ref={top} id={`step-${id}`} className="flex scroll-mt-24 flex-col gap-5" aria-labelledby={`step-${id}-title`}>
      <header className="flex items-start gap-4">
        <span aria-hidden="true" className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-ocean font-display text-lg font-bold text-abyss">
          {number}
        </span>
        <div className="flex flex-col gap-0.5">
          <h2 id={`step-${id}-title`} className="font-display text-2xl font-bold">
            {title}
          </h2>
          <p className="text-[16px] text-muted">{question}</p>
          {term && <p className="mt-1 text-[13px] text-muted">The finance term for this: {term}</p>}
        </div>
      </header>

      <p className="rounded-xl bg-surface/40 px-4 py-3 text-[15px] leading-relaxed">
        <strong className="font-semibold">Why this matters: </strong>
        {why}
      </p>

      <div className="flex flex-col gap-4">{surface}</div>

      {depth >= 1 && (
        <div className="flex flex-col gap-6 rounded-2xl border-l-4 border-shallow bg-white/50 py-2 pl-5 pr-1">
          <p className="text-[13px] font-semibold text-mid">{depth === 1 ? "Going deeper" : "Everything on this"}</p>
          {depth === 1 ? below : deep}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {depth === 0 && below && <DepthButton onClick={() => go(1)}>Go deeper</DepthButton>}
        {depth <= 1 && deep && (depth === 1 || !below) && <DepthButton onClick={() => go(2)}>See everything on this</DepthButton>}
        {depth > 0 && (
          <button type="button" onClick={() => go(0)} className="min-h-11 rounded-xl px-3 text-[15px] font-semibold text-muted hover:text-ink">
            Back to the short version
          </button>
        )}
      </div>

    </section>
  );
}

function DepthButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-panel px-4 text-[15px] font-semibold text-ocean hover:bg-white"
    >
      {children}
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  );
}
