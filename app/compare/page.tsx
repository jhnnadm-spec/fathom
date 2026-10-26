/**
 * Compare 2 to 5 companies side by side, from their own SEC figures.
 * The companies are in the address (/compare?t=KO,PEP), so the link saves and shares it.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ComparePicker } from "@/components/ComparePicker";
import { Loader } from "@/components/Loader";
import { PageTitle } from "@/components/PageTitle";
import { SourceLink } from "@/components/SourceLink";
import { TermName } from "@/components/TermName";
import { buildComparison, MAX_COMPANIES, MIN_COMPANIES, parseTickers, type CompareCell, type CompareRow } from "@/lib/compare/compare";
import { FUNDAMENTAL_GROUPS, fundamentalLens } from "@/lib/lens/fundamental";
import { figureValue, periodText, yearEndText } from "@/lib/lens/format";
import { displayName, searchCompanies } from "@/lib/report/company";

export const metadata: Metadata = {
  title: "Compare companies",
  description: "Put 2 to 5 US companies side by side: sales, profit, cash, debt and returns from their own reports, explained in plain English.",
};

const EXAMPLES = [
  { label: "Coca-Cola and PepsiCo", t: "KO,PEP" },
  { label: "Apple, Microsoft and Alphabet", t: "AAPL,MSFT,GOOGL" },
  { label: "Nike and Lululemon", t: "NKE,LULU" },
  { label: "Walmart, Costco and Target", t: "WMT,COST,TGT" },
];

export default function ComparePage(props: PageProps<"/compare">) {
  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-10 px-5 py-12 sm:py-16 lg:px-8">
      <PageTitle
        title="Compare companies"
        note="Put 2 to 5 companies side by side, using their own figures from their reports to the SEC. Each figure is explained in everyday words."
      />
      <Suspense fallback={<Loader label="Reading their latest reports…" />}>
        <Compare searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Compare({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const tickers = parseTickers((await searchParams).t);
  const results = await Promise.all(tickers.map((t) => fundamentalLens.run(t, "US").catch(() => null)));
  const found = results.filter((r) => r !== null);
  const missing = tickers.filter((_, i) => !results[i]);
  const missingNames = await Promise.all(
    missing.map(async (t) => {
      const m = (await searchCompanies(t).catch(() => [])).find((c) => c.ticker === t);
      return m ? `${displayName(m.name)} (${t})` : t;
    }),
  );
  const chosen = found.map((r) => ({ ticker: r.ticker, name: r.meta.company }));

  return (
    <>
      <ComparePicker chosen={chosen} max={MAX_COMPANIES} />
      {missing.length > 0 && (
        <p className="rounded-2xl bg-mist p-4 text-[15px]">
          Fathom can&apos;t compare {missingNames.join(", ")}: it either isn&apos;t a US-listed company, or it doesn&apos;t file the
          yearly and quarterly reports (10-K and 10-Q) Fathom reads.
        </p>
      )}
      {found.length < MIN_COMPANIES ? <Start /> : <Table comparison={buildComparison(found)} />}
      <p className="text-sm leading-relaxed text-muted">
        <strong className="font-semibold text-ink">For information only. Not investment advice.</strong> This compares what the
        companies reported. It never says which one is better, or whether to buy, sell or hold any of them.
      </p>
    </>
  );
}

function Start() {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[17px] font-semibold">Add at least two companies, or try one of these:</h2>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {EXAMPLES.map((e) => (
          <li key={e.t}>
            <Link href={`/compare?t=${e.t}`} className="inline-flex min-h-10 items-center rounded-full bg-panel-2 px-4 text-[15px] font-semibold text-ocean no-underline hover:bg-surface">
              {e.label}
            </Link>
          </li>
        ))}
      </ul>
      <p className="max-w-3xl text-[15px] leading-relaxed text-muted">
        Comparing works best for companies in the same kind of business: what counts as a normal profit margin or level of
        debt differs a lot between, say, a software company and a supermarket.
      </p>
    </section>
  );
}

function Table({ comparison: c }: { comparison: ReturnType<typeof buildComparison> }) {
  const groups = FUNDAMENTAL_GROUPS.map((g) => ({ ...g, rows: c.rows.filter((r) => r.group === g.id) })).filter((g) => g.rows.length > 0);
  return (
    <>
      {c.warnings.length > 0 && (
        <section aria-labelledby="warnings-title" className="flex flex-col gap-2 rounded-2xl border border-[#e8c9a6] bg-[#fdf6ee] p-5">
          <h2 id="warnings-title" className="text-[17px] font-semibold">
            Before you compare: these figures aren&apos;t exactly like for like
          </h2>
          <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-[15px] leading-relaxed">
            {c.warnings.map((w) => (
              <li key={w.kind}>{w.text}</li>
            ))}
          </ul>
        </section>
      )}

      {c.summary.length > 0 && (
        <section aria-labelledby="summary-title" className="flex flex-col gap-2 rounded-2xl bg-mist p-5">
          <h2 id="summary-title" className="text-[13px] font-semibold uppercase tracking-wide text-mid">
            The main differences
          </h2>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[17px] leading-[1.55]">
            {c.summary.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p className="text-[13px] text-muted">Written from the figures below only. Highest and lowest show where each one sits in this group; neither is better or worse on its own.</p>
        </section>
      )}

      <section aria-label="Side-by-side figures" className="flex flex-col gap-3">
        <p className="text-[14px] text-muted">
          Point at any underlined term to see what it means and how a high or a low figure can be read both ways. All figures are
          in US dollars, under US accounting rules (US GAAP), from each company&apos;s latest reports.
        </p>
        <PhoneRows groups={groups} companies={c.companies} />
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left">
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 z-10 w-[260px] border-b-2 border-line bg-white py-3 pr-4 align-bottom text-[13px] font-semibold text-muted">
                  Figure
                </th>
                {c.companies.map((m) => (
                  <th key={m.ticker} scope="col" className="border-b-2 border-line px-3 py-3 align-bottom">
                    <Link href={`/stock/${m.ticker}`} className="fathom-grow text-[17px] font-bold text-ink">
                      {m.company}
                    </Link>
                    <span className="block text-[12px] font-normal text-muted">
                      {m.ticker}
                      {m.sector ? ` · ${m.sector}` : ""}
                    </span>
                    {yearEndText(m.fiscalYearEnd) && <span className="block text-[12px] font-normal text-muted">Year ends {yearEndText(m.fiscalYearEnd)}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            {groups.map((g) => (
              <tbody key={g.id}>
                <tr>
                  <th colSpan={c.companies.length + 1} scope="colgroup" className="bg-white pb-2 pt-7 text-left">
                    <span className="font-display text-[20px] font-bold">{g.title}</span>
                    <span className="block text-[14px] font-normal text-muted">{g.plain}</span>
                  </th>
                </tr>
                {g.rows.map((r) => (
                  <Row key={r.id} row={r} />
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </section>
    </>
  );
}

/** On phones: one card per figure, with each company's value listed under it. */
function PhoneRows({ groups, companies }: { groups: { id: string; title: string; plain: string; rows: CompareRow[] }[]; companies: { ticker: string; company: string }[] }) {
  const name = (t: string) => companies.find((m) => m.ticker === t)?.company ?? t;
  return (
    <div className="flex flex-col gap-8 md:hidden">
      {groups.map((g) => (
        <div key={g.id} className="flex flex-col gap-3">
          <div>
            <h3 className="font-display text-[20px] font-bold">{g.title}</h3>
            <p className="text-[14px] text-muted">{g.plain}</p>
          </div>
          {g.rows.map((r) => (
            <div key={r.id} className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-4">
              <span className="text-[16px] font-bold">
                <TermName k={r.term} full label={r.name} />
              </span>
              <span className="-mt-1.5 text-[13px] text-muted">{r.plain}</span>
              <p className="text-[13px] leading-snug text-muted">{r.meaning}</p>
              <ul className="m-0 flex list-none flex-col p-0">
                {r.cells.map((cell) => (
                  <li key={cell.ticker} className="flex items-start justify-between gap-3 border-t border-line py-2.5">
                    <span className="flex flex-col">
                      <span className="text-[15px] font-semibold">{name(cell.ticker)}</span>
                      {cell.figure.status === "reported" ? (
                        <>
                          <span className="text-[12px] text-muted">
                            {periodText(cell.figure.period)} · {cell.figure.currency}
                          </span>
                          {cell.figure.sources[0] && <SourceLink href={cell.figure.sources[0].url} label={cell.figure.sources[0].name} />}
                        </>
                      ) : (
                        <span className="text-[12px] text-muted">{cell.figure.status === "needs-price" ? "Needs a share price" : cell.figure.reason}</span>
                      )}
                    </span>
                    <span className="flex flex-col items-end">
                      <span className={`whitespace-nowrap font-display font-bold tabular-nums ${cell.figure.status === "reported" ? "text-[18px]" : "text-[14px] text-muted"}`}>
                        {cell.figure.status === "reported" ? figureValue(cell.figure) : "–"}
                      </span>
                      {cell.mark && <span className="text-[11px] font-semibold uppercase tracking-wide text-mid">{cell.mark === "highest" ? "Highest" : "Lowest"}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Row({ row }: { row: CompareRow }) {
  return (
    <tr>
      <th scope="row" className="sticky left-0 z-10 w-[260px] border-t border-line bg-white py-3 pr-4 align-top font-normal">
        <span className="block text-[15px] font-bold">
          <TermName k={row.term} full label={row.name} />
        </span>
        <span className="block text-[13px] text-muted">{row.plain}</span>
        <span className="mt-1 block text-[12px] leading-snug text-muted">{row.meaning}</span>
      </th>
      {row.cells.map((cell) => (
        <Cell key={cell.ticker} cell={cell} />
      ))}
    </tr>
  );
}

function Cell({ cell }: { cell: CompareCell }) {
  const f = cell.figure;
  return (
    <td className={`border-t border-line px-3 py-3 align-top ${cell.mark ? "bg-mist" : ""}`}>
      <span className={`block font-display font-bold tabular-nums ${f.status === "reported" ? "text-[20px] text-ink" : "text-[15px] text-muted"}`}>{figureValue(f)}</span>
      {cell.mark && (
        <span className="mt-1 inline-flex rounded-md border border-line bg-white px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-mid">
          {cell.mark === "highest" ? "Highest" : "Lowest"}
        </span>
      )}
      {f.status === "reported" ? (
        <span className="mt-1 flex flex-col gap-0.5">
          <span className="text-[12px] text-muted">
            {periodText(f.period)} · {f.currency}
          </span>
          {f.sources[0] && <SourceLink href={f.sources[0].url} label={f.sources[0].name} />}
        </span>
      ) : (
        <span className="mt-1 block max-w-[220px] text-[12px] leading-snug text-muted">{f.status === "needs-price" ? "Fathom doesn't use a share price in its sums yet." : f.reason}</span>
      )}
    </td>
  );
}
