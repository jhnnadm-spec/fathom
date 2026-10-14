"use client";

/**
 * One step of the research path. It starts with the short version; the reader
 * chooses to go deeper (Below), then all the way (Deep), right where they are.
 * A quick question at the end checks the idea sank in.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { markStep } from "@/lib/client/store";
import type { Quiz } from "@/lib/report/quiz";

export function ResearchStep({
  ticker,
  id,
  number,
  title,
  question,
  surface,
  below,
  deep,
  quiz,
}: {
  ticker: string;
  id: string;
  number: number;
  title: string;
  question: string;
  surface: ReactNode;
  below?: ReactNode;
  deep?: ReactNode;
  quiz?: Quiz;
}) {
  const [depth, setDepth] = useState(0);
  const top = useRef<HTMLElement>(null);

  function go(to: number) {
    setDepth(to);
    if (to > 0) markStep(ticker, id, "explored");
    if (to === 0) top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section ref={top} id={`step-${id}`} className="flex scroll-mt-24 flex-col gap-5" aria-labelledby={`step-${id}-title`}>
      <header className="flex items-start gap-4">
        <span aria-hidden="true" className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-ocean font-display text-lg font-bold text-abyss">
          {number}
        </span>
        <div className="flex flex-col gap-0.5">
          <h2 id={`step-${id}-title`} className="font-display text-2xl font-bold">
            {title}
          </h2>
          <p className="text-[16px] text-muted">{question}</p>
        </div>
      </header>

      <div className="flex flex-col gap-4">{surface}</div>

      {depth >= 1 && (
        <div className="flex flex-col gap-6 rounded-2xl border-l-4 border-shallow bg-white/50 py-2 pl-5 pr-1">
          <p className="text-[13px] font-semibold text-mid">{depth === 1 ? "Going deeper" : "Everything on this"}</p>
          {depth === 1 ? below : deep}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {depth === 0 && below && <DepthButton onClick={() => go(1)}>Go deeper</DepthButton>}
        {depth <= 1 && deep && (depth === 1 || !below) && <DepthButton onClick={() => go(2)}>See everything on this</DepthButton>}
        {depth > 0 && (
          <button type="button" onClick={() => go(0)} className="min-h-11 rounded-xl px-3 text-[15px] font-semibold text-muted hover:text-ink">
            Back to the short version
          </button>
        )}
      </div>

      {quiz && <QuizCard ticker={ticker} step={id} quiz={quiz} />}
    </section>
  );
}

function DepthButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-panel px-4 text-[15px] font-semibold text-ocean hover:bg-white"
    >
      {children}
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  );
}

function QuizCard({ ticker, step, quiz }: { ticker: string; step: string; quiz: Quiz }) {
  const [picked, setPicked] = useState<number | null>(null);
  const right = picked === quiz.answer;
  useEffect(() => {
    if (right) markStep(ticker, step, "understood");
  }, [right, ticker, step]);

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-panel p-5">
      <p className="text-[13px] font-semibold text-mid">Check your understanding</p>
      <p className="text-[17px] font-semibold leading-snug">{quiz.question}</p>
      <div className="flex flex-col gap-2" role="group" aria-label="Answers">
        {quiz.options.map((o, i) => {
          const chosen = picked === i;
          const show = picked !== null && (i === quiz.answer || chosen);
          return (
            <button
              key={o}
              type="button"
              disabled={right}
              onClick={() => setPicked(i)}
              className={`flex min-h-11 items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-left text-[16px] transition-colors ${
                show && i === quiz.answer
                  ? "border-[#199e70] bg-[#dff3ea] text-[#0f6b4c]"
                  : show && chosen
                    ? "border-[#d55181] bg-[#fbe7ee] text-[#8a2347]"
                    : "border-line bg-white/70 hover:border-mid"
              }`}
            >
              {o}
              {show && <span className="text-[14px] font-semibold">{i === quiz.answer ? "Right" : "Not quite"}</span>}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <p className="text-[15px] leading-relaxed" aria-live="polite">
          {right ? <span className="text-muted">{quiz.explain}</span> : "Not quite. Have another go: the answer is in this step."}
        </p>
      )}
    </div>
  );
}
