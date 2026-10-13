import { useId } from "react";

/**
 * The Fathom mark: four layers of water getting darker with depth,
 * with a measuring line dropping to the deepest point.
 */
export function LogoMark({ size = 36 }: { size?: number }) {
  // Each logo on a page needs its own clip-path id, so useId gives a unique one.
  const clipId = `fathom-clip-${useId().replace(/:/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <rect x="6" y="6" width="88" height="88" rx="22" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect width="100" height="100" fill="#CDE7F0" />
        <path d="M0 30 Q25 24 50 30 T100 30 V100 H0 Z" fill="#7FC4D8" />
        <path d="M0 52 Q25 46 50 52 T100 52 V100 H0 Z" fill="#2F8FB3" />
        <path d="M0 74 Q25 68 50 74 T100 74 V100 H0 Z" fill="#0B4F6C" />
      </g>
      <line
        x1="66"
        y1="14"
        x2="66"
        y2="76"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="1 7"
      />
      <circle cx="66" cy="82" r="6" fill="#FFFFFF" />
    </svg>
  );
}

/** The mark with the word "Fathom" next to it. */
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="font-display text-2xl font-bold tracking-tight text-ink">
        Fathom
      </span>
    </span>
  );
}
