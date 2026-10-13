import Link from "next/link";
import { SearchForm } from "@/components/SearchForm";

const POPULAR = [
  { ticker: "AAPL", name: "Apple" },
  { ticker: "KO", name: "Coca-Cola" },
  { ticker: "NKE", name: "Nike" },
  { ticker: "MSFT", name: "Microsoft" },
  { ticker: "COST", name: "Costco" },
];

const LEVELS = [
  { name: "Surface", color: "#7FC4D8", text: "The whole company in a minute: what it does, whether it's growing, what it owes and its main risks." },
  { name: "Below", color: "#2F8FB3", text: "Each part explained, with the main numbers and every finance word made clear." },
  { name: "Deep", color: "#0B4F6C", text: "Everything, with the tables, five-year trends and the reports' exact words." },
];

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-20 px-5 pb-24 pt-20 sm:pt-28">
      <section className="flex flex-col gap-7">
        <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          Understand any US company, in plain English.
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-muted">
          Search a company. Fathom reads its official reports and explains them simply, with a source for every point.
        </p>
        <SearchForm />
        <p className="flex flex-wrap gap-x-5 gap-y-2 text-[15px] text-muted">
          Try
          {POPULAR.map((c) => (
            <Link key={c.ticker} href={`/stock/${c.ticker}`} className="font-medium">
              {c.name}
            </Link>
          ))}
        </p>
      </section>

      <section className="flex flex-col gap-6 border-t border-line pt-10">
        <h2 className="font-display text-2xl font-bold">Go as deep as you like</h2>
        <dl className="flex flex-col gap-5">
          {LEVELS.map((l) => (
            <div key={l.name} className="grid gap-1 sm:grid-cols-[120px_1fr] sm:gap-6">
              <dt className="flex items-center gap-2.5 font-semibold">
                <span aria-hidden="true" className="h-3 w-3 rounded-sm" style={{ background: l.color }} />
                {l.name}
              </dt>
              <dd className="leading-relaxed text-muted">{l.text}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="flex flex-col gap-6 border-t border-line pt-10">
        <h2 className="font-display text-2xl font-bold">How Fathom keeps it honest</h2>
        <ul className="flex flex-col gap-3 text-[17px] leading-relaxed">
          <li>Every point links to the official report it came from.</li>
          <li>Numbers come straight from SEC data, never typed by hand.</li>
          <li>It explains, but never says buy, sell or hold, and never gives price targets.</li>
        </ul>
      </section>
    </div>
  );
}
