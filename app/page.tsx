import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { SearchForm } from "@/components/SearchForm";

const POPULAR = [
  { ticker: "AAPL", name: "Apple" },
  { ticker: "KO", name: "Coca-Cola" },
  { ticker: "NKE", name: "Nike" },
  { ticker: "MSFT", name: "Microsoft" },
  { ticker: "COST", name: "Costco" },
];

const LEVELS = [
  {
    name: "Surface",
    level: "Level 1",
    color: "#CDE7F0",
    text: "The 30-second version. Is the company growing, is it making a profit, and how much cash and debt does it have?",
  },
  {
    name: "Below",
    level: "Level 2",
    color: "#7FC4D8",
    text: "The breakdown. Sales over five years, profit and margins, cash and debt, with every finance term explained.",
  },
  {
    name: "Deep",
    level: "Level 3",
    color: "#0B4F6C",
    text: "The detail. What changed in a year, recent announcements, and links to the original reports.",
  },
];

export default function Home() {
  return (
    <>
      <section className="bg-gradient-to-b from-white to-[#EAF5F9] px-6 pb-24 pt-20">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <LogoMark size={72} />
          <p className="text-sm font-semibold uppercase tracking-wider text-[#2F7A99]">Company reports, explained</p>
          <h1 className="font-display text-5xl font-bold leading-[1.04] tracking-tight sm:text-6xl">
            Understand any US company, in plain English.
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted">
            Search a company. Fathom reads its official reports and explains them at the depth you choose, with a
            source for every point.
          </p>
          <SearchForm />
          <div className="flex flex-wrap justify-center gap-2.5 text-[15px]">
            <span className="px-1 py-2.5 text-muted">Popular:</span>
            {POPULAR.map((c) => (
              <Link
                key={c.ticker}
                href={`/stock/${c.ticker}`}
                className="rounded-full border border-[#CFE2EA] bg-white px-4 py-2.5 font-medium no-underline hover:border-mid"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-9 px-6 py-20">
        <div className="flex max-w-2xl flex-col gap-2.5">
          <h2 className="font-display text-4xl font-bold tracking-tight">Go as deep as you like</h2>
          <p className="text-lg leading-relaxed text-muted">
            Every company page has three levels. Start at the surface and dive down when you want more.
          </p>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
          {LEVELS.map((l) => (
            <div key={l.name} className="flex flex-col overflow-hidden rounded-[20px] border border-line">
              <div className="h-2.5" style={{ background: l.color }} />
              <div className="flex flex-col gap-2.5 p-6">
                <span className="text-[13px] font-semibold uppercase tracking-wider text-[#2F7A99]">{l.level}</span>
                <h3 className="font-display text-2xl font-bold">{l.name}</h3>
                <p className="leading-relaxed text-muted">{l.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-20">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-8 rounded-3xl bg-ocean p-10 text-white">
          <div className="flex flex-col gap-2">
            <h3 className="font-display text-xl font-bold">Every point has a source</h3>
            <p className="text-[15px] leading-relaxed text-[#D6EBF2]">Each one links to the official filing it came from.</p>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="font-display text-xl font-bold">Numbers from official data</h3>
            <p className="text-[15px] leading-relaxed text-[#D6EBF2]">Figures come straight from SEC data and are never typed by hand.</p>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="font-display text-xl font-bold">Never tells you what to buy</h3>
            <p className="text-[15px] leading-relaxed text-[#D6EBF2]">
              Fathom explains. It never says buy, sell or hold, and never gives price targets.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
