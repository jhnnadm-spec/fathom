import type { Metadata } from "next";
import Link from "next/link";
// Fonts are bundled with the app (no request to Google at build time).
import "@fontsource/bricolage-grotesque/600.css";
import "@fontsource/bricolage-grotesque/700.css";
import "@fontsource/figtree/400.css";
import "@fontsource/figtree/500.css";
import "@fontsource/figtree/600.css";
import "./globals.css";
import { Logo } from "@/components/Logo";
import { HeaderSearch, NavLinks } from "@/components/NavLinks";
import { SearchForm } from "@/components/SearchForm";

export const metadata: Metadata = {
  title: {
    default: "Fathom: company reports, explained",
    template: "%s · Fathom",
  },
  description:
    "Understand any US public company in plain English, with a source for every claim. For education only, not financial advice.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <header className="border-b border-line">
          <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-3.5 lg:px-8">
            <Link href="/" className="no-underline" aria-label="Fathom home">
              <Logo size={32} />
            </Link>
            <NavLinks />
            <HeaderSearch>
              <div className="order-last w-full sm:order-none sm:w-auto sm:flex-1 sm:max-w-sm lg:ml-auto">
                <SearchForm size="small" />
              </div>
            </HeaderSearch>
          </div>
        </header>

        <main className="flex flex-1 flex-col">{children}</main>

        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-[1180px] flex-col gap-2 px-5 py-8 text-sm leading-relaxed text-muted sm:flex-row sm:items-center sm:justify-between lg:px-8">
            <p>For learning only. Fathom never tells you to buy or sell anything.</p>
            <Link href="/about" className="font-semibold">
              About Fathom
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
