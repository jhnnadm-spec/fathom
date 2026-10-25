"use client";

/** On the front page: the companies someone has saved, one tap away. Shows nothing until they save one. */
import Link from "next/link";
import { useEffect, useState } from "react";
import { getWatchlist, STORE_EVENT, type WatchItem } from "@/lib/client/store";
import { CompanyLogo } from "./CompanyLogo";

export function WatchlistHome() {
  const [list, setList] = useState<WatchItem[] | null>(null);

  useEffect(() => {
    const sync = () => setList(getWatchlist());
    sync();
    window.addEventListener(STORE_EVENT, sync);
    return () => window.removeEventListener(STORE_EVENT, sync);
  }, []);

  if (!list || list.length === 0) return null;

  return (
    <section className="flex flex-col gap-4" aria-labelledby="saved-title">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 id="saved-title" className="font-display text-[26px] font-bold tracking-tight">
          Your saved companies
        </h2>
        <Link href="/watchlist" className="text-[15px] font-semibold">
          See all
        </Link>
      </div>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {list.map((w) => (
          <li key={w.ticker}>
            <Link
              href={`/stock/${w.ticker}`}
              className="inline-flex items-center gap-2.5 rounded-xl border border-line bg-white py-2 pl-2 pr-4 text-[15px] font-semibold text-ink no-underline transition-colors hover:border-mid"
            >
              <CompanyLogo name={w.name} size={30} />
              {w.name.replace(/,?\s+(Inc\.?|Corp(oration)?\.?|Co\.?|Company)$/i, "")}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
