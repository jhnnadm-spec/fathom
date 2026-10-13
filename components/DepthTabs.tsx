"use client";

import { useEffect, useState } from "react";

export type DepthPanel = {
  id: string; // "surface", "below" or "deep"
  label: string; // "Surface"
  hint: string; // "1 minute"
  color: string; // the matching layer colour from the logo
  content: React.ReactNode;
};

/**
 * The Surface / Below / Deep switch. All three levels stay on the page; only one shows.
 * Links like "#below-health" open the Below level and scroll to its "health" section,
 * so each explanation can link to the deeper one.
 */
export function DepthTabs({ panels }: { panels: DepthPanel[] }) {
  const [active, setActive] = useState(panels[0]?.id);

  useEffect(() => {
    const follow = () => {
      const hash = decodeURIComponent(window.location.hash.slice(1));
      const level = panels.find((p) => hash === p.id || hash.startsWith(`${p.id}-`));
      if (!level) return;
      setActive(level.id);
      // Scroll after the chosen level has been shown.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const el = document.getElementById(hash === level.id ? "levels" : hash);
          if (!el) return;
          const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
          el.focus({ preventScroll: true });
        }),
      );
    };
    const onLoad = setTimeout(follow, 0); // a link from another page, like /stock/AAPL#deep-health
    window.addEventListener("hashchange", follow);
    return () => {
      clearTimeout(onLoad);
      window.removeEventListener("hashchange", follow);
    };
  }, [panels]);

  return (
    <div id="levels" className="flex scroll-mt-6 flex-col gap-8">
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
              onClick={() => {
                setActive(p.id);
                history.replaceState(null, "", `#${p.id}`);
              }}
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
