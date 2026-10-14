"use client";

/**
 * A company's logo on a white tile. It tries, in order: the logo from Wikimedia
 * Commons, the icon from the company's own website, and finally the company's
 * initials, so there's always something tidy to show.
 */
import { useState } from "react";

export function CompanyLogo({
  name,
  logo,
  website,
  size = 72,
}: {
  name: string;
  logo?: string;
  website?: string;
  size?: number;
}) {
  const sources = [logo, website && favicon(website)].filter((s): s is string => Boolean(s));
  const [failed, setFailed] = useState(0);
  const src = sources[failed];
  const radius = Math.round(size * 0.28);

  return (
    <span
      className="relative inline-flex flex-none items-center justify-center overflow-hidden border border-line bg-white shadow-[0_6px_20px_rgba(10,42,58,0.08)]"
      style={{ width: size, height: size, borderRadius: radius }}
    >
      {src ? (
        // A plain <img>: the logo comes from another site and is tiny, so there's nothing to optimise.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt={`${name} logo`}
          className="h-full w-full object-contain"
          style={{ padding: Math.round(size * 0.14) }}
          referrerPolicy="no-referrer"
          onError={() => setFailed((f) => f + 1)}
        />
      ) : (
        <Initials name={name} size={size} />
      )}
    </span>
  );
}

/** The site's own icon, via Google's public favicon service. */
function favicon(website: string): string | undefined {
  try {
    const host = new URL(website).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
  } catch {
    return undefined;
  }
}

/** "Coca Cola Co" → "CC", on a calm ocean gradient. */
function Initials({ name, size }: { name: string; size: number }) {
  const words = name
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !/^(inc|corp|co|company|ltd|plc|the|holdings?|group)$/i.test(w));
  const letters = (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2)).toUpperCase();
  return (
    <span
      aria-label={`${name} (no logo available)`}
      role="img"
      className="flex h-full w-full items-center justify-center bg-gradient-to-br from-shallow to-ocean font-display font-bold text-white"
      style={{ fontSize: Math.round(size * 0.36) }}
    >
      {letters}
    </span>
  );
}
