"use client";

/**
 * How deep the reader wants to go, for the whole company page:
 *   Surface: the short answer and a picture.
 *   Below:   each answer explained, with the main numbers.
 *   Deep:    everything, with the analyst's view and the reports' own words.
 * Each step can still go deeper on its own; changing the page-wide level resets them.
 * The choice is remembered in this browser only.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Level = "surface" | "below" | "deep";
export const LEVELS: Level[] = ["surface", "below", "deep"];

export const LEVEL_INFO: Record<Level, { name: string; hint: string; color: string; ink: string }> = {
  surface: { name: "Surface", hint: "The short answer", color: "#CDE7F0", ink: "#0a2a3a" },
  below: { name: "Below", hint: "Explained, with numbers", color: "#7FC4D8", ink: "#0a2a3a" },
  deep: { name: "Deep", hint: "Everything, analyst's view", color: "#0B4F6C", ink: "#ffffff" },
};

const KEY = "fathom:depth";

type DepthState = { level: Level; setLevel: (l: Level) => void; stamp: number };
const DepthContext = createContext<DepthState>({ level: "surface", setLevel: () => {}, stamp: 0 });

export function DepthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ level: Level; stamp: number }>({ level: "surface", stamp: 0 });

  // Pick up the reader's last choice once the page is in the browser.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(KEY);
    } catch {
      // storage blocked: start at the surface
    }
    if (saved === "below" || saved === "deep") {
      const level = saved;
      queueMicrotask(() => setState((s) => ({ level, stamp: s.stamp + 1 })));
    }
  }, []);

  const setLevel = (level: Level) => {
    setState((s) => ({ level, stamp: s.stamp + 1 }));
    try {
      window.localStorage.setItem(KEY, level);
    } catch {
      // not remembered next time; that's fine
    }
  };

  return <DepthContext.Provider value={{ ...state, setLevel }}>{children}</DepthContext.Provider>;
}

export function useDepth(): DepthState {
  return useContext(DepthContext);
}

/** Show something only from a given depth down, or only at one depth. */
export function AtDepth({ min, only, children }: { min?: Level; only?: Level; children: ReactNode }) {
  const { level } = useDepth();
  if (only && level !== only) return null;
  if (min && LEVELS.indexOf(level) < LEVELS.indexOf(min)) return null;
  return <>{children}</>;
}

/**
 * The switch itself. "full" shows each level with a short hint (above the steps);
 * "compact" is three small pills for the side menu and the phone's sticky bar.
 */
export function DepthSwitch({ variant = "full" }: { variant?: "full" | "compact" }) {
  const { level, setLevel } = useDepth();
  const index = LEVELS.indexOf(level);
  const compact = variant === "compact";

  return (
    <div
      role="radiogroup"
      aria-label="How much detail to show"
      className={`relative grid grid-cols-3 rounded-2xl border border-line bg-white/80 p-1 ${compact ? "rounded-xl" : ""}`}
    >
      {/* The sliding marker under the chosen level */}
      <span
        aria-hidden="true"
        className={`absolute inset-y-1 left-1 transition-transform duration-300 ease-out motion-reduce:transition-none ${compact ? "rounded-lg" : "rounded-xl"}`}
        style={{
          width: "calc((100% - 0.5rem) / 3)",
          transform: `translateX(${index * 100}%)`,
          background: LEVEL_INFO[level].color,
          boxShadow: "0 4px 14px rgba(10,42,58,0.12)",
        }}
      />
      {LEVELS.map((l) => {
        const on = l === level;
        const info = LEVEL_INFO[l];
        return (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setLevel(l)}
            className={`relative z-[1] flex flex-col items-center justify-center text-center transition-colors duration-300 ${
              compact ? "min-h-9 px-2 text-[13px] font-semibold" : "min-h-[64px] px-3 py-2"
            }`}
            style={{ color: on ? info.ink : "var(--color-muted)" }}
          >
            <span className={`flex items-center gap-1.5 ${compact ? "" : "text-[16px] font-bold"}`}>
              {!compact && <DepthGlyph level={l} on={on} />}
              {info.name}
            </span>
            {!compact && <span className="text-[12px] font-medium opacity-80">{info.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** A tiny picture of the water getting deeper: one, two or three layers. */
function DepthGlyph({ level, on }: { level: Level; on: boolean }) {
  const n = LEVELS.indexOf(level) + 1;
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M1 ${4 + i * 4.5} q3.5 -2 7 0 t7 0`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity={i < n ? 1 : on ? 0.35 : 0.25}
        />
      ))}
    </svg>
  );
}
