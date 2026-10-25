import type { Metadata } from "next";
import { PageTitle } from "@/components/PageTitle";
import { WatchlistView } from "@/components/WatchlistView";

export const metadata: Metadata = { title: "Saved companies" };

export default function WatchlistPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-10 px-5 py-12 sm:py-16 lg:px-8">
      <PageTitle title="Saved companies" note="The companies you're following. They're kept in this browser only, no sign-up needed." />
      <WatchlistView />
    </div>
  );
}
