/**
 * The Fundamental lens on a company page: the key figures from its latest
 * yearly report, each worked out by Fathom and explained in everyday words,
 * with its period and source. Six headline figures show first; the rest open up.
 */
import Link from "next/link";
import { FUNDAMENTAL_GROUPS, type FundamentalData, type FundamentalMetricId, type MetricRow } from "@/lib/lens/fundamental";
import { figureValue, periodText } from "@/lib/lens/format";
import type { LensResult } from "@/lib/lens/types";
import { SourceLink } from "./SourceLink";
import { TermName } from "./TermName";

const HEADLINE: FundamentalMetricId[] = ["revenue", "revenueGrowth", "netMargin", "freeCashFlow", "debtToEquity", "returnOnEquity"];

export function FundamentalGlance({ result }: { result: LensResult<FundamentalData> }) {
  const { rows } = result.data;
  const headline = HEADLINE.map((id) => rows.find((r) => r.id === id)!).filter(Boolean);
  const company = result.meta.company;
  return (
    <section id="fundamentals" aria-labelledby="fundamentals-title" className="flex scroll-mt-20 flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 id="fundamentals-title" className="font-display text-[26px] font-bold tracking-tight">
          {company}&apos;s numbers at a glance
        </h2>
        <p className="text-[15px] leading-relaxed text-muted">
          The key figures from its latest yearly report to the SEC, worked out by Fathom and explained in everyday words. Point
          at any underlined term to see what it means, and how a high or a low figure can be read both ways.
        </p>
      </div>

      {result.summary.length > 0 && (
        <div className="rounded-2xl bg-mist p-5 text-[17px] leading-[1.6]">
          <p className="mb-1 text-[13px] font-semibold uppercase tracking-wide text-mid">In short</p>
          {result.summary.join(" ")}
        </div>
      )}

      <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
        {headline.map((r) => (
          <MetricCard key={r.id} row={r} />
        ))}
      </ul>

      <details className="group rounded-2xl border border-line">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-[16px] font-semibold text-ocean">
          See all {rows.length} figures, grouped the way analysts read them
          <span aria-hidden="true" className="text-xl transition-transform group-open:rotate-45">
            +
          </span>
        </summary>
        <div className="flex flex-col gap-8 border-t border-line p-5">
          {FUNDAMENTAL_GROUPS.map((g) => {
            const list = rows.filter((r) => r.group === g.id);
            if (list.length === 0) return null;
            return (
              <div key={g.id} className="flex flex-col gap-3">
                <div className="flex flex-col">
                  <h3 className="font-display text-[20px] font-bold">{g.title}</h3>
                  <p className="text-[14px] text-muted">{g.plain}</p>
                </div>
                <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
                  {list.map((r) => (
                    <MetricCard key={r.id} row={r} />
                  ))}
                </ul>
              </div>
            );
          })}
          <p className="text-[13px] leading-relaxed text-muted">
            Every figure is in US dollars as the company reported it, under US accounting rules (US GAAP). Fathom only combines
            figures that cover exactly the same period or date, and shows &quot;Not reported&quot; rather than a zero when one is
            missing.
          </p>
        </div>
      </details>

      <Link
        href={`/compare?t=${encodeURIComponent(result.ticker)}`}
        className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl border border-line bg-white px-4 text-[15px] font-semibold text-ocean no-underline transition-colors hover:border-mid"
      >
        Compare {company} side by side with other companies
        <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}

export function MetricCard({ row }: { row: MetricRow }) {
  const f = row.figure;
  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-4">
      <div className="flex flex-col">
        <span className="text-[16px] font-bold">
          <TermName k={row.term} full label={row.name} />
        </span>
        <span className="text-[13px] text-muted">{row.plain}</span>
      </div>
      <span className={`font-display font-bold tabular-nums ${f.status === "reported" ? "text-[26px] text-ocean" : "text-[17px] text-muted"}`}>{figureValue(f)}</span>
      {row.reading && <p className="text-[15px] leading-snug">{row.reading}</p>}
      {f.status !== "reported" && <p className="text-[14px] leading-snug text-muted">{f.reason}</p>}
      <p className="text-[13px] leading-snug text-muted">{row.meaning}</p>
      {f.status === "reported" && (
        <div className="mt-auto flex flex-col gap-0.5 border-t border-line pt-2">
          <span className="text-[12px] text-muted">
            {periodText(f.period)} · {f.currency}
          </span>
          {f.sources.slice(0, 2).map((s) => (
            <SourceLink key={s.url} href={s.url} label={s.name} />
          ))}
        </div>
      )}
    </li>
  );
}
