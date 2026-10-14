/**
 * The Surface level: one question, one short answer, one small picture, and a
 * quiet link to where it came from. Pictures here are simple on purpose; the
 * full, interactive charts are one level down.
 */
import type { ReactNode } from "react";

export function LiteCard({
  question,
  term,
  children,
  sources = [],
  wide = false,
}: {
  question: string;
  term?: ReactNode;
  children: ReactNode;
  sources?: { url: string; label: string }[];
  wide?: boolean;
}) {
  return (
    <article className={`fathom-card flex min-w-0 flex-col gap-4 p-6 ${wide ? "md:col-span-2" : ""}`}>
      <header className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <h3 className="text-[15px] font-semibold text-muted">{question}</h3>
        {term && <span className="text-[13px]">{term}</span>}
      </header>
      <div className="flex flex-1 flex-col gap-4">{children}</div>
      {sources.length > 0 && <SourceChips sources={sources} />}
    </article>
  );
}

/** The answer in a few words: a big figure and a short caption. */
export function BigAnswer({ value, caption, tone = "ocean" }: { value: string; caption: string; tone?: "ocean" | "good" | "warn" }) {
  const color = tone === "good" ? "text-[#14805a]" : tone === "warn" ? "text-[#b4532a]" : "text-ocean";
  return (
    <p className="flex flex-col gap-1">
      <span className={`font-display text-[40px] font-bold leading-none tracking-tight tabular-nums ${color}`}>{value}</span>
      <span className="text-[16px] text-ink">{caption}</span>
    </p>
  );
}

/** The answer in one sentence, for questions about the business itself. */
export function SaidAnswer({ text }: { text: string }) {
  return <p className="text-[19px] font-medium leading-[1.5] text-ink">{text}</p>;
}

/** Small "Source" links that open the original document. */
export function SourceChips({ sources }: { sources: { url: string; label: string }[] }) {
  const seen = new Set<string>();
  const unique = sources.filter((s) => (seen.has(s.url) ? false : (seen.add(s.url), true)));
  return (
    <div className="flex flex-wrap gap-1.5">
      {unique.map((s) => (
        <a
          key={s.url}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          title={`Source: ${s.label} (opens the original document)`}
          className="inline-flex items-center gap-1 rounded-full bg-panel-2 px-2.5 py-1 text-[12px] font-semibold text-muted no-underline transition-colors hover:bg-surface hover:text-ocean"
        >
          {shortSource(s.label)}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 17 17 7M9 7h8v8" />
          </svg>
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      ))}
    </div>
  );
}

/** "10-K filed February 20, 2026 · Item 1, Business" → "10-K, Feb 2026". */
function shortSource(label: string): string {
  const form = label.match(/\b(10-K|10-Q|8-K)\b/)?.[1];
  const date = label.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+(\d{4})/);
  if (form && date) return `${form}, ${date[1].slice(0, 3)} ${date[2]}`;
  return form ?? "Source";
}

// ---------------------------------------------------------------- small pictures

/** Sales by year as simple bars, the latest one darker. */
export function MiniBars({ bars }: { bars: { label: string; value: number }[] }) {
  const max = Math.max(...bars.map((b) => b.value), 1);
  return (
    <figure className="m-0 flex flex-col gap-1.5" aria-label={`Sales by year, ${bars.map((b) => b.label).join(", ")}`}>
      <div className="flex h-20 items-end gap-1.5">
        {bars.map((b, i) => (
          <span
            key={b.label}
            className="fathom-grow-up flex-1 rounded-t-md"
            style={{
              height: `${Math.max(4, (b.value / max) * 100)}%`,
              background: i === bars.length - 1 ? "var(--color-ocean)" : "var(--color-surface)",
              animationDelay: `${i * 60}ms`,
            }}
          />
        ))}
      </div>
      <div className="flex gap-1.5 text-[11px] text-muted">
        {bars.map((b) => (
          <span key={b.label} className="flex-1 text-center tabular-nums">
            {b.label}
          </span>
        ))}
      </div>
    </figure>
  );
}

/** One bar for $100 of sales: what went on costs, and the part kept as profit. */
export function KeepBar({ kept }: { kept: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(kept)));
  return (
    <figure className="m-0 flex flex-col gap-2" aria-label={`$${pct} kept as profit, $${100 - pct} spent on costs, out of every $100 of sales`}>
      <div className="flex h-4 overflow-hidden rounded-full bg-surface">
        <span className="h-full bg-surface" style={{ width: `${100 - pct}%` }} />
        <span className="fathom-grow-right h-full rounded-full bg-[#199e70]" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[12px] text-muted">
        <span>${100 - pct} on costs</span>
        <span className="font-semibold text-[#14805a]">${pct} kept</span>
      </div>
    </figure>
  );
}

/** Where a ratio sits from 0 to 2, with a mark at 1 (enough to cover what's due). */
export function MiniGauge({ value, mark = "$1 due" }: { value: number; mark?: string }) {
  const pos = (Math.max(0, Math.min(2, value)) / 2) * 100;
  const enough = value >= 1;
  return (
    <figure className="m-0 flex flex-col gap-1.5" aria-label={`${value.toFixed(2)} on a scale from 0 to 2`}>
      <div className="relative h-4">
        <div className="absolute inset-y-1 left-0 right-0 rounded-full bg-gradient-to-r from-[#f6d9cc] via-[#e3f0f5] to-[#cdeedf]" />
        <span className="absolute inset-y-0 left-1/2 w-px bg-muted/50" />
        <span
          className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow ${enough ? "bg-[#14805a]" : "bg-[#b4532a]"}`}
          style={{ left: `${pos}%` }}
        />
      </div>
      <div className="flex justify-between text-[11px] text-muted">
        <span>$0</span>
        <span>{mark}</span>
        <span>$2</span>
      </div>
    </figure>
  );
}

/** Two or three amounts as slim bars, with short names. */
export function MiniPair({ items }: { items: { label: string; value: number; display: string; color: string }[] }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
      {items.map((it) => (
        <li key={it.label} className="flex flex-col gap-1">
          <span className="flex justify-between gap-3 text-[13px]">
            <span className="text-muted">{it.label.replace(/\s*\(.*\)$/, "")}</span>
            <span className="font-semibold tabular-nums">{it.display}</span>
          </span>
          <span className="h-2 overflow-hidden rounded-full bg-panel-2">
            <span className="fathom-grow-right block h-full rounded-full" style={{ width: `${Math.max(3, (it.value / max) * 100)}%`, background: it.color }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** What the money went on, as one bar with a short key. */
export function UsesBar({ segments }: { segments: { label: string; value: number; display: string; color: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <figure className="m-0 flex flex-col gap-2.5">
      <div className="flex h-4 gap-0.5 overflow-hidden rounded-full">
        {segments.map((s) => (
          <span key={s.label} className="fathom-grow-right h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(s.value / total) * 100}%`, background: s.color }} />
        ))}
      </div>
      <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-[13px]">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            <span className="text-muted">{s.label.replace(/\s*\(.*\)$/, "")}</span>
            <span className="font-semibold tabular-nums">{s.display}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
