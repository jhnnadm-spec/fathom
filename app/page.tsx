import Link from "next/link";
import type { ReactNode } from "react";
import { CompanyLogo } from "@/components/CompanyLogo";
import { MarketNews } from "@/components/MarketWidgets";
import { PathStrip } from "@/components/PathStrip";
import { SearchForm } from "@/components/SearchForm";
import { SectorIcon } from "@/components/SectorIcon";
import { StepArt } from "@/components/StepArt";
import { TopNews } from "@/components/TopNews";
import { WatchlistHome } from "@/components/WatchlistHome";
import { STEPS } from "@/lib/report/outline";
import { largestCompanies, sectorSummaries } from "@/lib/sectors-data";

const POPULAR = [
  { ticker: "AAPL", name: "Apple", site: "https://www.apple.com" },
  { ticker: "KO", name: "Coca-Cola", site: "https://www.coca-colacompany.com" },
  { ticker: "NKE", name: "Nike", site: "https://www.nike.com" },
  { ticker: "MSFT", name: "Microsoft", site: "https://www.microsoft.com" },
  { ticker: "COST", name: "Costco", site: "https://www.costco.com" },
];

// Used until the sector list (with yearly sales from SEC data) has been built.
const FALLBACK_TOP = ["AAPL", "MSFT", "AMZN", "GOOGL", "NVDA", "META", "JPM", "WMT"];

export default function Home() {
  const largest = largestCompanies(8).map((c) => c.t);
  const top = largest.length >= 4 ? largest : FALLBACK_TOP;
  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-20 px-5 pb-24 pt-14 sm:pt-20 lg:px-8">
      {/* Search first */}
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)] lg:items-center xl:gap-20">
        <section className="flex flex-col gap-7">
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-mid">Free · Any US company · Every point sourced</p>
          <h1 className="font-display text-[46px] font-bold leading-[1.02] tracking-tight sm:text-[64px]">
            Understand any US company, in plain English.
          </h1>
          <p className="max-w-xl text-[19px] leading-relaxed text-muted">
            Type a company. Get the short answers first, and go deeper only when you want to.
          </p>
          <SearchForm />
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[15px] text-muted">Try</span>
            {POPULAR.map((c) => (
              <Link
                key={c.ticker}
                href={`/stock/${c.ticker}`}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-white/80 py-1 pl-1 pr-3.5 text-[15px] font-semibold text-ink no-underline transition hover:-translate-y-0.5 hover:border-mid"
              >
                <CompanyLogo name={c.name} website={c.site} size={28} />
                {c.name}
              </Link>
            ))}
          </div>
        </section>
        <DepthDiagram />
      </div>

      <WatchlistHome />

      {/* The seven questions */}
      <section className="fathom-card flex flex-col gap-7 p-6 sm:p-8" aria-labelledby="questions-title">
        <div className="flex flex-col gap-1.5">
          <h2 id="questions-title" className="font-display text-[28px] font-bold leading-tight tracking-tight">
            Every company, in seven questions
          </h2>
          <p className="text-[16px] text-muted">The same order an equity analyst works through, one question at a time.</p>
        </div>
        <PathStrip size={56} steps={STEPS.map((s) => ({ id: s.id, title: s.title, art: <StepArt id={s.id} size={56} /> }))} />
      </section>

      {/* News */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="fathom-card flex min-w-0 flex-col gap-4 p-6">
          <SectionHead title="News from the biggest companies" note="Headlines via TradingView: reporters' views, not company filings." />
          <TopNews tickers={top} />
        </section>
        <section className="fathom-card flex min-w-0 flex-col gap-4 p-6">
          <SectionHead title="Important market news" note="What's moving the US stock market, via TradingView." />
          <MarketNews height={480} />
        </section>
      </div>

      {/* Sectors */}
      <section className="flex flex-col gap-5" aria-labelledby="sectors-title">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="sectors-title" className="font-display text-[28px] font-bold tracking-tight">
            Browse by sector
          </h2>
          <Link href="/sectors" className="text-[15px] font-semibold">
            See all sectors →
          </Link>
        </div>
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {sectorSummaries().map((s) => (
            <li key={s.id}>
              <Link
                href={`/sectors/${s.id}`}
                className="fathom-card flex h-full items-center gap-3 p-3.5 text-ink no-underline transition hover:-translate-y-0.5 hover:border-shallow"
              >
                <SectorIcon id={s.id} size={40} />
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="text-[15px] font-semibold">{s.name}</span>
                  {s.count > 0 && <span className="text-[12px] text-muted">{s.count.toLocaleString("en-US")} companies</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Why trust it */}
      <section className="grid gap-4 border-t border-line pt-12 md:grid-cols-3" aria-label="How Fathom works">
        <Promise
          title="Every point sourced"
          text="Each answer links to the official report it came from."
          icon={<path d="M14 3h7v7M10 14 21 3M19 14v6H4V5h6" />}
        />
        <Promise
          title="Straight from the SEC"
          text="Numbers come from the companies' own filings, never typed by hand."
          icon={<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7" />}
        />
        <Promise
          title="Never advice"
          text="Fathom explains. It never says buy, sell or hold, or gives price targets."
          icon={<path d="M12 3 4 6v6c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V6l-8-3zM9 12l2 2 4-4" />}
        />
      </section>
    </div>
  );
}

function SectionHead({ title, note }: { title: string; note: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="font-display text-[22px] font-bold">{title}</h2>
      <p className="text-[14px] text-muted">{note}</p>
    </div>
  );
}

function Promise({ title, text, icon }: { title: string; text: string; icon: ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <span aria-hidden="true" className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-surface/70 text-ocean">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </svg>
      </span>
      <div className="flex flex-col gap-0.5">
        <h3 className="text-[17px] font-semibold">{title}</h3>
        <p className="text-[15px] leading-relaxed text-muted">{text}</p>
      </div>
    </div>
  );
}

/**
 * How the depths work, shown with one example question: a few words at the
 * surface, a full sentence below, everything at the bottom.
 */
function DepthDiagram() {
  return (
    <figure className="fathom-card m-0 flex flex-col gap-2 p-3" aria-label="An example question at three depths">
      <div className="flex flex-col gap-3 rounded-[22px] bg-surface p-5">
        <Band name="Surface" hint="The short answer" />
        <p className="flex flex-col gap-1">
          <span className="font-display text-[32px] font-bold leading-none tracking-tight text-[#14805a]">$27 of every $100</span>
          <span className="text-[15px]">of sales kept as profit</span>
        </p>
        <span className="flex h-3 overflow-hidden rounded-full bg-white/70">
          <span className="h-full w-[73%]" />
          <span className="fathom-grow-right h-full w-[27%] rounded-full bg-[#199e70]" />
        </span>
      </div>
      <div className="flex flex-col gap-2.5 rounded-[22px] bg-shallow p-5">
        <Band name="Below" hint="Explained, with numbers" />
        <p className="text-[15px] leading-relaxed">
          After paying for what it sold, running the business, interest and tax, it kept about $27 of every $100 of sales.
          This is its <span className="font-semibold">profit margin</span>.
        </p>
      </div>
      <div className="flex flex-col gap-2.5 rounded-[22px] bg-ocean p-5 text-white">
        <Band name="Deep" hint="Everything" dark />
        <p className="text-[15px] leading-relaxed text-white/90">
          Margins year by year, the analyst&apos;s view, the case against the obvious reading, and the report&apos;s own words.
        </p>
      </div>
      <figcaption className="px-2 pb-1 pt-1 text-[12px] text-muted">An example: one question, three depths.</figcaption>
    </figure>
  );
}

function Band({ name, hint, dark = false }: { name: string; hint: string; dark?: boolean }) {
  return (
    <span className={`flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] ${dark ? "text-shallow" : "text-ocean"}`}>
      <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true">
        <path d="M1 6q3.5-4 7 0t7 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      {name} · <span className="font-medium normal-case tracking-normal">{hint}</span>
    </span>
  );
}
