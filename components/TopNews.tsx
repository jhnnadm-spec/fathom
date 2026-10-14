"use client";

/** News for a list of big, well-known companies, one tab each. */
import { useEffect, useState } from "react";
import { NewsTabs, type NewsCompany } from "./NewsTabs";

export function TopNews({ tickers }: { tickers: string[] }) {
  const [companies, setCompanies] = useState<NewsCompany[]>([]);
  const key = tickers.join(",");
  useEffect(() => {
    let live = true;
    fetch(`/api/snapshot?light=1&t=${encodeURIComponent(key)}`)
      .then((r) => r.json())
      .then((d: { companies: NewsCompany[] }) => live && setCompanies(d.companies))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [key]);
  if (companies.length === 0) return <p className="text-[15px] text-muted">Loading news…</p>;
  return <NewsTabs companies={companies} />;
}
