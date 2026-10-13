/**
 * Fathom's loading animation: the logo, with the measuring dot dropping
 * down the line, as if sounding the depth. Shown in the middle of the screen.
 */
export function Loader({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-5 px-5">
      <svg width="76" height="76" viewBox="0 0 100 100" aria-hidden="true" className="fathom-loader">
        <defs>
          <clipPath id="fathom-loader-clip">
            <rect x="6" y="6" width="88" height="88" rx="22" />
          </clipPath>
        </defs>
        <g clipPath="url(#fathom-loader-clip)">
          <rect width="100" height="100" fill="#CDE7F0" />
          <path className="fathom-loader-wave" d="M-50 30 Q-25 24 0 30 T50 30 T100 30 T150 30 V100 H-50 Z" fill="#7FC4D8" />
          <path className="fathom-loader-wave fathom-loader-wave-2" d="M-50 52 Q-25 46 0 52 T50 52 T100 52 T150 52 V100 H-50 Z" fill="#2F8FB3" />
          <path className="fathom-loader-wave fathom-loader-wave-3" d="M-50 74 Q-25 68 0 74 T50 74 T100 74 T150 74 V100 H-50 Z" fill="#0B4F6C" />
        </g>
        <line x1="66" y1="14" x2="66" y2="76" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 7" />
        <circle className="fathom-loader-dot" cx="66" cy="82" r="6" fill="#FFFFFF" />
      </svg>
      <p className="text-[15px] text-muted">{label}</p>
    </div>
  );
}
