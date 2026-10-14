/**
 * Fathom's loading animation: a block of dense, grey "jargon" lines. A soft blue
 * lens sweeps across it, and everything behind the lens turns into fewer, shorter,
 * rounded lines: the report being turned into plain words. Below it, the steps
 * Fathom is working through take turns. Pure CSS, and still for anyone who has
 * asked their device for less motion.
 */
const JARGON = [92, 100, 84, 97, 70];
const PLAIN = [58, 76, 40];

export function Loader({ label = "Loading…", steps }: { label?: string; steps?: string[] }) {
  const lines = steps && steps.length > 0 ? steps : [label];
  return (
    <div role="status" aria-live="polite" className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-8 px-5">
      <div aria-hidden="true" className="fathom-translate relative h-[132px] w-[220px] overflow-hidden rounded-3xl border border-line bg-white/90 p-6 shadow-[0_20px_50px_rgba(10,42,58,0.10)]">
        {/* The jargon: many tight grey lines */}
        <div className="flex flex-col gap-[7px]">
          {JARGON.map((w, i) => (
            <span key={i} className="h-[7px] rounded-[2px] bg-[#c9d5db]" style={{ width: `${w}%` }} />
          ))}
        </div>
        {/* The plain words: fewer, rounder, blue, revealed behind the lens */}
        <div className="fathom-translate-plain absolute inset-0 flex flex-col justify-center gap-[13px] bg-white p-6">
          {PLAIN.map((w, i) => (
            <span key={i} className="h-[11px] rounded-full bg-gradient-to-r from-mid to-shallow" style={{ width: `${w}%` }} />
          ))}
        </div>
        {/* The lens */}
        <span className="fathom-translate-lens absolute inset-y-3 w-[3px] rounded-full bg-mid shadow-[0_0_18px_6px_rgba(127,196,216,0.55)]" />
      </div>
      <p className="relative h-6 w-full max-w-md text-center text-[16px] font-medium text-muted">
        {lines.map((l, i) => (
          <span
            key={l}
            className={lines.length > 1 ? "fathom-loader-line absolute inset-0" : ""}
            style={lines.length > 1 ? { animationDelay: `${i * 2.4}s`, animationDuration: `${lines.length * 2.4}s` } : undefined}
          >
            {l}
          </span>
        ))}
      </p>
    </div>
  );
}
