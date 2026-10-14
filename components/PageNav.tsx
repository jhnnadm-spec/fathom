"use client";

/**
 * On wide screens, a menu that stays on the left of a company page: how much
 * detail to show, the seven questions (ticked once explored), how it all fits
 * together, and the reference sections. The part you're reading is highlighted.
 */
import { useEffect, useState } from "react";
import { getProgress, STORE_EVENT, type StepState } from "@/lib/client/store";
import { DepthSwitch } from "./Depth";

type Entry = { id: string; title: string; sub?: string; step?: number };

export function PageNav({
  ticker,
  company,
  steps,
  extra,
}: {
  ticker: string;
  company: string;
  steps: { id: string; title: string; term: string }[];
  extra: Entry[];
}) {
  const [p, setP] = useState<Record<string, StepState>>({});
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const sync = () => setP(getProgress(ticker));
    sync();
    window.addEventListener(STORE_EVENT, sync);
    return () => window.removeEventListener(STORE_EVENT, sync);
  }, [ticker]);

  const top: Entry[] = [
    { id: "top", title: company, sub: "Who it is" },
    { id: "start", title: "Seven questions", sub: "Start here" },
  ];
  const together: Entry[] = [
    { id: "whole-picture", title: "How it fits together", sub: "The map of the numbers" },
    { id: "step-forces", title: "What moves the results", sub: "Key drivers" },
  ];
  const path: Entry[] = steps.map((s, i) => ({
    id: `step-${s.id}`,
    title: s.title,
    sub: s.term,
    step: i + 1,
  }));
  const all = [...top, ...path, ...together, ...extra];
  const key = all.map((e) => e.id).join(",");

  // Highlight the section nearest the top of the screen.
  useEffect(() => {
    const ids = key.split(",");
    const pick = () => {
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.3)
          current = id;
      }
      setActive(current);
    };
    pick();
    window.addEventListener("scroll", pick, { passive: true });
    return () => window.removeEventListener("scroll", pick);
  }, [key]);

  const done = steps.filter((s) => p[s.id]).length;
  const link = (e: Entry) => {
    const explored = e.step !== undefined && p[e.id.replace(/^step-/, "")];
    const on = active === e.id;
    return (
      <li key={e.id}>
        <a
          href={`#${e.id}`}
          aria-current={on ? "location" : undefined}
          className={`flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 text-[14px] no-underline transition-colors ${
            on
              ? "bg-white font-semibold text-ocean shadow-[0_2px_10px_rgba(11,79,108,0.08)]"
              : "text-muted hover:bg-white/60 hover:text-ink"
          }`}
        >
          {e.step !== undefined && (
            <span
              aria-hidden="true"
              className={`flex h-5 w-5 flex-none items-center justify-center rounded-full text-[11px] font-bold ${explored ? "bg-ocean text-abyss" : "bg-panel-2 text-muted"}`}
            >
              {explored ? (
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              ) : (
                e.step
              )}
            </span>
          )}
          <span className="flex flex-col py-1 leading-tight">
            <span>{e.title}</span>
            {e.sub && <span className="text-[12px] font-normal text-muted">{e.sub}</span>}
          </span>
          {explored && <span className="sr-only">(explored)</span>}
        </a>
      </li>
    );
  };

  return (
    <nav
      aria-label="On this page"
      className="sticky top-4 flex max-h-[calc(100vh-2rem)] flex-col gap-4 overflow-y-auto pb-4"
    >
      <div className="flex flex-col gap-2 px-1">
        <p className="px-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted">How much detail</p>
        <DepthSwitch variant="compact" />
      </div>
      <ul className="flex flex-col gap-0.5">{top.map(link)}</ul>
      <div className="flex flex-col gap-1.5 px-2.5">
        <div className="flex items-baseline justify-between text-[12px]">
          <span className="font-semibold uppercase tracking-wide text-muted">
            Seven questions
          </span>
          <span className="text-muted">
            {done}/{steps.length}
          </span>
        </div>
        <div className="h-1 rounded-full bg-panel-2">
          <div
            className="h-1 rounded-full bg-mid transition-[width] duration-500"
            style={{ width: `${(done / steps.length) * 100}%` }}
          />
        </div>
      </div>
      <ul className="-mt-1 flex flex-col gap-0.5">{path.map(link)}</ul>
      <p className="px-2.5 text-[12px] font-semibold uppercase tracking-wide text-muted">
        Putting it together
      </p>
      <ul className="-mt-2 flex flex-col gap-0.5">{together.map(link)}</ul>
      <p className="px-2.5 text-[12px] font-semibold uppercase tracking-wide text-muted">
        Reference
      </p>
      <ul className="-mt-2 flex flex-col gap-0.5">{extra.map(link)}</ul>
    </nav>
  );
}
