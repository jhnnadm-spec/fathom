import { Loader } from "@/components/Loader";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SearchForm } from "@/components/SearchForm";
import { displayName, searchCompanies } from "@/lib/report/company";
import { searchTerms } from "@/lib/term-search";

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

  // Someone typing "pe ratio" or "free cash flow" wants the term, not a company.
  const terms = searchTerms(query, 4).filter((t) => t.score >= 50);
  const termFirst = terms[0]?.score === 100;
  // A clear term match still shows if the company list can't be reached right now.
  const matches = termFirst ? await searchCompanies(query).catch(() => []) : await searchCompanies(query);
  if (!termFirst) {
    const exact = matches.find((m) => m.ticker === query.toUpperCase().replace(/\./g, "-"));
    if (exact) redirect(`/stock/${exact.ticker}`);
    if (matches.length === 1) redirect(`/stock/${matches[0].ticker}`);
  }

  const termList = terms.length > 0 && (
    <div className="flex flex-col gap-3">
      <h2 className="font-display text-2xl font-bold">Finance terms</h2>
      <ul className="flex flex-col gap-2">
        {terms.map((t) => (
          <li key={t.key}>
            <Link
              href={`/terms?q=${encodeURIComponent(t.entry.short)}#${t.key}`}
              className="flex flex-col gap-1 rounded-2xl border border-line bg-panel px-5 py-4 no-underline hover:border-mid"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="fathom-grow text-[17px] font-semibold text-ink">{t.entry.term}</span>
                {t.entry.sides && (
                  <span className="flex-none rounded-full bg-[#fbe9e1] px-2 py-0.5 text-[12px] font-semibold text-[#9a4320]">both sides</span>
                )}
              </span>
              <span className="text-[15px] leading-relaxed text-muted">{t.entry.definition}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );

  if (matches.length === 0 && termList) return termList;

  if (matches.length === 0) {
    return (
      <p className="text-[17px] leading-relaxed text-muted">
        No US-listed company matches &ldquo;{query}&rdquo;. Try the company&apos;s name or its ticker, such as
        &ldquo;Coca-Cola&rdquo; or &ldquo;KO&rdquo;.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {termFirst && termList}
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-2xl font-bold">{termList ? "Companies" : "Which company did you mean?"}</h1>
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
      {!termFirst && termList}
    </div>
  );
}
