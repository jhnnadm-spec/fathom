/**
 * "What moves this company": fundamentals, the economy, market mood and outside
 * forces, each with a short chain from cause to consequence. The chain is how
 * such a force usually works; the company's own figures and words sit beside it.
 */
import { FORCE_GROUPS, type Force, type ForceGroup } from "@/lib/report/forces";
import type { MapNode } from "@/lib/report/concept-map";
import { MapLink } from "./MapLink";
import { SourceLink } from "./SourceLink";

export function Forces({ forces, nodes, company }: { forces: Force[]; nodes: MapNode[]; company: string }) {
  const groups = (Object.keys(FORCE_GROUPS) as ForceGroup[]).map((g) => ({ id: g, ...FORCE_GROUPS[g], forces: forces.filter((f) => f.group === g) }));
  const nodeName = (id: string) => nodes.find((n) => n.id === id);
  return (
    <section id="step-forces" className="flex scroll-mt-6 flex-col gap-5" aria-labelledby="forces-title">
      <div className="flex max-w-3xl flex-col gap-1.5">
        <h2 id="forces-title" className="font-display text-3xl font-bold">
          What moves {company}
        </h2>
        <p className="text-[16px] leading-relaxed text-muted">
          A company&apos;s results and share price are pushed around by four kinds of force. Each card shows the chain from
          cause to consequence; tap a result to see where it sits on the map. The chains describe how these forces usually
          work; anything about {company} itself comes from its own figures or reports.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {groups.map((g) => (
          <div key={g.id} className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5 px-1">
              <h3 className="font-display text-xl font-bold">
                {g.title} <span className="font-sans text-[14px] font-normal text-muted">({g.term})</span>
              </h3>
              <p className="text-[14px] leading-snug text-muted">{g.intro}</p>
            </div>
            {g.forces.length === 0 ? (
              <p className="rounded-2xl bg-panel p-4 text-[14px] text-muted">
                {g.id === "outside"
                  ? "Shown once the plain-English explanation of this company's reports has been written (use the button at the top)."
                  : "No figures available for this yet."}
              </p>
            ) : (
              g.forces.map((f) => <ForceCard key={f.id} f={f} nodeName={nodeName} company={company} />)
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function ForceCard({ f, nodeName, company }: { f: Force; nodeName: (id: string) => MapNode | undefined; company: string }) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl bg-panel p-4">
      <h4 className="text-[16px] font-semibold leading-snug">
        {f.plain} <span className="font-normal text-muted">({f.term})</span>
      </h4>
      {f.now && (
        <div className="flex flex-col gap-1">
          <p className="text-[14px] leading-relaxed">
            <span className="font-semibold text-ocean">Now: </span>
            {f.now.text}
          </p>
          {f.now.source && <SourceLink href={f.now.source.url} label={f.now.source.name} kind="Official data" />}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-[12px] font-semibold text-muted">How this usually works</p>
        <ol className="flex flex-col">
          {f.chain.map((step, i) => (
            <li key={i} className="relative flex gap-2.5 pb-2 last:pb-0">
              <span className="flex flex-col items-center">
                <span
                  aria-hidden="true"
                  className={`mt-1 h-2.5 w-2.5 flex-none rounded-full ${i === 0 ? "bg-shallow" : i === 1 ? "bg-mid" : "bg-ocean"}`}
                />
                {i < 2 && <span aria-hidden="true" className="mt-0.5 w-px flex-1 bg-line" />}
              </span>
              <span className={`text-[14px] leading-snug ${i === 2 ? "font-semibold" : ""}`}>
                <span className="sr-only">{["Cause: ", "How it reaches the company: ", "What it changes: "][i]}</span>
                {step}
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {f.affects.map((id) => {
            const n = nodeName(id);
            return n ? (
              <MapLink key={id} id={id}>
                {n.plain}
              </MapLink>
            ) : null;
          })}
        </div>
      </div>
      {f.company && <p className="border-t border-line pt-2.5 text-[14px] leading-relaxed">{f.company}</p>}
      {f.ownWords.length > 0 && (
        <details className="group border-t border-line pt-2.5">
          <summary className="cursor-pointer list-none text-[14px] font-semibold text-ocean">
            What {company} says about this ({f.ownWords.length})
          </summary>
          <ul className="mt-2 flex flex-col gap-3">
            {f.ownWords.map((c) => (
              <li key={c.text} className="flex flex-col gap-1">
                <p className="text-[14px] leading-relaxed">{c.text}</p>
                <SourceLink href={c.source.url} label={c.source.label} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}
