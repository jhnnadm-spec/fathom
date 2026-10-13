import Link from "next/link";

export default function CompanyNotFound() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-start gap-4 px-6 py-16">
      <h1 className="font-display text-3xl font-bold">We couldn&apos;t find that company</h1>
      <p className="text-[17px] leading-relaxed text-muted">
        Fathom covers companies listed in the US that file reports with the SEC. Try searching by name or ticker.
      </p>
      <Link href="/" className="font-semibold">
        Back to search
      </Link>
    </div>
  );
}
