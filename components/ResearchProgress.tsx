"use client";

/** The research path at a glance: seven steps, ticked as you explore and understand them. */
import { useEffect, useState } from "react";
import { getProgress, STORE_EVENT, type StepState } from "@/lib/client/store";

export function ResearchProgress({ ticker, steps }: { ticker: string; steps: { id: string; title: string }[] }) {
  const [p, setP] = useState<Record<string, StepState>>({});
  useEffect(() => {
    const sync = () => setP(getProgress(ticker));
    sync();
    window.addEventListener(STORE_EVENT, sync);
    return () => window.removeEventListener(STORE_EVENT, sync);
  }, [ticker]);
  const done = steps.filter((s) => p[s.id] === "understood").length;

  return (
    <nav aria-label="Research path" className="sticky top-0 z-10 -mx-5 flex flex-col gap-2 bg-white/85 px-5 py-3 backdrop-blur">
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="font-semibold text-ocean">Your research path</span>
        <span className="text-muted">
          {done} of {steps.length} understood
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-panel-2">
        <div className="h-1.5 rounded-full bg-mid transition-[width] duration-500" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ol className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {steps.map((s, i) => {
          const st = p[s.id];
          return (
            <li key={s.id} className="flex-none">
              <a
                href={`#step-${s.id}`}
                className={`flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold no-underline ${
                  st === "understood" ? "bg-ocean text-abyss" : st === "explored" ? "bg-shallow/40 text-ocean" : "bg-panel-2 text-muted hover:text-ink"
                }`}
              >
                {st === "understood" ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                ) : (
                  <span aria-hidden="true">{i + 1}</span>
                )}
                {s.title}
                <span className="sr-only">{st === "understood" ? "(understood)" : st === "explored" ? "(explored)" : ""}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
