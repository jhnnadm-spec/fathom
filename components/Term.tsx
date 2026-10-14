"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
}: {
  children: React.ReactNode;
  term: string;
  definition: string;
  why?: string;
  bracket?: string; // the real term, shown after the plain words when they differ
}) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false); // opened by a tap or click, stays until closed
  const id = useId();
  const wrapper = useRef<HTMLSpanElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // The explanation floats on top of the whole page (not inside a tile), placed just under the words.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = trigger.current?.getBoundingClientRect();
      if (!r) return;
      const width = Math.min(320, window.innerWidth * 0.85);
      setPos({ top: r.bottom + 8, left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)) });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

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
        {bracket && <span className="font-normal text-muted no-underline"> ({bracket})</span>}
      </button>
      {open &&
        pos &&
        createPortal(
          <span
            id={id}
            role="note"
            onMouseEnter={() => hoverTimer.current && clearTimeout(hoverTimer.current)}
            onMouseLeave={leave}
            style={{ position: "fixed", top: pos.top, left: pos.left }}
            className="fathom-pop z-50 block w-80 max-w-[85vw] rounded-xl border border-line bg-white p-4 text-left text-[15px] font-normal leading-relaxed text-ink shadow-[0_12px_32px_rgba(11,79,108,0.18)]"
          >
            <strong className="block font-display text-[16px] font-bold">{term}</strong>
            <span className="mt-1 block">{definition}</span>
            {why && (
              <span className="mt-2.5 block border-t border-line pt-2.5 text-[14px] text-muted">
                <strong className="font-semibold text-ink">Why it matters: </strong>
                {why}
              </span>
            )}
          </span>,
          document.body,
        )}
    </span>
  );
}
