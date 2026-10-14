"use client";

/** The watchlist page: a card for each saved company with its headline facts and your research progress. */
import Link from "next/link";
import { useEffect, useState } from "react";
import { getProgress, getWatchlist, STORE_EVENT, toggleWatch, type WatchItem } from "@/lib/client/store";
import type { Snapshot } from "@/lib/report/snapshot";

const STEP_COUNT = 7;

export function WatchlistView() {
  const [list, setList] = useState<WatchItem[] | null>(null);
  const [snaps, setSnaps] = useState<Record<string, Snapshot>>({});
  const [, setTick] = useState(0);

  useEffect(() => {
    const sync = () => {
      setList(getWatchlist());
      setTick((t) => t + 1);
    };
    sync();
    window.addEventListener(STORE_EVENT, sync);
    return () => window.removeEventListener(STORE_EVENT, sync);
  }, []);

  const key = (list ?? []).map((x) => x.ticker).join(",");
  useEffect(() => {
    if (!key) return;
    let live = true;
    fetch(`/api/snapshot?t=${encodeURIComponent(key)}`)
      .then((r) => r.json())
      .then((d: { companies: Snapshot[] }) => live && setSnaps(Object.fromEntries(d.companies.map((s) => [s.ticker, s]))))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [key]);

  if (list === null) return <p className="text-[15px] text-muted">Loading your watchlist…</p>;
  if (list.length === 0) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl bg-panel p-6">
        <p className="text-[17px] font-semibold">Nothing saved yet</p>
        <p className="text-[16px] leading-relaxed text-muted">
          Open any company and tap <strong className="text-ink">Add to watchlist</strong>. It&apos;s saved in this browser
          only, so there&apos;s nothing to sign up for.
        </p>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-[15px]">
          Try <Link href="/stock/AAPL">Apple</Link> <Link href="/stock/KO">Coca-Cola</Link> <Link href="/stock/NKE">Nike</Link>{" "}
          <Link href="/sectors">or browse by sector</Link>
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {list.map((w) => {
        const s = snaps[w.ticker];
        const understood = Object.values(getProgress(w.ticker)).filter((v) => v === "understood").length;
        return (
          <li key={w.ticker} className="flex flex-col gap-3 rounded-2xl bg-panel p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col">
                <Link href={`/stock/${w.ticker}`} className="font-display text-xl font-bold text-ink">
                  {s?.name ?? w.name}
                </Link>
                <span className="text-[13px] text-muted">
                  {w.ticker}
                  {s?.sector ? ` · ${s.sector}` : ""}
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggleWatch(w.ticker, w.name)}
                className="min-h-9 rounded-lg px-2 text-[13px] font-semibold text-muted hover:text-ink"
                aria-label={`Remove ${w.name} from your watchlist`}
              >
                Remove
              </button>
            </div>
            {s ? (
              <dl className="flex flex-col gap-1.5">
                {s.facts.map((f) => (
                  <div key={f.label} className="flex items-baseline justify-between gap-3 border-t border-line pt-1.5 text-[14px]">
                    <dt className="text-muted">{f.label}</dt>
                    <dd className="font-semibold">{f.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-[14px] text-muted">Loading…</p>
            )}
            {s?.announcements[0] && (
              <p className="text-[14px] leading-snug">
                <span className="text-muted">Latest announcement: </span>
                <a href={s.announcements[0].url} target="_blank" rel="noopener noreferrer">
                  {s.announcements[0].events.join(", ")}
                </a>
              </p>
            )}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[13px]">
                <span className="text-muted">Your research</span>
                <span className="font-semibold">
                  {understood} of {STEP_COUNT} steps
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-panel-2">
                <div className="h-1.5 rounded-full bg-mid" style={{ width: `${(understood / STEP_COUNT) * 100}%` }} />
              </div>
            </div>
            <Link href={`/stock/${w.ticker}`} className="text-[15px] font-semibold">
              {understood === 0 ? "Start researching" : understood < STEP_COUNT ? "Carry on" : "Revisit"}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
