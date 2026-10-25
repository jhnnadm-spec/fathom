import type { Metadata } from "next";
import { Suspense } from "react";
import { PageTitle } from "@/components/PageTitle";
import { TermsBrowser } from "@/components/TermsBrowser";

export const metadata: Metadata = { title: "Dictionary" };

export default function TermsPage(props: PageProps<"/terms">) {
  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-10 px-5 py-12 sm:py-16 lg:px-8">
      <PageTitle
        title="Money words, in plain English"
        note="What each term means, why analysts check it, and when a high or low number is good or bad."
      />
      {/* The full list shows at once; a search from elsewhere (?q=pe ratio) narrows it as soon as it's read. */}
      <Suspense fallback={<TermsBrowser />}>
        <WithQuery searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function WithQuery({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
  return <TermsBrowser key={q} initialQuery={q} />;
}
