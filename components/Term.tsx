"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { GlossaryEntry } from "@/lib/glossary";

/**
 * A finance idea written in plain words, with its real name in brackets:
 * "kept as profit (net income)". Pointing at it (or tapping on a phone) makes
 * it grow slightly and shows what it means and why it matters.
 */
export function Term({
  children,
  term,
  definition,
  why,
  bracket,
  more,
}: {
  children: React.ReactNode;
  term: string;
  definition: string;
  why?: string;
  bracket?: string; // the real term, shown after the plain words when they differ
  more?: Pick<GlossaryEntry, "analyst" | "reading" | "caveat">; // the analyst's view, for key terms
}) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false); // opened by a tap or click, stays until closed
  const id = useId();
  const wrapper = useRef<HTMLSpanElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; maxHeight: number } | null>(null);
  const card = useRef<HTMLSpanElement>(null);

  // The explanation floats on top of the whole page (not inside a tile), placed just under the words.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = trigger.current?.getBoundingClientRect();
      if (!r) return;
      const width = Math.min(more ? 400 : 320, window.innerWidth * 0.9);
      const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
      // Below the words when there's room; otherwise above them, so the whole explanation stays on screen.
      const h = card.current?.offsetHeight ?? 0;
      const below = window.innerHeight - r.bottom - 16;
      const above = r.top - 16;
      if (h && h > below && above > below) {
        const maxHeight = Math.min(h, above);
        setPos({ top: r.top - 8 - maxHeight, left, maxHeight });
      } else {
        setPos({ top: r.bottom + 8, left, maxHeight: Math.max(160, below) });
      }
    };
    place();
    const again = requestAnimationFrame(place); // once more, now the card's height is known
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      cancelAnimationFrame(again);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, more]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      const inside = wrapper.current?.contains(e.target as Node) || document.getElementById(id)?.contains(e.target as Node);
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !inside) {
        setOpen(false);
        setPinned(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open, id]);

  // Only devices with a real pointer (mouse, trackpad) open on hover; phones open on tap.
  const canHover = () => typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;
  const enter = () => {
    if (!canHover()) return;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setOpen(true), 120);
  };
  const leave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    if (!pinned) hoverTimer.current = setTimeout(() => setOpen(false), 150);
  };

  return (
    <span ref={wrapper} className="relative inline" onMouseEnter={enter} onMouseLeave={leave}>
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          const next = !(open && pinned);
          setOpen(next);
          setPinned(next);
        }}
        className={`inline cursor-help rounded-sm font-semibold text-ocean underline decoration-mid decoration-dotted decoration-2 underline-offset-4 transition-[font-size,color] duration-200 motion-reduce:transition-none ${
          open ? "text-[1.08em] text-ocean-dark" : ""
        }`}
      >
        {children}
        {bracket && <span className="font-semibold text-ink no-underline"> ({bracket})</span>}
      </button>
      {open &&
        pos &&
        createPortal(
          <span
            id={id}
            ref={card}
            role="note"
            onMouseEnter={() => hoverTimer.current && clearTimeout(hoverTimer.current)}
            onMouseLeave={leave}
            style={{ position: "fixed", top: pos.top, left: pos.left, maxHeight: pos.maxHeight }}
            className={`fathom-pop z-50 block overflow-y-auto rounded-xl border border-line bg-white p-4 text-left text-[15px] font-normal leading-relaxed text-ink shadow-[0_12px_32px_rgba(11,79,108,0.18)] ${
              more ? "w-[400px] max-w-[90vw]" : "w-80 max-w-[85vw]"
            }`}
          >
            <strong className="block font-display text-[16px] font-bold">{term}</strong>
            <span className="mt-1 block">{definition}</span>
            {why && (
              <span className="mt-2.5 block border-t border-line pt-2.5 text-[14px] text-muted">
                <strong className="font-semibold text-ink">Why it matters: </strong>
                {why}
              </span>
            )}
            {more && <AnalystView {...more} />}
          </span>,
          document.body,
        )}
    </span>
  );
}

/** How an analyst reads a number, including the case against the obvious reading. */
export function AnalystView({ analyst, reading, caveat }: Pick<GlossaryEntry, "analyst" | "reading" | "caveat">) {
  if (!analyst && !reading && !caveat) return null;
  const row = (label: string, text: string | undefined, tone: string) =>
    text && (
      <span className="block">
        <strong className={`block text-[12px] font-semibold uppercase tracking-wide ${tone}`}>{label}</strong>
        <span className="block text-[14px] leading-relaxed">{text}</span>
      </span>
    );
  return (
    <span className="mt-2.5 flex flex-col gap-2.5 border-t border-line pt-2.5">
      {row("Why analysts check it", analyst, "text-ocean")}
      {row("What the number can suggest", reading, "text-mid")}
      {row("Devil's advocate", caveat, "text-[#b4532a]")}
    </span>
  );
}
