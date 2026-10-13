import type { Metadata } from "next";

export const metadata: Metadata = { title: "About" };

export default function About() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-16">
      <h1 className="font-display text-4xl font-bold tracking-tight">
        About Fathom
      </h1>
      <p className="text-lg leading-relaxed text-muted">
        Fathom doesn&apos;t create financial data. It brings together
        information from public sources that allow it to be shared, explains it
        in plain English, and links every point back to where it came from.
      </p>

      <h2 className="font-display text-2xl font-bold">Our rules</h2>
      <ul className="flex list-disc flex-col gap-2 pl-5 text-[17px] leading-relaxed text-muted">
        <li>Every claim links to its source.</li>
        <li>Numbers come straight from official data and are never typed by hand.</li>
        <li>If we are unsure about something, we leave it out rather than guess.</li>
        <li>
          Fathom never says buy, sell or hold, and never gives price targets.
        </li>
      </ul>

      <h2 className="font-display text-2xl font-bold">Not financial advice</h2>
      <p className="text-[17px] leading-relaxed text-muted">
        Fathom is for education only. It does not recommend buying, selling or
        holding any investment. Always check the original sources before making
        a decision.
      </p>
    </section>
  );
}
