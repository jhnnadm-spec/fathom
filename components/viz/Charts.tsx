"use client";

/**
 * Fathom's interactive charts. Every one answers to hover, tap and keyboard,
 * shows its values as text too (labels or a table), and draws gently into
 * place once when it first appears.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/** True once the chart has scrolled into view, so it can draw in. */
function useAppeared<T extends Element>() {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    if (typeof IntersectionObserver === "undefined") {
      const t = setTimeout(() => setShown(true), 0);
      return () => clearTimeout(t);
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setShown(true);
        io.disconnect();
      }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);
  return [ref, shown] as const;
}

// ---------------------------------------------------------------- stacked bar: "where each $100 goes"

export type Segment = { label: string; value: number; display: string; color: string; note: string };

export function StackedBar({ segments, caption, selectHint = "Tap a part of the bar" }: { segments: Segment[]; caption?: string; selectHint?: string }) {
  const [ref, shown] = useAppeared<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const sel = active === null ? null : segments[active];
  return (
    <figure className="m-0 flex flex-col gap-3">
      {caption && <figcaption className="text-[13px] text-muted">{caption}</figcaption>}
      <div ref={ref} className="flex h-9 w-full gap-[2px] overflow-hidden rounded-lg" role="group" aria-label="Parts of the bar">
        {segments.map((s, i) => (
          <button
            key={s.label}
            type="button"
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onClick={() => setActive(i)}
            aria-label={`${s.label}: ${s.display}`}
            aria-pressed={active === i}
            className="h-full cursor-pointer transition-[width,opacity] duration-700 ease-out first:rounded-l-lg last:rounded-r-lg hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocean motion-reduce:transition-none"
            style={{
              width: shown ? `${(s.value / total) * 100}%` : "0%",
              transitionDelay: `${i * 90}ms`,
              background: s.color,
              opacity: active !== null && active !== i ? 0.45 : 1,
            }}
          />
        ))}
      </div>
      <ul className="grid gap-x-5 gap-y-1.5 text-[14px] sm:grid-cols-2">
        {segments.map((s, i) => (
          <li key={s.label}>
            <button
              type="button"
              onClick={() => setActive(i)}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              className={`flex w-full items-center gap-2 rounded-md py-0.5 text-left ${active === i ? "text-ink" : "text-muted"} hover:text-ink`}
            >
              <span aria-hidden="true" className="h-2.5 w-2.5 flex-none rounded-[3px]" style={{ background: s.color }} />
              <span className="flex-1">{s.label}</span>
              <span className="font-semibold tabular-nums text-ink">{s.display}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="min-h-[3em] rounded-lg bg-panel-2 px-3.5 py-2.5 text-[14px] leading-relaxed" aria-live="polite">
        {sel ? (
          <>
            <strong className="font-semibold text-ink">
              {sel.display} {sel.label.toLowerCase()}.
            </strong>{" "}
            <span className="text-muted">{sel.note}</span>
          </>
        ) : (
          <span className="text-muted">{selectHint} to see what it means.</span>
        )}
      </p>
    </figure>
  );
}

// ---------------------------------------------------------------- column chart: sales by year

export type Bar = { label: string; value: number; display: string; detail: string };

export function Columns({ bars, color, highlight }: { bars: Bar[]; color: string; highlight: string }) {
  const [ref, shown] = useAppeared<HTMLDivElement>();
  const [active, setActive] = useState(bars.length - 1);
  const max = Math.max(...bars.map((b) => b.value), 1);
  const sel = bars[active];
  return (
    <figure className="m-0 flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3 text-[14px]" aria-live="polite">
        <span className="text-muted">{sel.detail}</span>
        <span className="font-semibold tabular-nums">{sel.display}</span>
      </div>
      <div ref={ref} className="flex h-28 items-end gap-2" role="group" aria-label="Sales by year">
        {bars.map((b, i) => (
          <button
            key={b.label}
            type="button"
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onClick={() => setActive(i)}
            aria-label={`${b.detail}: ${b.display}`}
            className="group flex h-full flex-1 cursor-pointer flex-col justify-end focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocean"
          >
            <span
              className="block w-full rounded-t-[4px] transition-[height] duration-700 ease-out group-hover:brightness-110 motion-reduce:transition-none"
              style={{
                height: shown ? `${Math.max(3, (b.value / max) * 100)}%` : "0%",
                transitionDelay: `${i * 70}ms`,
                background: i === bars.length - 1 ? highlight : color,
                outline: i === active ? "2px solid var(--color-ink)" : undefined,
                outlineOffset: 2,
              }}
            />
          </button>
        ))}
      </div>
      <div className="flex gap-2 border-t border-line pt-1.5 text-[12px] text-muted">
        {bars.map((b) => (
          <span key={b.label} className="flex-1 text-center tabular-nums">
            {b.label}
          </span>
        ))}
      </div>
      <details className="text-[13px] text-muted">
        <summary className="cursor-pointer">Show as a table</summary>
        <table className="mt-2 w-full text-[14px]">
          <tbody>
            {bars.map((b) => (
              <tr key={b.label} className="border-t border-line">
                <td className="py-1.5">{b.detail}</td>
                <td className="py-1.5 text-right tabular-nums text-ink">{b.display}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

// ---------------------------------------------------------------- gauge: can it pay its bills?

export function BillsGauge({ value }: { value: number }) {
  const [ref, shown] = useAppeared<HTMLDivElement>();
  const pos = Math.max(0, Math.min(2, value)) / 2; // 0 to 2 across the track
  return (
    <div className="flex flex-col gap-2">
      <div ref={ref} className="relative h-3 rounded-full bg-panel-2">
        <div className="absolute inset-y-0 left-0 w-1/2 rounded-l-full bg-[#d55181]/35" />
        <div className="absolute inset-y-0 right-0 w-1/2 rounded-r-full bg-[#199e70]/35" />
        <div className="absolute -top-1.5 h-6 w-[3px] rounded bg-line" style={{ left: "calc(50% - 1px)" }} aria-hidden="true" />
        <div
          className="absolute -top-2 h-7 w-2 rounded-full bg-ink shadow-[0_0_0_3px_#ffffff] transition-[left] duration-1000 ease-out motion-reduce:transition-none"
          style={{ left: `calc(${shown ? pos * 100 : 0}% - 4px)` }}
          role="img"
          aria-label={`$${value.toFixed(2)} for every $1 due within a year`}
        />
      </div>
      <div className="flex justify-between text-[12px] text-muted">
        <span>Less than it owes soon</span>
        <span>$1 for $1</span>
        <span>More than enough</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- two labelled bars: cash vs debt

export function PairBars({ items }: { items: { label: string; value: number; display: string; color: string }[] }) {
  const [ref, shown] = useAppeared<HTMLDivElement>();
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div ref={ref} className="flex flex-col gap-3">
      {items.map((it, i) => (
        <div key={it.label} className="flex flex-col gap-1">
          <div className="flex justify-between text-[14px]">
            <span className="text-muted">{it.label}</span>
            <span className="font-semibold tabular-nums">{it.display}</span>
          </div>
          <div className="h-3 rounded-full bg-panel-2">
            <div
              className="h-3 rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
              style={{ width: shown ? `${Math.max(2, (it.value / max) * 100)}%` : "0%", background: it.color, transitionDelay: `${i * 120}ms` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- line chart: margins over the years

export function Lines({
  years,
  series,
}: {
  years: { label: string; detail: string }[];
  series: { name: string; color: string; values: (number | undefined)[] }[];
}) {
  const [ref, shown] = useAppeared<SVGSVGElement>();
  const [active, setActive] = useState(years.length - 1);
  const id = useId();
  const W = 560;
  const H = 220;
  const pad = { l: 44, r: 96, t: 14, b: 26 };
  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== undefined));
  const top = Math.min(1, Math.ceil((Math.max(...all, 0.1) + 0.05) * 10) / 10);
  const bottom = Math.max(-0.5, Math.min(0, Math.floor(Math.min(...all) * 10) / 10));
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / Math.max(1, years.length - 1);
  const y = (v: number) => pad.t + ((top - v) / (top - bottom)) * (H - pad.t - pad.b);
  const pct = (v?: number) => (v === undefined ? "–" : `${(Math.round(v * 1000) / 10).toLocaleString("en-US")}%`);

  function move(e: React.PointerEvent<SVGSVGElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    let best = 0;
    for (let i = 0; i < years.length; i++) if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    setActive(best);
  }

  return (
    <figure className="m-0 flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-[14px]" aria-live="polite">
        <span className="text-muted">{years[active].detail}</span>
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-[2px] w-3.5 rounded" style={{ background: s.color }} />
            <strong className="font-semibold tabular-nums">{pct(s.values[active])}</strong>
            <span className="text-muted">{s.name.replace(" margin", "")}</span>
          </span>
        ))}
      </div>
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none"
        role="img"
        aria-labelledby={`${id}-t`}
        onPointerMove={move}
        onPointerDown={move}
      >
        <title id={`${id}-t`}>Margins year by year</title>
        {[bottom, (top + bottom) / 2, top].map((g) => (
          <g key={g}>
            <line x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} stroke="var(--color-line)" strokeWidth="1" />
            <text x={pad.l - 8} y={y(g) + 4} fontSize="11" textAnchor="end" fill="var(--color-muted)">
              {pct(g)}
            </text>
          </g>
        ))}
        <line x1={x(active)} x2={x(active)} y1={pad.t} y2={H - pad.b} stroke="var(--color-muted)" strokeWidth="1" strokeDasharray="3 3" />
        {(() => {
          // Place each line's name at its last point, nudged apart so names never overlap.
          const ends = series
            .map((s) => {
              const last = s.values.map((v, i) => (v === undefined ? -1 : i)).filter((i) => i >= 0).at(-1)!;
              return { name: s.name, x: x(last) + 8, y: y(s.values[last]!) + 4 };
            })
            .sort((a, b) => a.y - b.y);
          for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 14) ends[i].y = ends[i - 1].y + 14;
          return ends.map((l) => (
            <text key={`label-${l.name}`} x={l.x} y={l.y} fontSize="11.5" fill="var(--color-ink)">
              {l.name.replace(" margin", "")}
            </text>
          ));
        })()}
        {series.map((s) => {
          const pts = s.values.map((v, i) => (v === undefined ? null : `${x(i)},${y(v)}`)).filter(Boolean);
          return (
            <g key={s.name}>
              <polyline
                points={pts.join(" ")}
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray="1"
                strokeDashoffset={shown ? 0 : 1}
                style={{ transition: "stroke-dashoffset 1.1s ease-out" }}
                className="motion-reduce:[transition:none]"
              />
              {s.values[active] !== undefined && (
                <circle cx={x(active)} cy={y(s.values[active]!)} r="4.5" fill={s.color} stroke="#ffffff" strokeWidth="2" />
              )}
            </g>
          );
        })}
        {years.map((yr, i) => (
          <text key={yr.label} x={x(i)} y={H - 6} fontSize="11.5" textAnchor="middle" fill={i === active ? "var(--color-ink)" : "var(--color-muted)"}>
            {yr.label}
          </text>
        ))}
      </svg>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Choose a year">
        {years.map((yr, i) => (
          <button
            key={yr.label}
            type="button"
            onClick={() => setActive(i)}
            aria-pressed={i === active}
            className={`min-h-9 rounded-full px-3 text-[13px] font-semibold ${i === active ? "bg-ocean text-abyss" : "bg-panel-2 text-muted hover:text-ink"}`}
          >
            {yr.label}
          </button>
        ))}
      </div>
    </figure>
  );
}

/** A small headline number with a caption, for the top of a tile. */
export function Headline({ value, caption, tone = "glow" }: { value: string; caption?: ReactNode; tone?: "glow" | "plain" }) {
  return (
    <div className="flex flex-col">
      <span className={`font-display text-3xl font-bold tabular-nums ${tone === "glow" ? "text-ocean" : "text-ink"}`}>{value}</span>
      {caption && <span className="text-[13px] text-muted">{caption}</span>}
    </div>
  );
}
