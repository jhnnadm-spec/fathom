"use client";

/**
 * How much detail the reader wants, for the whole company page:
 *   Short:      the quick answer and a picture.
 *   Explained:  each answer explained, with the main numbers.
 *   Everything: every detail, with the analyst's view and the reports' own words.
 * Each question can still show more on its own; changing the page-wide level resets them.
 * The choice is remembered in this browser only.
 * (In the code the levels keep their older names: surface, below and deep.)
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Level = "surface" | "below" | "deep";
export const LEVELS: Level[] = ["surface", "below", "deep"];

export const LEVEL_INFO: Record<Level, { name: string; hint: string }> = {
  surface: { name: "Short", hint: "The quick answer" },
  below: { name: "Explained", hint: "With the numbers" },
  deep: { name: "Everything", hint: "Every detail" },
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
      // storage blocked: start with the short answers
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

/** Show something only at some depths: from `min` down, up to `max`, or at exactly `only`. */
export function AtDepth({ min, max, only, children }: { min?: Level; max?: Level; only?: Level; children: ReactNode }) {
  const { level } = useDepth();
  const i = LEVELS.indexOf(level);
  if (only && level !== only) return null;
  if (min && i < LEVELS.indexOf(min)) return null;
  if (max && i > LEVELS.indexOf(max)) return null;
  return <>{children}</>;
}

/** Three plain buttons in a row: Short, Explained, Everything. */
export function DepthSwitch() {
  const { level, setLevel } = useDepth();
  return (
    <div role="radiogroup" aria-label="How much detail to show" className="grid grid-cols-3 gap-1 rounded-xl bg-panel-2 p-1">
      {LEVELS.map((l) => {
        const on = l === level;
        return (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={on}
            title={LEVEL_INFO[l].hint}
            onClick={() => setLevel(l)}
            className={`min-h-9 rounded-lg px-2 text-[14px] font-semibold transition-colors ${
              on ? "bg-white text-ocean shadow-[0_1px_3px_rgba(10,42,58,0.12)]" : "text-muted hover:text-ink"
            }`}
          >
            {LEVEL_INFO[l].name}
          </button>
        );
      })}
    </div>
  );
}

/** A slim bar that stays at the top of a company page while reading, holding the detail switch. */
export function DetailBar() {
  const { level } = useDepth();
  return (
    <div className="sticky top-0 z-20 -mx-5 border-b border-line bg-white/95 px-5 py-2.5 backdrop-blur sm:mx-0 sm:px-0">
      <div className="mx-auto flex max-w-[760px] items-center justify-between gap-3">
        <span className="hidden text-[14px] font-semibold text-muted sm:block">
          How much detail? <span className="font-normal">{LEVEL_INFO[level].hint}</span>
        </span>
        <div className="w-full sm:w-[300px]">
          <DepthSwitch />
        </div>
      </div>
    </div>
  );
}
