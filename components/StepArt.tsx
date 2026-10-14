/**
 * Small drawings for each part of the research path, in Fathom's water colours.
 * They're decoration only (hidden from screen readers): each one is a picture of
 * the question the step asks.
 */
import type { ReactNode } from "react";

const C = { pale: "#E6F3F8", surface: "#CDE7F0", shallow: "#7FC4D8", mid: "#2F8FB3", deep: "#0B4F6C", white: "#FFFFFF" };

const ART: Record<string, ReactNode> = {
  // The business: a shop with an awning
  business: (
    <>
      <rect x="22" y="40" width="52" height="34" rx="3" fill={C.white} stroke={C.deep} strokeWidth="2.5" />
      <path d="M18 40h60l-5-14H23z" fill={C.shallow} stroke={C.deep} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M33 26l-3 14M48 26v14M63 26l3 14" stroke={C.deep} strokeWidth="2" />
      <path d="M18 40c0 5 7.5 5 7.5 0 0 5 7.5 5 7.5 0 0 5 7.5 5 7.5 0 0 5 7.5 5 7.5 0 0 5 7.5 5 7.5 0 0 5 7.5 5 7.5 0 0 5 7.5 5 7.5 0" fill={C.mid} stroke={C.deep} strokeWidth="2" strokeLinejoin="round" />
      <rect x="29" y="54" width="18" height="20" rx="2" fill={C.surface} stroke={C.deep} strokeWidth="2.2" />
      <rect x="52" y="54" width="14" height="11" rx="2" fill={C.surface} stroke={C.deep} strokeWidth="2.2" />
      <circle cx="43" cy="64" r="1.4" fill={C.deep} />
    </>
  ),
  // Growth and profit: bars rising, with an arrow
  performance: (
    <>
      <rect x="20" y="56" width="12" height="18" rx="2.5" fill={C.surface} stroke={C.deep} strokeWidth="2.2" />
      <rect x="37" y="46" width="12" height="28" rx="2.5" fill={C.shallow} stroke={C.deep} strokeWidth="2.2" />
      <rect x="54" y="34" width="12" height="40" rx="2.5" fill={C.mid} stroke={C.deep} strokeWidth="2.2" />
      <path d="M18 44 38 30l10 7 22-17" fill="none" stroke={C.deep} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M62 20h9v9" fill="none" stroke={C.deep} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 76h68" stroke={C.deep} strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  // Financial health: a life ring, the cushion for bad times
  health: (
    <>
      <circle cx="48" cy="48" r="26" fill={C.white} stroke={C.deep} strokeWidth="2.5" />
      <circle cx="48" cy="48" r="12" fill={C.pale} stroke={C.deep} strokeWidth="2.5" />
      {[0, 90, 180, 270].map((a) => (
        <path key={a} d="M41 23.5a26 26 0 0 1 14 0L52 36.5a12 12 0 0 0-8 0z" fill={C.mid} stroke={C.deep} strokeWidth="2" strokeLinejoin="round" transform={`rotate(${a + 45} 48 48)`} />
      ))}
      <path d="M22 48h-6M80 48h-6" stroke={C.deep} strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
  // Cash: a drop falling onto a stack of coins
  cash: (
    <>
      <path d="M48 14c6 8 9 13 9 17a9 9 0 0 1-18 0c0-4 3-9 9-17z" fill={C.shallow} stroke={C.deep} strokeWidth="2.4" strokeLinejoin="round" />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(0 ${-i * 9})`}>
          <ellipse cx="48" cy="70" rx="20" ry="6" fill={i === 2 ? C.surface : C.mid} stroke={C.deep} strokeWidth="2.2" />
          <path d="M28 70v-5M68 70v-5" stroke={C.deep} strokeWidth="2.2" />
        </g>
      ))}
      <ellipse cx="48" cy="52" rx="20" ry="6" fill={C.surface} stroke={C.deep} strokeWidth="2.2" />
      <path d="M45 52h6" stroke={C.deep} strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  // How it's run: a ship's wheel
  management: (
    <>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <g key={a} transform={`rotate(${a} 48 48)`}>
          <path d="M48 48V14" stroke={C.deep} strokeWidth="3" strokeLinecap="round" />
          <circle cx="48" cy="13" r="4" fill={C.mid} stroke={C.deep} strokeWidth="2" />
        </g>
      ))}
      <circle cx="48" cy="48" r="24" fill="none" stroke={C.deep} strokeWidth="5" />
      <circle cx="48" cy="48" r="24" fill="none" stroke={C.shallow} strokeWidth="2" />
      <circle cx="48" cy="48" r="8" fill={C.surface} stroke={C.deep} strokeWidth="2.5" />
    </>
  ),
  // Industry and risks: a lighthouse watching for what's ahead
  outlook: (
    <>
      <path d="M52 28 88 18v20z" fill={C.surface} opacity="0.9" />
      <path d="M40 76 43 34h10l3 42z" fill={C.white} stroke={C.deep} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M41.6 56h12.8M42.4 45h11.2" stroke={C.mid} strokeWidth="5" />
      <rect x="41" y="24" width="14" height="10" rx="2" fill={C.shallow} stroke={C.deep} strokeWidth="2.4" />
      <path d="M39 24h18l-9-8z" fill={C.deep} />
      <path d="M12 78c6-4 12-4 18 0s12 4 18 0 12-4 18 0 12 4 18 0" fill="none" stroke={C.mid} strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  // The share price: a price tag
  value: (
    <>
      <path d="M50 18h24a4 4 0 0 1 4 4v24L44 80a4 4 0 0 1-5.7 0L16 57.7a4 4 0 0 1 0-5.7z" fill={C.surface} stroke={C.deep} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="64" cy="32" r="5" fill={C.white} stroke={C.deep} strokeWidth="2.4" />
      <path d="M38 48c-3-3 1-7 4-4l8 8c3 3-1 7-4 4M44 42l12 12" fill="none" stroke={C.mid} strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  // The whole picture: ideas joined up
  map: (
    <>
      <path d="M24 28 48 48 72 30M48 48 30 72M48 48l24 22" stroke={C.mid} strokeWidth="2.5" />
      {[[24, 28], [72, 30], [30, 72], [72, 70]].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r="8" fill={C.white} stroke={C.deep} strokeWidth="2.4" />
      ))}
      <circle cx="48" cy="48" r="11" fill={C.shallow} stroke={C.deep} strokeWidth="2.5" />
    </>
  ),
  // What moves the results: a compass
  drivers: (
    <>
      <circle cx="48" cy="48" r="28" fill={C.white} stroke={C.deep} strokeWidth="2.5" />
      <path d="M48 24 56 48 48 72 40 48z" fill={C.surface} stroke={C.deep} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M48 24 56 48H40z" fill={C.mid} stroke={C.deep} strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="48" cy="48" r="3" fill={C.deep} />
      <path d="M48 16v4M48 76v4M16 48h4M76 48h4" stroke={C.deep} strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
};

export function StepArt({ id, size = 96 }: { id: string; size?: number }) {
  const art = ART[id];
  if (!art) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden="true" className="flex-none">
      <circle cx="48" cy="48" r="46" fill={C.pale} />
      {art}
    </svg>
  );
}
