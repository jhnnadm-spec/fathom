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
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
            <Link href="/" className="no-underline" aria-label="Fathom home">
              <Logo />
            </Link>
            <nav className="flex gap-2 text-[15px] font-medium">
              <Link href="/about" className="px-3 py-3 no-underline">
                About
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex flex-1 flex-col">{children}</main>

        <footer className="border-t border-line">
          <p className="mx-auto max-w-6xl px-6 py-8 text-sm leading-relaxed text-muted">
            Fathom explains information from public sources for education only.
            It is not financial advice and does not recommend buying, selling or
            holding any investment.
          </p>
        </footer>
      </body>
    </html>
  );
}
