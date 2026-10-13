"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * A finance term people can tap to see what it means.
 * Tap again, press Escape, or tap elsewhere to close.
 */
export function Term({
  children,
  term,
  definition,
}: {
  children: React.ReactNode;
  term: string;
  definition: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrapper = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !wrapper.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <span ref={wrapper} className="relative inline">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="cursor-help font-semibold text-ocean underline decoration-ocean/50 decoration-dotted decoration-2 underline-offset-4"
      >
        {children}
      </button>
      {open && (
        <span
          id={id}
          role="note"
          className="absolute left-0 top-full z-20 mt-2 block w-72 max-w-[80vw] rounded-xl border border-line bg-panel-2 p-3.5 text-left text-[15px] font-normal leading-relaxed text-ink shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
        >
          <strong className="font-semibold">{term}:</strong> {definition}
        </span>
      )}
    </span>
  );
}
