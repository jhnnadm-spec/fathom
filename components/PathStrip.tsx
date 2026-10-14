"use client";

/**
 * The seven questions as a row of pictures joined by a line, like stops on a
 * route. Each one jumps to its step, and is ticked once explored.
 */
import { useEffect, useState, type ReactNode } from "react";
import { getProgress, STORE_EVENT, type StepState } from "@/lib/client/store";

export function PathStrip({ ticker, steps }: { ticker: string; steps: { id: string; title: string; art: ReactNode }[] }) {
  const [p, setP] = useState<Record<string, StepState>>({});
  useEffect(() => {
    const sync = () => setP(getProgress(ticker));
    sync();
    window.addEventListener(STORE_EVENT, sync);
    return () => window.removeEventListener(STORE_EVENT, sync);
  }, [ticker]);

  return (
    <nav aria-label="The seven questions" className="-mx-2 overflow-x-auto px-2 pb-1">
      <ol className="relative m-0 grid min-w-[720px] list-none grid-cols-7 gap-2 p-0">
        {/* the route line behind the stops */}
        <span aria-hidden="true" className="absolute left-[7%] right-[7%] top-[26px] h-[2px] bg-gradient-to-r from-surface via-shallow to-mid" />
        {steps.map((s, i) => {
          const done = Boolean(p[s.id]);
          return (
            <li key={s.id} className="relative">
              <a href={`#step-${s.id}`} className="group flex flex-col items-center gap-2 rounded-2xl px-1 py-1 text-center text-ink no-underline">
                <span className="relative transition-transform duration-300 group-hover:-translate-y-1">
                  {s.art}
                  {done && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#14805a] text-white ring-2 ring-white">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      <span className="sr-only">explored</span>
                    </span>
                  )}
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="text-[12px] font-semibold text-mid">{i + 1}</span>
                  <span className="text-[14px] font-semibold group-hover:text-ocean">{s.title}</span>
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
