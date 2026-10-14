import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageTitle } from "@/components/PageTitle";

export const metadata: Metadata = { title: "About" };

const RULES: { title: string; text: string; icon: ReactNode }[] = [
  { title: "Every claim links to its source", text: "Each point opens the official report it came from.", icon: <path d="M14 3h7v7M10 14 21 3M19 14v6H4V5h6" /> },
  { title: "Numbers are never typed by hand", text: "They come straight from the companies' filings with the SEC.", icon: <path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7" /> },
  { title: "Unsure means left out", text: "If something can't be checked, Fathom leaves it out rather than guess.", icon: <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01" /> },
  { title: "No buy, sell or hold", text: "Fathom never gives a recommendation or a price target.", icon: <path d="M12 3 4 6v6c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V6l-8-3zM9 12l2 2 4-4" /> },
];

export default function About() {
  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-10 px-5 py-12 sm:py-16">
      <PageTitle
        eyebrow="About"
        title="Company reports, explained in plain English"
        note="Fathom doesn't create financial data. It explains information from public sources and shows where every point came from."
      />
      <section aria-labelledby="rules-title" className="flex flex-col gap-4">
        <h2 id="rules-title" className="font-display text-[26px] font-bold">
          Our rules
        </h2>
        <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2">
          {RULES.map((r) => (
            <li key={r.title} className="fathom-card flex items-start gap-4 p-6">
              <span aria-hidden="true" className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-surface/70 text-ocean">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {r.icon}
                </svg>
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-[17px] font-semibold">{r.title}</span>
                <span className="text-[15px] leading-relaxed text-muted">{r.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="fathom-card flex flex-col gap-2 p-6 sm:p-7" aria-labelledby="advice-title">
        <h2 id="advice-title" className="font-display text-[22px] font-bold">
          Not financial advice
        </h2>
        <p className="text-[16px] leading-relaxed text-muted">
          Fathom is for education only. It does not recommend buying, selling or holding any investment. Always check the
          original sources before making a decision.
        </p>
      </section>
    </div>
  );
}
