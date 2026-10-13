/** Kinds of source, so people can see how solid each point is. */
const KIND_STYLES = {
  "Official filing": "bg-[#E1F0F5] text-ocean",
  "Official data": "bg-[#E1F0F5] text-ocean",
  "News headline": "bg-[#FDEBDD] text-[#8A3B12]",
  Background: "bg-[#EEF0F2] text-[#3D4A54]",
} as const;

export type SourceKind = keyof typeof KIND_STYLES;

export function SourceLink({
  href,
  label,
  kind = "Official filing",
}: {
  href: string;
  label: string;
  kind?: SourceKind;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex flex-wrap items-center gap-2 text-[13px] font-semibold no-underline hover:underline"
    >
      <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${KIND_STYLES[kind]}`}>
        {kind}
      </span>
      <span>{label}</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 3h7v7" />
        <path d="M10 14 21 3" />
        <path d="M19 14v6H4V5h6" />
      </svg>
      <span className="sr-only">(opens SEC website)</span>
    </a>
  );
}
