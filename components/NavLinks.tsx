"use client";

/** The main menu in the header, with the current page marked. */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

const LINKS = [
  { href: "/sectors", label: "Browse" },
  { href: "/compare", label: "Compare" },
  { href: "/watchlist", label: "Saved" },
  { href: "/terms", label: "Dictionary" },
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
    <nav aria-label="Main" className="flex flex-none items-center gap-1 text-[15px] font-semibold">
      {LINKS.map((l) => {
        const on = path === l.href || path.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={on ? "page" : undefined}
            className={`inline-flex min-h-10 items-center rounded-lg px-3 no-underline transition-colors ${
              on ? "bg-panel-2 text-ocean" : "text-ink hover:bg-panel-2"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** The header's small search box, hidden on the front page, which already has a big one. */
export function HeaderSearch({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <HideOnHome>{children}</HideOnHome>
    </Suspense>
  );
}

function HideOnHome({ children }: { children: React.ReactNode }) {
  return usePathname() === "/" ? null : <>{children}</>;
}
