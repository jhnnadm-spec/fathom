import Link from "next/link";
import { MarketNews } from "@/components/MarketWidgets";
import { SearchForm } from "@/components/SearchForm";
import { TopNews } from "@/components/TopNews";
import { WatchlistHome } from "@/components/WatchlistHome";
import { lookupTerm } from "@/lib/glossary";
import { STEPS } from "@/lib/report/outline";
import { largestCompanies, sectorSummaries } from "@/lib/sectors-data";

const POPULAR = [
  { ticker: "AAPL", name: "Apple" },
  { ticker: "KO", name: "Coca-Cola" },
  { ticker: "NKE", name: "Nike" },
  { ticker: "MSFT", name: "Microsoft" },
  { ticker: "COST", name: "Costco" },
];

// Used until the sector list (with yearly sales from SEC data) has been built.
const FALLBACK_TOP = ["AAPL", "MSFT", "AMZN", "GOOGL", "NVDA", "META", "JPM", "WMT"];

export default function Home() {
  const largest = largestCompanies(8).map((c) => c.t);
  const top = largest.length >= 4 ? largest : FALLBACK_TOP;
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-16 px-5 pb-24 pt-16 sm:pt-20 lg:px-8">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center">
        <section className="flex flex-col gap-6">
          <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Understand any US company, in plain English.
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted">
            Search a company. Fathom reads its official reports and walks you through it the way an analyst would, one
            simple question at a time, with a source for every point.
          </p>
          <SearchForm />
          <p className="flex flex-wrap gap-x-5 gap-y-2 text-[15px] text-muted">
            Try
            {POPULAR.map((c) => (
              <Link key={c.ticker} href={`/stock/${c.ticker}`} className="fathom-grow font-medium">
                {c.name}
              </Link>
            ))}
          </p>
        </section>
        <section aria-label="What each company page covers" className="hidden flex-col gap-3 rounded-3xl bg-panel p-6 lg:flex">
          <h2 className="font-display text-xl font-bold">On every company page</h2>
          <p className="text-[14px] text-muted">A map of how the numbers connect, the key drivers of its results, then the seven areas an analyst works through:</p>
          <StepList compact />
        </section>
      </div>

      <WatchlistHome />

      <div className="grid gap-16 lg:grid-cols-2 lg:gap-10">
        <section className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-2xl font-bold">News from the biggest companies</h2>
            <p className="text-[15px] text-muted">
              {largest.length >= 4 ? "The US-listed companies with the largest yearly sales, from SEC data." : "Some of the largest US-listed companies."} Headlines come
              from news outlets via TradingView: reporters&apos; views, not company filings.
            </p>
          </div>
          <TopNews tickers={top} />
        </section>

        <section className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-2xl font-bold">Important market news</h2>
            <p className="text-[15px] text-muted">What&apos;s moving the US stock market, via TradingView.</p>
          </div>
          <div className="rounded-2xl bg-panel p-3">
            <MarketNews height={480} />
          </div>
        </section>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl font-bold">Browse by sector</h2>
          <Link href="/sectors" className="text-[15px] font-semibold">
            See all sectors
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {sectorSummaries().map((s) => (
            <Link key={s.id} href={`/sectors/${s.id}`} className="inline-flex min-h-10 items-center rounded-full bg-panel px-4 text-[15px] font-semibold text-ocean no-underline hover:bg-white">
              {s.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-5 border-t border-line pt-10">
        <h2 className="font-display text-2xl font-bold">How Fathom works</h2>
        <p className="max-w-3xl text-[16px] leading-relaxed text-muted">
          Every company page starts by telling you what you&apos;ll look at and why, then shows how its numbers connect and its
          key drivers (fundamentals, macroeconomic factors, market sentiment and external factors), then a research path of
          seven steps. Each
          step says why it matters, gives the short answer, and opens up when you want more. Every finance term is shown
          by its real name with an everyday explanation; point at one to see what it means, why analysts check it and the
          case against the obvious reading.
        </p>
        <div className="lg:hidden">
          <StepList />
        </div>
        <ul className="flex flex-col gap-2 text-[16px] leading-relaxed">
          <li>Every point links to the official report it came from.</li>
          <li>Numbers come straight from SEC data, never typed by hand.</li>
          <li>It explains, but never says buy, sell or hold, and never gives price targets.</li>
        </ul>
      </section>
    </div>
  );
}

function StepList({ compact = false }: { compact?: boolean }) {
  return (
    <ol className={`grid ${compact ? "gap-1.5" : "gap-2 sm:grid-cols-2"}`}>
      {STEPS.map((s, i) => (
        <li key={s.id} className={`flex items-start gap-3 rounded-2xl ${compact ? "bg-white/70 px-3 py-2.5" : "bg-panel p-4"}`}>
          <span aria-hidden="true" className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-ocean text-[14px] font-bold text-abyss">
            {i + 1}
          </span>
          <span className="flex flex-col">
            <span className="font-display text-[17px] font-bold">{lookupTerm(s.term)?.term ?? s.title}</span>
            <span className="text-[14px] text-muted">
              {s.title}: {s.question.charAt(0).toLowerCase() + s.question.slice(1)}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
