"use client";

/** The front page section for the companies someone has saved: their news first, then official announcements. */
import Link from "next/link";
import { useEffect, useState } from "react";
import { getWatchlist, STORE_EVENT, type WatchItem } from "@/lib/client/store";
import type { Snapshot } from "@/lib/report/snapshot";
import { NewsTabs } from "./NewsTabs";

export function WatchlistHome() {
  const [list, setList] = useState<WatchItem[] | null>(null);
  const [snaps, setSnaps] = useState<Snapshot[]>([]);

  useEffect(() => {
    const sync = () => setList(getWatchlist());
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
      .then((d: { companies: Snapshot[] }) => live && setSnaps(d.companies))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [key]);

  if (!list || list.length === 0) return null;

  const announcements = snaps
    .flatMap((s) => s.announcements.map((a) => ({ ...a, name: s.name, ticker: s.ticker })))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl font-bold">Your watchlist</h2>
        <Link href="/watchlist" className="text-[15px] font-semibold">
          See all {list.length} saved
        </Link>
      </div>
      {snaps.length === 0 ? (
        <p className="text-[15px] text-muted">Loading the latest on your companies…</p>
      ) : (
        <>
          <NewsTabs companies={snaps.map((s) => ({ ticker: s.ticker, name: s.name, symbol: s.symbol }))} />
          {announcements.length > 0 && (
            <div className="flex flex-col gap-3 rounded-2xl bg-panel p-5">
              <h3 className="text-[15px] font-semibold">Latest official announcements</h3>
              <p className="-mt-2 text-[13px] text-muted">What the companies themselves reported to the SEC (form 8-K).</p>
              <ol className="relative flex flex-col gap-4 border-l-2 border-surface pl-5">
                {announcements.map((a) => (
                  <li key={a.url + a.ticker} className="relative flex flex-col gap-0.5">
                    <span aria-hidden="true" className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-mid" />
                    <span className="text-[13px] font-semibold text-ocean">
                      {new Date(`${a.date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })} ·{" "}
                      <Link href={`/stock/${a.ticker}`} className="fathom-grow">{a.name}</Link>
                    </span>
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-[16px] text-ink">
                      {a.events.join(", ")}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}
    </section>
  );
}
