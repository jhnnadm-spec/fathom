"use client";

/**
 * "How it all connects": a quiet map of the main ideas on the page. Pointing at
 * (or tapping) an idea lights up what it's connected to, and the panel below
 * explains it in plain words with this company's figure.
 */
import { useEffect, useRef, useState } from "react";
import { EDGES, GROUPS, type MapNode } from "@/lib/report/concept-map";

const W = 1040;
const H = 640;
const NW = 180; // box width
const NH = 54; // box height

/** A gentle curve between two boxes; long links bow out so they don't run through the boxes between. */
function link(x1: number, y1: number, x2: number, y2: number): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const span = Math.max(Math.abs(dx) / 210, Math.abs(dy) / 120);
  if (span <= 1.5) return `M${x1},${y1} L${x2},${y2}`;
  const len = Math.hypot(dx, dy);
  let nx = -dy / len;
  let ny = dx / len;
  const horizontal = Math.abs(dy) < 20;
  const vertical = Math.abs(dx) < 20;
  if (horizontal && ny * (y1 < H / 2 ? -1 : 1) < 0) [nx, ny] = [-nx, -ny];
  if (vertical && nx * (x1 > W / 2 ? 1 : -1) < 0) [nx, ny] = [-nx, -ny];
  const off = 38 * span;
  return `M${x1},${y1} Q${(x1 + x2) / 2 + nx * off},${(y1 + y2) / 2 + ny * off} ${x2},${y2}`;
}

export function ConceptMap({ nodes, company }: { nodes: MapNode[]; company: string }) {
  const [active, setActive] = useState<string>("profit");
  const section = useRef<HTMLElement>(null);
  // After another part of the page points at an idea, the page scrolls the map under the pointer;
  // ignore hovering for a moment so that doesn't replace the idea that was asked for.
  const holdHover = useRef(false);
  const hover = (id: string) => {
    if (!holdHover.current) setActive(id);
  };

  // Other parts of the page (like "What moves this company") can point at an idea on the map.
  useEffect(() => {
    const focus = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (!nodes.some((n) => n.id === id)) return;
      setActive(id);
      holdHover.current = true;
      setTimeout(() => (holdHover.current = false), 1500);
      section.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    window.addEventListener("fathom:map-focus", focus);
    return () => window.removeEventListener("fathom:map-focus", focus);
  }, [nodes]);
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const near = new Set(EDGES.filter((e) => e.from === active || e.to === active).flatMap((e) => [e.from, e.to]));
  const node = byId[active];
  const from = EDGES.filter((e) => e.to === active).map((e) => ({ n: byId[e.from], label: e.label }));
  const to = EDGES.filter((e) => e.from === active).map((e) => ({ n: byId[e.to], label: e.label }));

  return (
    <section ref={section} id="map" className="flex scroll-mt-6 flex-col gap-4" aria-labelledby="map-title">
      <div className="flex flex-col gap-1">
        <h2 id="map-title" className="font-display text-2xl font-bold">
          How it all connects
        </h2>
        <p className="max-w-3xl text-[15px] leading-relaxed text-muted">
          The main ideas on this page and how they lead into each other. Point at or tap any box to see what it means and{" "}
          {company}&apos;s own figure.
        </p>
      </div>

      {/* The map, on screens wide enough to read it */}
      <div className="hidden rounded-2xl bg-panel p-4 lg:block">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="group" aria-label="Map of how the ideas connect">
          {EDGES.map((e, i) => {
            const a = byId[e.from];
            const b = byId[e.to];
            if (!a || !b) return null;
            const on = e.from === active || e.to === active;
            const x1 = a.x + NW / 2;
            const y1 = a.y + NH / 2;
            const x2 = b.x + NW / 2;
            const y2 = b.y + NH / 2;
            return (
              <g key={i}>
                <path
                  d={link(x1, y1, x2, y2)}
                  fill="none"
                  stroke={on ? "var(--color-ocean)" : "#c9dde6"}
                  strokeWidth={on ? 2.2 : 1.25}
                  strokeDasharray={e.from.startsWith("f-") && !on ? "4 5" : undefined}
                  className="transition-[stroke] duration-200"
                />
              </g>
            );
          })}
          {nodes.map((n) => {
            const isActive = n.id === active;
            const dim = !isActive && !near.has(n.id);
            return (
              <g
                key={n.id}
                transform={`translate(${n.x},${n.y})`}
                tabIndex={0}
                role="button"
                aria-pressed={isActive}
                aria-label={`${n.plain} (${n.term})`}
                onMouseEnter={() => hover(n.id)}
                onFocus={() => setActive(n.id)}
                onClick={() => setActive(n.id)}
                className="cursor-pointer outline-none"
                style={{ opacity: dim ? 0.45 : 1, transition: "opacity 200ms" }}
              >
                <g
                  style={{
                    transform: isActive ? "scale(1.06)" : "scale(1)",
                    transformOrigin: `${NW / 2}px ${NH / 2}px`,
                    transition: "transform 180ms ease-out",
                  }}
                >
                  <rect
                    width={NW}
                    height={NH}
                    rx={12}
                    fill="#ffffff"
                    stroke={isActive ? "var(--color-ocean)" : "var(--color-line)"}
                    strokeWidth={isActive ? 2 : 1}
                  />
                  <circle cx={15} cy={NH / 2} r={4.5} fill={GROUPS[n.group].color} />
                  <text x={28} y={23} fontSize="14" fontWeight="600" fill="var(--color-ink)">
                    {n.plain}
                  </text>
                  <text x={28} y={41} fontSize="12" fill="var(--color-muted)">
                    ({n.term})
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
        <ul className="flex flex-wrap gap-x-5 gap-y-1 px-2 pb-1 pt-2 text-[13px] text-muted">
          {Object.values(GROUPS).map((g) => (
            <li key={g.name} className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: g.color }} />
              {g.name}
            </li>
          ))}
        </ul>
      </div>

      {/* On phones: the same ideas as a list */}
      <div className="flex flex-wrap gap-1.5 lg:hidden" role="group" aria-label="Choose an idea">
        {nodes.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => setActive(n.id)}
            aria-pressed={n.id === active}
            className={`flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ${
              n.id === active ? "bg-ocean text-abyss" : near.has(n.id) ? "bg-surface text-ocean" : "bg-panel-2 text-muted"
            }`}
          >
            <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: GROUPS[n.group].color }} />
            {n.plain}
          </button>
        ))}
      </div>

      {node && (
        <div className="flex flex-col gap-3 rounded-2xl bg-panel p-5" aria-live="polite">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="font-display text-xl font-bold">
              {node.plain} <span className="font-sans text-[15px] font-normal text-muted">({node.term})</span>
            </h3>
            <a href={`#step-${node.step}`} className="text-[14px] font-semibold">
              {node.step === "forces" ? "Read more in What moves this company" : "Read more in the research path"}
            </a>
          </div>
          {node.value && (
            <p className="text-[17px]">
              <span className="text-muted">{company}: </span>
              <strong className="font-semibold text-ocean">{node.value}</strong>
            </p>
          )}
          <p className="text-[16px] leading-relaxed">{node.definition}</p>
          {node.why && (
            <p className="text-[15px] leading-relaxed text-muted">
              <strong className="font-semibold text-ink">Why it matters: </strong>
              {node.why}
            </p>
          )}
          {(from.length > 0 || to.length > 0) && (
            <div className="grid gap-3 border-t border-line pt-3 text-[14px] sm:grid-cols-2">
              {from.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="font-semibold text-muted">Comes from</span>
                  {from.map(({ n, label }) => (
                    <button key={n.id} type="button" onClick={() => setActive(n.id)} className="text-left text-ocean hover:underline">
                      {n.plain} <span className="text-muted">({n.term})</span>
                      {label && <span className="block text-[13px] text-muted">{label}</span>}
                    </button>
                  ))}
                </div>
              )}
              {to.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="font-semibold text-muted">Leads to</span>
                  {to.map(({ n, label }) => (
                    <button key={n.id} type="button" onClick={() => setActive(n.id)} className="text-left text-ocean hover:underline">
                      {n.plain} <span className="text-muted">({n.term})</span>
                      {label && <span className="block text-[13px] text-muted">{label}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
