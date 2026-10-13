/** Kinds of source, so people can see how solid each point is. */
export type SourceKind = "Official filing" | "Official data" | "News headline" | "Background";

/** A quiet link to where a point came from: small grey text that opens the original document. */
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
      title={`${kind}: opens the original document`}
      className="inline-flex items-center gap-1 self-start text-[13px] text-muted underline decoration-line underline-offset-4 hover:text-ocean hover:decoration-ocean"
    >
      <span>Source: {label}</span>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 3h7v7" />
        <path d="M10 14 21 3" />
        <path d="M19 14v6H4V5h6" />
      </svg>
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}
