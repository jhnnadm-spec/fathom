"use client";

/** The watchlist page: a card for each saved company with its headline facts and your research progress. */
import Link from "next/link";
import { useEffect, useState } from "react";
import { getProgress, getWatchlist, STORE_EVENT, toggleWatch, type WatchItem } from "@/lib/client/store";
import type { Snapshot } from "@/lib/report/snapshot";
import { CompanyLogo } from "./CompanyLogo";

const SUGGESTED = [
  { ticker: "AAPL", name: "Apple", site: "https://www.apple.com" },
  { ticker: "KO", name: "Coca-Cola", site: "https://www.coca-colacompany.com" },
  { ticker: "NKE", name: "Nike", site: "https://www.nike.com" },
];

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
      <div className="fathom-card flex flex-col items-center gap-5 px-6 py-12 text-center">
        <span aria-hidden="true" className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#e6f3f8] to-surface text-ocean">
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
            <path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.3L12 17.1l-5.7 3.1 1.2-6.3L2.8 9.5l6.4-.8z" />
          </svg>
        </span>
        <div className="flex max-w-md flex-col gap-1.5">
          <p className="font-display text-[24px] font-bold">Nothing saved yet</p>
          <p className="text-[16px] leading-relaxed text-muted">
            Open a company and tap <strong className="text-ink">Add to watchlist</strong>. No sign-up: it stays in this browser.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {SUGGESTED.map((c) => (
            <Link
              key={c.ticker}
              href={`/stock/${c.ticker}`}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-3.5 text-[15px] font-semibold text-ink no-underline transition hover:-translate-y-0.5 hover:border-mid"
            >
              <CompanyLogo name={c.name} website={c.site} size={28} />
              {c.name}
            </Link>
          ))}
          <Link href="/sectors" className="inline-flex min-h-[38px] items-center rounded-full px-3.5 text-[15px] font-semibold">
            Browse by sector →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
      {list.map((w) => {
        const s = snaps[w.ticker];
        const understood = Object.keys(getProgress(w.ticker)).length;
        return (
          <li key={w.ticker} className="fathom-card flex flex-col gap-4 p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <CompanyLogo key={s ? "s" : "w"} name={s?.name ?? w.name} logo={s?.logo} website={s?.website} size={48} />
                <div className="flex min-w-0 flex-col">
                <Link href={`/stock/${w.ticker}`} className="fathom-grow truncate font-display text-xl font-bold text-ink">
                  {s?.name ?? w.name}
                </Link>
                <span className="text-[13px] text-muted">
                  {w.ticker}
                  {s?.sector ? ` · ${s.sector}` : ""}
                </span>
                </div>
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
              <dl className="m-0 grid grid-cols-1 gap-2">
                {s.facts.map((f) => (
                  <div key={f.label} className="flex items-baseline justify-between gap-3 rounded-xl bg-[#f3f8fa] px-3 py-2 text-[14px]">
                    <dt className="text-muted">{f.label}</dt>
                    <dd className="m-0 font-semibold">{f.value}</dd>
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
                  {understood} of {STEP_COUNT} questions
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-panel-2">
                <div className="h-1.5 rounded-full bg-mid" style={{ width: `${(understood / STEP_COUNT) * 100}%` }} />
              </div>
            </div>
            <Link
              href={`/stock/${w.ticker}`}
              className="mt-auto inline-flex min-h-11 items-center justify-center rounded-full bg-ocean px-5 text-[15px] font-semibold text-white no-underline transition hover:bg-ocean-dark"
            >
              {understood === 0 ? "Start researching" : understood < STEP_COUNT ? "Carry on" : "Revisit"}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
