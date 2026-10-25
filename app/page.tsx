import Link from "next/link";
import { CompanyLogo } from "@/components/CompanyLogo";
import { SearchForm } from "@/components/SearchForm";
import { SectorIcon } from "@/components/SectorIcon";
import { WatchlistHome } from "@/components/WatchlistHome";
import { sectorSummaries } from "@/lib/sectors-data";

const POPULAR = [
  { ticker: "AAPL", name: "Apple", site: "https://www.apple.com" },
  { ticker: "NKE", name: "Nike", site: "https://www.nike.com" },
  { ticker: "KO", name: "Coca-Cola", site: "https://www.coca-colacompany.com" },
  { ticker: "MSFT", name: "Microsoft", site: "https://www.microsoft.com" },
  { ticker: "COST", name: "Costco", site: "https://www.costco.com" },
];

const HOW = [
  { n: 1, title: "Search a company", text: "Type its name, like Nike, or its short code, like NKE." },
  { n: 2, title: "Read the short answers", text: "Seven simple questions, each answered in a sentence or a picture." },
  { n: 3, title: "Tap “Tell me more”", text: "Only when you're curious. You never have to read it all." },
];

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-16 px-5 pb-20 pt-14 sm:gap-20 sm:pt-24 lg:px-8">
      {/* Search first, and nothing else competing with it */}
      <section className="flex flex-col items-center gap-6 text-center">
        <h1 className="max-w-3xl font-display text-[40px] font-bold leading-[1.05] tracking-tight sm:text-[60px]">
          Understand any company in plain English
        </h1>
        <p className="max-w-2xl text-[19px] leading-relaxed text-muted">
          Pick a US company. Fathom explains it one simple question at a time.
        </p>
        <div className="flex w-full justify-center">
          <SearchForm />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="mr-1 text-[15px] text-muted">Try</span>
          {POPULAR.map((c) => (
            <Link
              key={c.ticker}
              href={`/stock/${c.ticker}`}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-3.5 text-[15px] font-semibold text-ink no-underline transition-colors hover:border-mid"
            >
              <CompanyLogo name={c.name} website={c.site} size={26} />
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      <WatchlistHome />

      {/* How it works, in three steps */}
      <section aria-labelledby="how-title" className="flex flex-col gap-5">
        <h2 id="how-title" className="font-display text-[26px] font-bold tracking-tight">
          How it works
        </h2>
        <ol className="m-0 grid list-none gap-4 p-0 sm:grid-cols-3">
          {HOW.map((h) => (
            <li key={h.n} className="flex gap-3.5">
              <span
                aria-hidden="true"
                className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-panel-2 font-display text-[17px] font-bold text-ocean"
              >
                {h.n}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-[17px] font-semibold">{h.title}</span>
                <span className="text-[15px] leading-relaxed text-muted">{h.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* Browse when you don't have a company in mind */}
      <section className="flex flex-col gap-5" aria-labelledby="sectors-title">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h2 id="sectors-title" className="font-display text-[26px] font-bold tracking-tight">
              Not sure where to start?
            </h2>
            <p className="text-[16px] text-muted">Pick a type of business and see the biggest companies in it.</p>
          </div>
        </div>
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-4">
          {sectorSummaries().map((s) => (
            <li key={s.id}>
              <Link
                href={`/sectors/${s.id}`}
                className="fathom-card flex h-full items-center gap-3 p-3.5 text-[15px] font-semibold text-ink no-underline transition-colors hover:border-mid"
              >
                <SectorIcon id={s.id} size={36} />
                {s.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
