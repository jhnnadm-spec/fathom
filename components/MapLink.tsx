"use client";

/** A small button that lights up an idea on the "How it all connects" map. */
export function MapLink({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("fathom:map-focus", { detail: id }))}
      className="fathom-grow inline-flex min-h-8 items-center gap-1 rounded-full bg-surface/60 px-2.5 text-[13px] font-semibold text-ocean hover:bg-surface"
      title="Show on the map"
    >
      {children}
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      </svg>
    </button>
  );
}
