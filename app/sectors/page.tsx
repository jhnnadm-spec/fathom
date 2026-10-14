import type { Metadata } from "next";
import Link from "next/link";
import { displayName } from "@/lib/report/company";
import { sectorSummaries } from "@/lib/sectors-data";

export const metadata: Metadata = { title: "Browse by sector" };

export default function SectorsPage() {
  const sectors = sectorSummaries();
  const ready = sectors.some((s) => s.count > 0);
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8 px-5 py-10 sm:py-14 lg:px-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-bold tracking-tight">Browse by sector</h1>
        <p className="max-w-3xl text-[16px] leading-relaxed text-muted">
          Every company listed on a US stock exchange, grouped by what it does. Groups are based on the industry each
          company gives the SEC; inside each one, companies with the biggest yearly sales come first.
        </p>
      </div>
      {!ready && <p className="rounded-2xl bg-panel p-5 text-[16px]">The sector list is being built from SEC data. Check back shortly.</p>}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {sectors.map((s) => (
          <li key={s.id}>
            <Link href={`/sectors/${s.id}`} className="flex h-full flex-col gap-2 rounded-2xl bg-panel p-5 text-ink no-underline transition hover:-translate-y-0.5 hover:bg-white">
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-display text-xl font-bold">{s.name}</span>
                {s.count > 0 && <span className="text-[13px] text-muted">{s.count.toLocaleString("en-US")} companies</span>}
              </span>
              <span className="text-[15px] leading-snug text-muted">{s.blurb}</span>
              {s.top.length > 0 && <span className="text-[14px] font-semibold text-ocean">{s.top.map((t) => shortName(t.n)).join(", ")}…</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function shortName(name: string): string {
  return displayName(name)
    .replace(/,?\s+(Inc\.?|Corp(oration)?\.?|Co\.?|Company|Ltd\.?|plc|Holdings?|Group)$/i, "")
    .replace(/\s*&$/, "")
    .replace(/^The\s+/i, "");
}
