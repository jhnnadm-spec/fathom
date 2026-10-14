import { Loader } from "@/components/Loader";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SearchForm } from "@/components/SearchForm";
import { displayName, searchCompanies } from "@/lib/report/company";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage(props: PageProps<"/search">) {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <SearchForm />
      <Suspense fallback={<Loader label="Searching…" />}>
        <Results searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}

async function Results({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = (await searchParams).q;
  const query = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
  if (!query) return null;

  const matches = await searchCompanies(query);
  const exact = matches.find((m) => m.ticker === query.toUpperCase().replace(/\./g, "-"));
  if (exact) redirect(`/stock/${exact.ticker}`);
  if (matches.length === 1) redirect(`/stock/${matches[0].ticker}`);

  if (matches.length === 0) {
    return (
      <p className="text-[17px] leading-relaxed text-muted">
        No US-listed company matches &ldquo;{query}&rdquo;. Try the company&apos;s name or its ticker, such as
        &ldquo;Coca-Cola&rdquo; or &ldquo;KO&rdquo;.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-display text-2xl font-bold">Which company did you mean?</h1>
      <ul className="flex flex-col gap-2">
        {matches.map((m) => (
          <li key={m.cik}>
            <Link
              href={`/stock/${m.ticker}`}
              className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-panel px-5 py-4 no-underline hover:border-mid"
            >
              <span className="fathom-grow text-[17px] font-semibold text-ink">{displayName(m.name)}</span>
              <span className="rounded-lg bg-panel-2 px-2.5 py-1 text-sm font-semibold text-ocean">{m.ticker}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
