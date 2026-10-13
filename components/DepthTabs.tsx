"use client";

import { useState } from "react";

export type DepthPanel = {
  id: string;
  label: string; // "Surface"
  hint: string; // "1 minute"
  color: string; // the matching layer colour from the logo
  content: React.ReactNode;
};

/** The Surface / Below / Deep switch. All three levels stay on the page; only one shows. */
export function DepthTabs({ panels }: { panels: DepthPanel[] }) {
  const [active, setActive] = useState(panels[0]?.id);

  return (
    <div className="flex flex-col gap-8">
      <div role="tablist" aria-label="How much detail" className="flex gap-6 border-b border-line sm:gap-8">
        {panels.map((p) => {
          const on = p.id === active;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              id={`tab-${p.id}`}
              aria-selected={on}
              aria-controls={`panel-${p.id}`}
              onClick={() => setActive(p.id)}
              className={`-mb-px flex min-h-11 items-baseline gap-2 border-b-[3px] pb-2.5 pt-1 text-[17px] font-semibold transition-colors ${
                on ? "text-ink" : "border-transparent text-muted hover:text-ink"
              }`}
              style={on ? { borderColor: p.color === "#CDE7F0" ? "#7FC4D8" : p.color } : undefined}
            >
              {p.label}
              <span className="hidden text-[13px] font-normal text-muted sm:inline">{p.hint}</span>
            </button>
          );
        })}
      </div>
      {panels.map((p) => (
        <div key={p.id} role="tabpanel" id={`panel-${p.id}`} aria-labelledby={`tab-${p.id}`} hidden={p.id !== active}>
          {p.content}
        </div>
      ))}
    </div>
  );
}
