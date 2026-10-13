"use client";

import { useState } from "react";

export type DepthPanel = {
  id: string;
  label: string; // "Surface"
  hint: string; // "30 seconds"
  color: string; // swatch colour from the logo's layers
  content: React.ReactNode;
};

/** The Surface / Below / Deep switch. All three levels stay on the page; only one shows. */
export function DepthTabs({ panels }: { panels: DepthPanel[] }) {
  const [active, setActive] = useState(panels[0]?.id);

  return (
    <div className="flex flex-col gap-6">
      <div
        role="tablist"
        aria-label="How deep to go"
        className="flex flex-wrap gap-1.5 self-start rounded-2xl border border-line bg-white p-1.5"
      >
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
              className={`flex min-h-11 items-center gap-2 rounded-xl px-4 py-2.5 text-[15px] font-semibold transition-colors ${
                on ? "bg-ocean text-white" : "text-ink hover:bg-mist"
              }`}
            >
              <span
                aria-hidden="true"
                className={`h-3 w-3 rounded ${on ? "ring-2 ring-white" : "ring-1 ring-[#A9CBD8]"}`}
                style={{ background: p.color }}
              />
              {p.label}
              <span className="text-[13px] font-medium opacity-80">{p.hint}</span>
            </button>
          );
        })}
      </div>
      {panels.map((p) => (
        <div
          key={p.id}
          role="tabpanel"
          id={`panel-${p.id}`}
          aria-labelledby={`tab-${p.id}`}
          hidden={p.id !== active}
        >
          {p.content}
        </div>
      ))}
    </div>
  );
}
