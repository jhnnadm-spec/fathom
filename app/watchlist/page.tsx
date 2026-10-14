import type { Metadata } from "next";
import { PageTitle } from "@/components/PageTitle";
import { WatchlistView } from "@/components/WatchlistView";

export const metadata: Metadata = { title: "Your watchlist" };

export default function WatchlistPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-10 px-5 py-12 sm:py-16 lg:px-8">
      <PageTitle eyebrow="Saved in this browser" title="Your watchlist" note="The companies you're following, and how far you've got with each." />
      <WatchlistView />
    </div>
  );
}
