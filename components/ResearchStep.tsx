"use client";

/**
 * One step of the research path. It follows the page-wide depth (Surface, Below,
 * Deep), and can also go deeper on its own, right where the reader is.
 * Surface is the short answer and a picture; each level down adds more words.
 */
import { useRef, useState, type ReactNode } from "react";
import { markStep } from "@/lib/client/store";
import { LEVEL_INFO, LEVELS, useDepth, type Level } from "./Depth";

export function ResearchStep({
  ticker,
  id,
  number,
  total,
  label,
  question,
  brief,
  term,
  art,
  surface,
  below,
  deep,
}: {
  ticker: string;
  id: string;
  number: number;
  total: number;
  label: string; // e.g. "Growth and profit"
  question: string; // the plain question this step answers
  brief: string; // one short line on why it matters
  term: ReactNode; // the real finance term, shown as a tag
  art?: ReactNode;
  surface: ReactNode;
  below?: ReactNode;
  deep?: ReactNode;
}) {
  const page = useDepth();
  // A step's own choice lasts until the page-wide level is changed again.
  const [own, setOwn] = useState<{ level: Level; stamp: number } | null>(null);
  const level = own && own.stamp === page.stamp ? own.level : page.level;
  const top = useRef<HTMLElement>(null);

  const bodies: Record<Level, ReactNode> = { surface, below: below ?? surface, deep: deep ?? below ?? surface };
  const i = LEVELS.indexOf(level);
  const next = LEVELS.slice(i + 1).find((l) => (l === "below" ? below : deep));

  function go(to: Level) {
    setOwn({ level: to, stamp: page.stamp });
    if (to !== "surface") markStep(ticker, id, "explored");
    else top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section ref={top} id={`step-${id}`} className="flex scroll-mt-24 flex-col gap-7 lg:scroll-mt-8" aria-labelledby={`step-${id}-title`}>
      <header className="flex items-start justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-3">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] font-semibold uppercase tracking-[0.12em] text-mid">
            <span>
              Step {number} of {total} · {label}
            </span>
            <span className="normal-case tracking-normal">{term}</span>
          </p>
          <h2 id={`step-${id}-title`} className="font-display text-[30px] font-bold leading-[1.1] tracking-tight sm:text-[38px]">
            {question}
          </h2>
          <p className="max-w-2xl text-[17px] leading-relaxed text-muted">{brief}</p>
        </div>
        {art && <div className="hidden sm:block">{art}</div>}
      </header>

      <div key={level} className="fathom-fade flex flex-col gap-6">
        {level !== "surface" && <LevelTag level={level} />}
        {bodies[level]}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {next && (
          <button
            type="button"
            onClick={() => go(next)}
            className="group inline-flex min-h-11 items-center gap-2 rounded-full bg-ocean px-5 text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(11,79,108,0.18)] transition hover:bg-ocean-dark"
          >
            Go deeper
            <span className="font-normal opacity-80">· {LEVEL_INFO[next].name}</span>
            <svg className="transition-transform group-hover:translate-y-0.5" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M6 13l6 6 6-6" />
            </svg>
          </button>
        )}
        {level !== "surface" && (
          <button type="button" onClick={() => go("surface")} className="min-h-11 rounded-full px-4 text-[15px] font-semibold text-muted hover:text-ink">
            Back to the short answer
          </button>
        )}
      </div>
    </section>
  );
}

/** A small marker saying how deep this step is showing. */
function LevelTag({ level }: { level: Level }) {
  const info = LEVEL_INFO[level];
  return (
    <span
      className="inline-flex items-center gap-2 self-start rounded-full px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.1em]"
      style={{ background: info.color, color: info.ink }}
    >
      {info.name} · {info.hint}
    </span>
  );
}

/** The line between two steps: a gentle wave with the next step's number (or a dot) in it. */
export function StepDivider({ number }: { number?: number }) {
  const wave = (
    <svg width="64" height="14" viewBox="0 0 64 14" className="flex-none text-shallow">
      <path d="M2 7c5-6 10-6 15 0s10 6 15 0 10-6 15 0 10 6 15 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
  return (
    <div aria-hidden="true" className="flex items-center gap-3 py-2 sm:gap-4">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-line" />
      {wave}
      {number !== undefined ? (
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-line bg-white font-display text-[15px] font-bold text-ocean shadow-[0_4px_12px_rgba(10,42,58,0.06)]">
          {number}
        </span>
      ) : (
        <span className="h-2.5 w-2.5 flex-none rounded-full bg-mid" />
      )}
      {wave}
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-line" />
    </div>
  );
}
