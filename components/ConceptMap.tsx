"use client";

/**
 * "How the numbers connect": a quiet map of the main ideas on the page, each box
 * named with its real finance term. Pointing at a box lights up what it's
 * connected to and opens its explanation right beside it; clicking keeps it open
 * while you read. On phones the same ideas are a list with the explanation below.
 */
import { useEffect, useRef, useState } from "react";
import { EDGES, GROUPS, type MapNode } from "@/lib/report/concept-map";
import { AnalystView } from "./Term";
import { TermSearch } from "./TermSearch";

const W = 1056;
const H = 640;
const NW = 196; // box width
const NH = 56; // box height

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
  const [active, setActive] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false); // clicked: stays open until another box is clicked or it's closed
  const section = useRef<HTMLElement>(null);
  const popup = useRef<HTMLDivElement>(null);

  // Once a box is clicked open, clicking anywhere else on the page (or pressing Escape) closes it.
  // Clicking another box simply switches to that one.
  useEffect(() => {
    if (!pinned) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) {
        if (e.key !== "Escape") return;
      } else {
        const t = e.target as Element | null;
        if (popup.current?.contains(t) || t?.closest?.("[data-map-node]")) return;
      }
      setPinned(false);
      setActive(null);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [pinned]);

  // Other parts of the page (like "Key drivers") can point at an idea on the map.
  useEffect(() => {
    const focus = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (!nodes.some((n) => n.id === id)) return;
      setActive(id);
      setPinned(true);
      section.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    window.addEventListener("fathom:map-focus", focus);
    return () => window.removeEventListener("fathom:map-focus", focus);
  }, [nodes]);

  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const near = new Set(EDGES.filter((e) => e.from === active || e.to === active).flatMap((e) => [e.from, e.to]));
  const node = active ? byId[active] : undefined;
  const phoneNode = node ?? byId.profit; // phones always show one explanation under the list
  const phoneNear = new Set(EDGES.filter((e) => e.from === phoneNode?.id || e.to === phoneNode?.id).flatMap((e) => [e.from, e.to]));
  const choose = (id: string) => {
    setActive(id);
    setPinned(true);
  };
  // A term looked up in the search box opens on the map when it's one of the boxes.
  const fromSearch = (key: string) => {
    const n = nodes.find((x) => x.key === key);
    if (!n) return false;
    choose(n.id);
    return true;
  };
  const preview = (id: string) => {
    if (!pinned) setActive(id);
  };

  // Where the explanation sits: beside the box, on whichever side has room, level with it.
  const pop: React.CSSProperties = {};
  if (node) {
    if (node.x + NW / 2 < W * 0.6) pop.left = `${((node.x + NW + 14) / W) * 100}%`;
    else pop.right = `${((W - node.x + 14) / W) * 100}%`;
    if (node.y < H / 2) pop.top = `${(node.y / H) * 100}%`;
    else pop.bottom = `${((H - node.y - NH) / H) * 100}%`;
  }

  return (
    <section ref={section} id="map" className="flex scroll-mt-6 flex-col gap-4" aria-labelledby="map-title">
      <div className="flex max-w-3xl flex-col gap-1">
        <h2 id="map-title" className="font-display text-3xl font-bold">
          How the numbers connect
        </h2>
        <p className="text-[16px] leading-relaxed text-muted">
          The key figures on this page and how one leads to the next, from what drives the business to its share price.
          Point at a box to see what it means and {company}&apos;s own figure; click it to keep the explanation open, and click anywhere else to close it.
        </p>
      </div>
      <TermSearch onPick={fromSearch} placeholder="Search a term, like P/E ratio, ROE or free cash flow" />

      {/* The map, on screens wide enough to read it */}
      <div className="hidden rounded-2xl bg-panel p-4 lg:block">
        <div className="relative" onMouseLeave={() => !pinned && setActive(null)}>
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="group" aria-label="Map of how the figures connect">
            {EDGES.map((e, i) => {
              const a = byId[e.from];
              const b = byId[e.to];
              if (!a || !b) return null;
              const on = e.from === active || e.to === active;
              return (
                <path
                  key={i}
                  d={link(a.x + NW / 2, a.y + NH / 2, b.x + NW / 2, b.y + NH / 2)}
                  fill="none"
                  stroke={on ? "var(--color-ocean)" : "#c9dde6"}
                  strokeWidth={on ? 2.2 : 1.25}
                  strokeDasharray={e.from.startsWith("f-") && !on ? "4 5" : undefined}
                  className="transition-[stroke] duration-200"
                />
              );
            })}
            {nodes.map((n) => {
              const isActive = n.id === active;
              const dim = active !== null && !isActive && !near.has(n.id);
              return (
                <g
                  key={n.id}
                  data-map-node={n.id}
                  transform={`translate(${n.x},${n.y})`}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isActive}
                  aria-label={`${n.label}: ${n.plain}`}
                  onMouseEnter={() => preview(n.id)}
                  onFocus={() => preview(n.id)}
                  onClick={() => choose(n.id)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && choose(n.id)}
                  className="cursor-pointer outline-none"
                  style={{ opacity: dim ? 0.4 : 1, transition: "opacity 200ms" }}
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
                    <text x={28} y={25} fontSize="15.5" fontWeight="700" fill="var(--color-ink)">
                      {n.label}
                    </text>
                    <text x={28} y={44} fontSize="12" fill="var(--color-muted)">
                      {n.plain}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {node && (
            <div
              ref={popup}
              key={node.id}
              style={pop}
              className={`fathom-pop absolute z-20 flex max-h-[min(580px,98%)] w-[380px] flex-col overflow-y-auto rounded-2xl border bg-white p-5 shadow-[0_16px_40px_rgba(11,79,108,0.18)] ${
                // While only pointing, let the pointer pass through to the boxes underneath; once clicked, it can be read and scrolled.
                pinned ? "border-ocean" : "pointer-events-none border-line"
              }`}
              aria-live="polite"
            >
              <Details node={node} company={company} byId={byId} onPick={choose} brief={!pinned} />
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3 text-[13px]">
                {pinned ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPinned(false);
                      setActive(null);
                    }}
                    className="font-semibold text-muted hover:text-ink"
                  >
                    Close
                  </button>
                ) : (
                  <span />
                )}
                <a href={`#step-${node.step}`} className="font-semibold">
                  {node.step === "forces" ? "More in Key drivers" : "More in the research path"}
                </a>
              </div>
            </div>
          )}
        </div>
        <ul className="flex flex-wrap gap-x-5 gap-y-1 px-2 pb-1 pt-2 text-[13px] text-muted">
          {Object.values(GROUPS).map((g) => (
            <li key={g.name} className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: g.color }} />
              {g.name}
            </li>
          ))}
        </ul>
      </div>

      {/* On phones: the same ideas as a list, with the explanation below */}
      <div className="flex flex-col gap-4 lg:hidden">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Choose a figure">
          {nodes.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => setActive(n.id)}
              aria-pressed={n.id === phoneNode?.id}
              className={`flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ${
                n.id === phoneNode?.id ? "bg-ocean text-abyss" : phoneNear.has(n.id) ? "bg-surface text-ocean" : "bg-panel-2 text-muted"
              }`}
            >
              <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: GROUPS[n.group].color }} />
              {n.label}
            </button>
          ))}
        </div>
        {phoneNode && (
          <div className="flex flex-col rounded-2xl bg-panel p-5" aria-live="polite">
            <Details node={phoneNode} company={company} byId={byId} onPick={setActive} />
            <a href={`#step-${phoneNode.step}`} className="mt-3 text-[14px] font-semibold">
              {phoneNode.step === "forces" ? "More in Key drivers" : "More in the research path"}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

function Details({
  node,
  company,
  byId,
  onPick,
  brief = false,
}: {
  node: MapNode;
  company: string;
  byId: Record<string, MapNode>;
  onPick: (id: string) => void;
  brief?: boolean; // while only pointing: the essentials, so it fits beside the box
}) {
  const from = EDGES.filter((e) => e.to === node.id).map((e) => ({ n: byId[e.from], label: e.label }));
  const to = EDGES.filter((e) => e.from === node.id).map((e) => ({ n: byId[e.to], label: e.label }));
  const links = (title: string, list: { n: MapNode; label: string }[]) =>
    list.length > 0 && (
      <div className="flex flex-col gap-1.5">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">{title}</span>
        <div className="flex flex-wrap gap-1.5">
          {list.map(({ n, label }) => (
            <button
              key={n.id}
              type="button"
              onClick={() => onPick(n.id)}
              title={label}
              className="fathom-grow rounded-full bg-surface/60 px-2.5 py-1 text-left text-[13px] font-semibold text-ocean hover:bg-surface"
            >
              {n.label}
            </button>
          ))}
        </div>
      </div>
    );
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col">
        <span className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted">
          <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: GROUPS[node.group].color }} />
          {GROUPS[node.group].name.replace(/ \(.*\)$/, "")}
        </span>
        <h3 className="font-display text-2xl font-bold leading-tight">{node.label}</h3>
        <span className="text-[14px] text-muted">In plain words: {node.plain.toLowerCase()}</span>
      </div>
      {node.value && (
        <p className="rounded-xl bg-surface/40 px-3 py-2 text-[15px]">
          <span className="text-muted">{company}: </span>
          <strong className="font-semibold text-ocean">{node.value}</strong>
        </p>
      )}
      <p className="text-[15px] leading-relaxed">{node.definition}</p>
      {node.why && (
        <p className="text-[14px] leading-relaxed text-muted">
          <strong className="font-semibold text-ink">Why it matters: </strong>
          {node.why}
        </p>
      )}
      {brief ? (
        <p className="text-[13px] text-muted">
          Click the box to keep this open and see why analysts check it, what the number can suggest, the devil&apos;s
          advocate view{node.sides ? " (when a high or low figure is good or bad)" : ""}, and what it connects to.
        </p>
      ) : (
        <AnalystView analyst={node.analyst} reading={node.reading} caveat={node.caveat} sides={node.sides} />
      )}
      {!brief && (from.length > 0 || to.length > 0) && (
        <div className="flex flex-col gap-2.5 border-t border-line pt-3">
          {links("Comes from", from)}
          {links("Leads to", to)}
        </div>
      )}
    </div>
  );
}
