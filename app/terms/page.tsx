import type { Metadata } from "next";
import { Suspense } from "react";
import { TermsBrowser } from "@/components/TermsBrowser";

export const metadata: Metadata = { title: "Finance terms, explained" };

export default function TermsPage(props: PageProps<"/terms">) {
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-5 py-10 sm:py-14 lg:px-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-bold tracking-tight">Finance terms, explained</h1>
        <p className="max-w-3xl text-[16px] leading-relaxed text-muted">
          Every term Fathom uses, in plain words: what it means, why analysts check it, and the devil&apos;s advocate view.
          For the key ratios, you&apos;ll also see how a high or a low figure can each be a good or a bad sign.
        </p>
      </div>
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
