import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CompanyLogo } from "@/components/CompanyLogo";
import { Loader } from "@/components/Loader";
import { SectorIcon } from "@/components/SectorIcon";
import { SECTORS } from "@/lib/sectors";
import { displayName } from "@/lib/report/company";
import { companiesIn, genresIn, isSectorId, plainIndustry } from "@/lib/sectors-data";

const PAGE = 40;

export async function generateMetadata(props: PageProps<"/sectors/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  return { title: isSectorId(id) ? SECTORS[id].name : "Sector" };
}

export default function SectorPage(props: PageProps<"/sectors/[id]">) {
  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-8 px-5 py-12 sm:py-16 lg:px-8">
      <Suspense fallback={<Loader label="Loading companies…" />}>
        <Sector params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Sector({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  if (!isSectorId(id)) notFound();
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : (sp[k] as string | undefined));
  const genres = genresIn(id);
  const genre = genres.find((g) => g.name === one("genre"))?.name;
  const page = Math.max(1, Number(one("page")) || 1);
  const all = companiesIn(id, genre);
  const shown = all.slice((page - 1) * PAGE, page * PAGE);
  const link = (g?: string, p = 1) => {
    const q = new URLSearchParams();
    if (g) q.set("genre", g);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return `/sectors/${id}${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <Link href="/sectors" className="self-start text-[15px] font-semibold">
        ← All sectors
      </Link>
      <div className="flex items-center gap-5">
        <SectorIcon id={id} size={76} />
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-[38px] font-bold leading-[1.05] tracking-tight sm:text-[48px]">{SECTORS[id].name}</h1>
          <p className="max-w-3xl text-[17px] leading-relaxed text-muted">{SECTORS[id].blurb}</p>
        </div>
      </div>

      {genres.length > 1 && (
        <nav aria-label="Narrow down by industry" className="flex flex-col gap-2">
          <p className="text-[13px] font-semibold text-muted">Narrow it down</p>
          <div className="flex flex-wrap gap-1.5">
            <Link href={link()} className={chip(!genre)}>
              All ({companiesIn(id).length})
            </Link>
            {genres.slice(0, 14).map((g) => (
              <Link key={g.name} href={link(g.name)} className={chip(genre === g.name)}>
                {g.label} ({g.count})
              </Link>
            ))}
          </div>
        </nav>
      )}

      {all.length === 0 ? (
        <p className="fathom-card p-5 text-[16px]">The sector list is being built from SEC data. Check back shortly.</p>
      ) : (
        <>
          <p className="text-[14px] text-muted">
            {all.length.toLocaleString("en-US")} companies{genre ? ` in ${plainIndustry(genre).toLowerCase()}` : ""}, biggest yearly sales first.
          </p>
          <ol className="m-0 grid list-none gap-3 p-0 md:grid-cols-2 xl:grid-cols-3" start={(page - 1) * PAGE + 1}>
            {shown.map((c) => (
              <li key={c.t}>
                <Link
                  href={`/stock/${c.t}`}
                  className="fathom-card flex items-center gap-3.5 px-4 py-3.5 text-ink no-underline transition hover:-translate-y-0.5 hover:border-shallow"
                >
                  <CompanyLogo name={displayName(c.n)} size={42} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="fathom-grow max-w-full truncate text-[16px] font-semibold">{displayName(c.n)}</span>
                    <span className="truncate text-[13px] text-muted">{plainIndustry(c.d)}</span>
                  </span>
                  <span className="flex-none rounded-lg bg-panel-2 px-2.5 py-1 text-[13px] font-semibold text-ocean">{c.t}</span>
                </Link>
              </li>
            ))}
          </ol>
          {all.length > PAGE && (
            <nav aria-label="Pages" className="flex items-center justify-between gap-3 text-[15px] font-semibold">
              {page > 1 ? <Link href={link(genre, page - 1)}>Previous</Link> : <span />}
              <span className="text-muted">
                Page {page} of {Math.ceil(all.length / PAGE)}
              </span>
              {page * PAGE < all.length ? <Link href={link(genre, page + 1)}>Next</Link> : <span />}
            </nav>
          )}
        </>
      )}
    </>
  );
}

function chip(on: boolean) {
  return `inline-flex min-h-9 items-center rounded-full px-3.5 text-[13px] font-semibold no-underline transition ${on ? "bg-ocean text-abyss shadow-[0_6px_16px_rgba(11,79,108,0.2)]" : "border border-line bg-white/80 text-muted hover:border-shallow hover:text-ink"}`;
}
