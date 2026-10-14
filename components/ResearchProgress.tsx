"use client";

/**
 * On phones and tablets: a slim bar that stays at the top while reading, with
 * how far through the seven questions you are and the depth switch.
 */
import { useEffect, useState } from "react";
import { getProgress, STORE_EVENT, type StepState } from "@/lib/client/store";
import { DepthSwitch } from "./Depth";

export function ResearchProgress({ ticker, steps }: { ticker: string; steps: { id: string; title: string }[] }) {
  const [p, setP] = useState<Record<string, StepState>>({});
  useEffect(() => {
    const sync = () => setP(getProgress(ticker));
    sync();
    window.addEventListener(STORE_EVENT, sync);
    return () => window.removeEventListener(STORE_EVENT, sync);
  }, [ticker]);
  const done = steps.filter((s) => p[s.id]).length;

  return (
    <nav aria-label="Reading progress and detail" className="sticky top-0 z-20 -mx-5 flex flex-col gap-2 border-b border-line bg-white/90 px-5 py-2.5 backdrop-blur lg:hidden">
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[12px] font-semibold text-muted">
            {done} of {steps.length} questions explored
          </span>
          <span className="h-1.5 rounded-full bg-panel-2">
            <span className="block h-1.5 rounded-full bg-mid transition-[width] duration-500" style={{ width: `${(done / steps.length) * 100}%` }} />
          </span>
        </div>
        <div className="w-[210px] flex-none">
          <DepthSwitch variant="compact" />
        </div>
      </div>
    </nav>
  );
}
