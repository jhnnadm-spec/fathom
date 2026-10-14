"use client";

import { useState } from "react";
import { CompanyNews } from "./MarketWidgets";

export type NewsCompany = { ticker: string; name: string; symbol: string };

/** One company's news at a time, with a tab for each company. */
export function NewsTabs({ companies, height = 460 }: { companies: NewsCompany[]; height?: number }) {
  const [active, setActive] = useState(0);
  if (companies.length === 0) return null;
  const c = companies[Math.min(active, companies.length - 1)];
  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label="Choose a company" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {companies.map((x, i) => (
          <button
            key={x.ticker}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={`fathom-grow min-h-10 flex-none rounded-full px-3.5 text-[14px] font-semibold ${i === active ? "bg-ocean text-abyss" : "bg-panel-2 text-muted hover:text-ink"}`}
          >
            {shortName(x.name)}
          </button>
        ))}
      </div>
      <div className="rounded-2xl bg-panel p-3" role="tabpanel">
        <CompanyNews key={c.symbol} symbol={c.symbol} height={height} />
      </div>
    </div>
  );
}

function shortName(name: string): string {
  return name.replace(/,?\s+(Inc\.?|Corp(oration)?\.?|Co\.?|Company|Ltd\.?|plc|Holdings?|Group|Platforms)$/i, "").replace(/^The\s+/i, "");
}
