"use client";

export default function ReportError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-start gap-4 px-6 py-16">
      <h1 className="font-display text-3xl font-bold">We couldn&apos;t load this report</h1>
      <p className="text-[17px] leading-relaxed text-muted">
        Fathom couldn&apos;t get the company&apos;s data from the SEC just now. This is usually temporary. Please try
        again in a minute.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-xl bg-ocean px-5 py-3 text-[15px] font-semibold text-white"
      >
        Try again
      </button>
    </div>
  );
}
