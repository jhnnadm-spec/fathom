/**
 * Simple visuals that don't need to respond to taps: a 100-dot grid for
 * "how much of each $100", a status badge, and small topic icons.
 */
import type { ReactNode } from "react";

/** 100 dots, one per dollar of each $100 of sales; the filled ones are what's kept. */
export function DotGrid({ value, label, color = "#2a78d6" }: { value: number; label: string; color?: string }) {
  const filled = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div className="flex items-center gap-4">
      <div className="grid w-[112px] flex-none grid-cols-10 gap-[3px]" role="img" aria-label={`$${filled} of every $100 ${label}`}>
        {Array.from({ length: 100 }, (_, i) => (
          <span key={i} className="aspect-square rounded-[2px]" style={{ background: i < filled ? color : "var(--color-panel-2)" }} />
        ))}
      </div>
      <p className="text-[15px] leading-snug">
        <strong className="font-display text-2xl font-bold text-ocean">${filled}</strong>
        <span className="text-muted"> of every $100 of sales {label}</span>
      </p>
    </div>
  );
}

/** A clear yes/no style marker for checks like "any warning signs". */
export function StatusBadge({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-2 self-start rounded-full px-3 py-1.5 text-[14px] font-semibold ${
        ok ? "bg-[#dff3ea] text-[#0f6b4c]" : "bg-[#fdecd8] text-[#8a4b0f]"
      }`}
    >
      {ok ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 9v4M12 17h.01" />
          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
        </svg>
      )}
      {children}
    </span>
  );
}

const ICONS: Record<string, ReactNode> = {
  whatItDoes: (
    <>
      <path d="M21 8 12 3 3 8l9 5 9-5z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </>
  ),
  howItMakesMoney: (
    <>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
      <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
    </>
  ),
  competitiveEdge: <path d="M12 3 4 6v6c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V6l-8-3z" />,
  marketPosition: (
    <>
      <path d="M8 21V11H3v10M15 21V5h-5v16M21 21v-7h-5v7" />
    </>
  ),
  industryTrends: (
    <>
      <path d="M3 17 9 11l4 4 8-8" />
      <path d="M15 7h6v6" />
    </>
  ),
  demandDrivers: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
      <path d="M16 4.5a3 3 0 0 1 0 6M21 20c0-2.6-1.6-4.6-4-5.2" />
    </>
  ),
  biggestRisks: (
    <>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  newRisks: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6M12 16.5h.01" />
    </>
  ),
  outlook: (
    <>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  upcoming: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  accounts: (
    <>
      <path d="M12 3 4 6v6c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V6l-8-3z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
};

/** A small line icon for a topic, so readers can spot sections at a glance. */
export function TopicIcon({ name }: { name: string }) {
  const icon = ICONS[name];
  if (!icon) return null;
  return (
    <span aria-hidden="true" className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-surface/70 text-ocean">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {icon}
      </svg>
    </span>
  );
}

/** A slim bar out of 100%, for a share such as a margin. */
export function Meter({ value, color = "#2a78d6" }: { value: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, value * 100));
  return (
    <div className="h-2.5 w-full rounded-full bg-panel-2" role="img" aria-label={`${Math.round(pct)}% of 100%`}>
      <div className="h-2.5 rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}
