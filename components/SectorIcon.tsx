/** A simple line icon for each sector, on a soft water-coloured circle. Decoration only. */
import type { ReactNode } from "react";

const ICONS: Record<string, ReactNode> = {
  technology: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
      <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
    </>
  ),
  health: <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20zM9 11.5h6M12 8.5v6" />,
  banks: <path d="M3 9.5 12 4l9 5.5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20.5h18" />,
  insurance: <path d="M12 3a9 9 0 0 1 9 8.5H3A9 9 0 0 1 12 3zM12 11.5V18a2 2 0 0 1-4 0" />,
  "real-estate": <path d="M3 11 12 4l9 7M5.5 9.5V20h13V9.5M10 20v-5.5h4V20" />,
  energy: <path d="M12 3c3 4 5.5 6.6 5.5 10.2A5.5 5.5 0 0 1 6.5 13.2C6.5 10.5 8 9 9.5 7c.6 2 1.4 3 2.5 3.5C12.5 8 12.3 5.7 12 3z" />,
  utilities: <path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" />,
  media: (
    <>
      <rect x="3" y="5" width="18" height="12" rx="2" />
      <path d="m10.5 8.5 4 2.5-4 2.5zM8 20h8" />
    </>
  ),
  shops: <path d="M5 8h14l-1.2 12H6.2zM9 8V6.5a3 3 0 0 1 6 0V8" />,
  consumer: <path d="M9.5 3h5M10 3v3.2L8 9.5V20a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V9.5l-2-3.3V3M8 13h8" />,
  industrials: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" />
    </>
  ),
  materials: <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12 4 7.5M12 12v9" />,
  services: (
    <>
      <rect x="3" y="7.5" width="18" height="12" rx="2" />
      <path d="M9 7.5V5.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5.5v2M3 12.5h18" />
    </>
  ),
};

export function SectorIcon({ id, size = 44 }: { id: string; size?: number }) {
  const icon = ICONS[id];
  if (!icon) return null;
  return (
    <span
      aria-hidden="true"
      className="inline-flex flex-none items-center justify-center rounded-full bg-gradient-to-br from-[#e6f3f8] to-surface text-ocean"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.52} height={size * 0.52} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {icon}
      </svg>
    </span>
  );
}
