import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/PageTitle";
import { SectorIcon } from "@/components/SectorIcon";
import { displayName } from "@/lib/report/company";
import { sectorSummaries } from "@/lib/sectors-data";

export const metadata: Metadata = { title: "Browse" };

export default function SectorsPage() {
  const sectors = sectorSummaries();
  const ready = sectors.some((s) => s.count > 0);
  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-10 px-5 py-12 sm:py-16 lg:px-8">
      <PageTitle title="Browse by type of business" note="Pick one to see its companies, biggest first." />
      {!ready && <p className="fathom-card p-5 text-[16px]">The sector list is being built from SEC data. Check back shortly.</p>}
      <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {sectors.map((s) => (
          <li key={s.id}>
            <Link
              href={`/sectors/${s.id}`}
              className="fathom-card group flex h-full flex-col gap-3 p-5 text-ink no-underline transition-colors hover:border-mid"
            >
              <span className="flex items-center gap-3.5">
                <SectorIcon id={s.id} size={44} />
                <span className="flex flex-col leading-tight">
                  <span className="font-display text-[19px] font-bold group-hover:text-ocean">{s.name}</span>
                  {s.count > 0 && <span className="text-[13px] text-muted">{s.count.toLocaleString("en-US")} companies</span>}
                </span>
              </span>
              <span className="text-[15px] leading-snug text-muted">{s.blurb}</span>
              {s.top.length > 0 && (
                <span className="mt-auto flex flex-wrap gap-1.5">
                  {s.top.map((t) => (
                    <span key={t.t} className="rounded-full bg-panel-2 px-2.5 py-1 text-[12px] font-semibold text-ocean">
                      {shortName(t.n)}
                    </span>
                  ))}
                </span>
              )}
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
