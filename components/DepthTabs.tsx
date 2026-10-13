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
      <div role="tablist" aria-label="How much detail" className="sticky top-0 z-10 -mx-5 flex gap-2 bg-abyss/90 px-5 py-3 backdrop-blur">
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
              className={`flex min-h-11 items-baseline gap-2 rounded-full px-4 py-2.5 text-[16px] font-semibold transition-colors ${
                on ? "bg-ocean text-abyss" : "bg-panel-2 text-muted hover:text-ink"
              }`}
            >
              {p.label}
              <span className={`hidden text-[13px] font-normal sm:inline ${on ? "text-abyss/70" : "text-muted"}`}>{p.hint}</span>
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
