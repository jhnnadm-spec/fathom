/**
 * Small things remembered in this browser only: the watchlist and how far
 * someone has got through each company's research path. Nothing is sent
 * anywhere. If the browser blocks storage, everything still works; it just
 * isn't remembered next time.
 */
export type WatchItem = { ticker: string; name: string; addedAt: string };
export type StepState = "explored" | "understood";

const WATCH_KEY = "fathom:watchlist";
const progressKey = (ticker: string) => `fathom:progress:${ticker}`;
export const STORE_EVENT = "fathom:store";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage blocked or full: carry on without remembering
  }
  window.dispatchEvent(new Event(STORE_EVENT));
}

export function getWatchlist(): WatchItem[] {
  const list = read<WatchItem[]>(WATCH_KEY, []);
  return Array.isArray(list) ? list.filter((x) => x && typeof x.ticker === "string") : [];
}

export function isWatched(ticker: string): boolean {
  return getWatchlist().some((x) => x.ticker === ticker);
}

export function toggleWatch(ticker: string, name: string): boolean {
  const list = getWatchlist();
  const on = list.some((x) => x.ticker === ticker);
  write(WATCH_KEY, on ? list.filter((x) => x.ticker !== ticker) : [...list, { ticker, name, addedAt: new Date().toISOString() }]);
  return !on;
}

export function getProgress(ticker: string): Record<string, StepState> {
  return read<Record<string, StepState>>(progressKey(ticker), {});
}

export function markStep(ticker: string, step: string, state: StepState) {
  const p = getProgress(ticker);
  if (p[step] === "understood" && state === "explored") return;
  if (p[step] === state) return;
  write(progressKey(ticker), { ...p, [step]: state });
}
