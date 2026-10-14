/** The heading every listing page shares: a small label, a big title and one line under it. */
export function PageTitle({ eyebrow, title, note }: { eyebrow: string; title: string; note?: string }) {
  return (
    <div className="flex max-w-3xl flex-col gap-3">
      <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-mid">{eyebrow}</p>
      <h1 className="font-display text-[38px] font-bold leading-[1.05] tracking-tight sm:text-[48px]">{title}</h1>
      {note && <p className="text-[18px] leading-relaxed text-muted">{note}</p>}
    </div>
  );
}
