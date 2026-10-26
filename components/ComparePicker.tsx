"use client";

/**
 * Choosing the companies to compare. The choice lives in the page address
 * (/compare?t=KO,PEP), so copying the link saves and shares the comparison.
 */
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Match = { ticker: string; name: string };

export function ComparePicker({ chosen, max = 5 }: { chosen: Match[]; max?: number }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const full = chosen.length >= max;

  const go = (tickers: string[]) => {
    const t = [...new Set(tickers)].slice(0, max);
    router.push(t.length ? `/compare?t=${t.map(encodeURIComponent).join(",")}` : "/compare");
  };
  const add = (ticker: string) => {
    setQ("");
    setMatches([]);
    go([...chosen.map((c) => c.ticker), ticker.toUpperCase()]);
  };

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const text = q.trim();
    if (!text) return;
    timer.current = setTimeout(() => {
      fetch(`/api/companies?q=${encodeURIComponent(text)}`)
        .then((r) => r.json())
        .then((d: { companies: Match[] }) => setMatches(d.companies.filter((m) => !chosen.some((c) => c.ticker === m.ticker)).slice(0, 6)))
        .catch(() => setMatches([]));
    }, 200);
  }, [q, chosen]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {chosen.map((c) => (
          <span key={c.ticker} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-white py-1 pl-3.5 pr-1.5 text-[15px]">
            <span className="font-semibold">{c.name}</span>
            <span className="text-[13px] font-bold text-ocean">{c.ticker}</span>
            <button
              type="button"
              onClick={() => go(chosen.filter((x) => x.ticker !== c.ticker).map((x) => x.ticker))}
              aria-label={`Remove ${c.name}`}
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-panel-2 hover:text-ink"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <form
        className="relative flex max-w-xl flex-col gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (matches[0]) add(matches[0].ticker);
          else if (/^[A-Za-z.-]{1,6}$/.test(q.trim())) add(q.trim());
        }}
      >
        <label htmlFor="compare-add" className="text-[14px] font-semibold">
          {full ? `That's the most you can compare at once (${max}).` : chosen.length === 0 ? "Add a company" : "Add another company"}
        </label>
        <input
          id="compare-add"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          disabled={full}
          autoComplete="off"
          placeholder="Company name or ticker, like PepsiCo or PEP"
          className="min-h-12 rounded-xl border border-line bg-white px-4 text-[16px] outline-none focus:border-mid disabled:bg-mist"
        />
        {q.trim() && matches.length > 0 && (
          <ul className="absolute left-0 right-0 top-full z-20 mt-1 flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-[0_10px_30px_rgba(11,79,108,0.12)]">
            {matches.map((m) => (
              <li key={m.ticker}>
                <button type="button" onClick={() => add(m.ticker)} className="flex min-h-11 w-full items-center justify-between gap-3 px-4 text-left hover:bg-mist">
                  <span className="truncate">{m.name}</span>
                  <span className="text-[13px] font-bold text-ocean">{m.ticker}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>

      {chosen.length >= 2 && (
        <button
          type="button"
          onClick={() => {
            navigator.clipboard
              ?.writeText(window.location.href)
              .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
              })
              .catch(() => undefined);
          }}
          className="inline-flex min-h-10 items-center gap-2 self-start rounded-xl border border-line bg-white px-3.5 text-[14px] font-semibold text-ocean hover:border-mid"
        >
          {copied ? "Link copied: send it to anyone, or save it to come back later" : "Copy a link to this comparison"}
        </button>
      )}
    </div>
  );
}
