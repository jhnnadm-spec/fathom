"use client";

/**
 * Lets a visitor ask Fathom to write the plain-English explanation for a
 * company that doesn't have one yet (or whose explanation is out of date),
 * then waits and reloads the page when it's ready.
 */
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Phase = "idle" | "sending" | "working" | "queued" | "visitor-limit" | "failed" | "slow";

const STEPS = [
  "Reading the annual and quarterly reports",
  "Writing each point in plain English",
  "Checking every point word-for-word against the reports",
];

export function ExplainButton({
  ticker,
  initial,
  update = false,
}: {
  ticker: string;
  initial: "none" | "working" | "queued" | "failed";
  update?: boolean; // an explanation exists but a newer report has been filed
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(initial === "none" ? "idle" : initial === "failed" ? "idle" : initial);
  const [step, setStep] = useState(0);
  const api = `/api/explain/${encodeURIComponent(ticker)}`;

  // While it's being written: move through the steps, and check every few seconds whether it's done.
  useEffect(() => {
    if (phase !== "working") return;
    const started = Date.now();
    const stepTimer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 25_000);
    const poll = setInterval(async () => {
      if (Date.now() - started > 6 * 60_000) {
        setPhase("slow");
        return;
      }
      try {
        const res = await fetch(api, { cache: "no-store" });
        const { status } = (await res.json()) as { status: string };
        if (status === "ready") router.refresh();
        else if (status === "queued") setPhase("queued");
        else if (status === "failed") setPhase("failed");
      } catch {
        // try again on the next tick
      }
    }, 6_000);
    return () => {
      clearInterval(stepTimer);
      clearInterval(poll);
    };
  }, [phase, api, router]);

  async function ask() {
    setPhase("sending");
    try {
      const res = await fetch(api, { method: "POST" });
      const { result } = (await res.json()) as { result: string };
      if (result === "claimed" || result === "already-working") setPhase("working");
      else if (result === "already-ready") router.refresh();
      else if (result === "queued") setPhase("queued");
      else if (result === "visitor-limit") setPhase("visitor-limit");
      else setPhase("failed");
    } catch {
      setPhase("failed");
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-[20px] border border-[#7FC4D8] bg-[#F2F9FB] p-6" aria-live="polite">
      {(phase === "idle" || phase === "sending" || phase === "failed") && (
        <>
          <h2 className="font-display text-xl font-bold text-ink">
            {update ? "A newer report has been filed" : "No plain-English explanation yet"}
          </h2>
          <p className="text-[16px] leading-relaxed text-muted">
            {update
              ? "The explanation below was written from an older report. Fathom can rewrite it from the latest one."
              : "Fathom can write one now from the company's own reports: what it does, how it makes money, its edge, its industry and its risks. Every point is checked against the report it links to."}
          </p>
          {phase === "failed" && (
            <p className="text-[15px] text-[#9A3B1F]">That didn&apos;t work this time. Please try again later.</p>
          )}
          <div>
            <button
              type="button"
              onClick={ask}
              disabled={phase === "sending"}
              className="rounded-xl bg-ocean px-5 py-3 text-[16px] font-semibold text-white transition hover:bg-ocean-dark disabled:opacity-60"
            >
              {phase === "sending" ? "Asking…" : update ? "Update the explanation" : "Write the plain-English explanation"}
            </button>
          </div>
          <p className="text-[13px] text-muted">Takes about two minutes. Fathom writes a few each day on a free AI allowance.</p>
        </>
      )}

      {phase === "working" && (
        <>
          <h2 className="font-display text-xl font-bold text-ink">Preparing the explanation…</h2>
          <ol className="flex flex-col gap-2">
            {STEPS.map((s, i) => (
              <li key={s} className={`flex items-center gap-2.5 text-[16px] ${i <= step ? "text-ink" : "text-muted"}`}>
                <span
                  className={`inline-block size-2.5 rounded-full ${i < step ? "bg-ocean" : i === step ? "animate-pulse bg-[#2F8FB3]" : "bg-line"}`}
                />
                {s}
              </li>
            ))}
          </ol>
          <p className="text-[13px] text-muted">
            Usually one to three minutes. You can leave this page; it will be here when you come back.
          </p>
        </>
      )}

      {phase === "queued" && (
        <>
          <h2 className="font-display text-xl font-bold text-ink">In the queue</h2>
          <p className="text-[16px] leading-relaxed text-muted">
            Today&apos;s free AI allowance has been used, so this company is in line to be written in the next daily
            run, usually within 24 hours. Come back tomorrow.
          </p>
        </>
      )}

      {phase === "visitor-limit" && (
        <>
          <h2 className="font-display text-xl font-bold text-ink">Daily limit reached</h2>
          <p className="text-[16px] leading-relaxed text-muted">
            To share the free allowance fairly, each visitor can ask for a few new companies a day. Please try again
            tomorrow.
          </p>
        </>
      )}

      {phase === "slow" && (
        <>
          <h2 className="font-display text-xl font-bold text-ink">Taking longer than usual</h2>
          <p className="text-[16px] leading-relaxed text-muted">
            It may still be writing. Refresh the page in a few minutes, or come back later.
          </p>
        </>
      )}
    </section>
  );
}
