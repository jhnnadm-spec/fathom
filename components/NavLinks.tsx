"use client";

/** The main menu in the header, with the current page marked. */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

const LINKS = [
  { href: "/sectors", label: "Sectors", phone: false },
  { href: "/watchlist", label: "Watchlist", phone: true },
  { href: "/terms", label: "Terms", phone: false },
  { href: "/about", label: "About", phone: false },
];

/** The menu, marking the current page once the address is known (plain links until then). */
export function NavLinks() {
  return (
    <Suspense fallback={<Links path="" />}>
      <Current />
    </Suspense>
  );
}

function Current() {
  return <Links path={usePathname()} />;
}

function Links({ path }: { path: string }) {
  return (
    <nav aria-label="Main" className="flex flex-none gap-1 text-[15px] font-medium">
      {LINKS.map((l) => {
        const on = path === l.href || path.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={on ? "page" : undefined}
            className={`${l.phone ? "inline-flex" : "hidden sm:inline-flex"} min-h-10 items-center rounded-full px-3.5 no-underline transition-colors ${
              on ? "bg-white font-semibold text-ocean shadow-[0_2px_10px_rgba(10,42,58,0.08)]" : "text-ink hover:bg-white/60"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
