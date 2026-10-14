import type { Metadata } from "next";
import { WatchlistView } from "@/components/WatchlistView";

export const metadata: Metadata = { title: "Your watchlist" };

export default function WatchlistPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-5 py-10 sm:py-14 lg:px-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-bold tracking-tight">Your watchlist</h1>
        <p className="max-w-3xl text-[16px] leading-relaxed text-muted">
          Companies you&apos;ve saved, with a few headline facts from their reports and how far you&apos;ve got in
          researching each one. Saved in this browser only.
        </p>
      </div>
      <WatchlistView />
    </div>
  );
}
