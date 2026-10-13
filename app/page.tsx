import { LogoMark } from "@/components/Logo";

/**
 * Home page. For now this is a placeholder so we can check that
 * publishing works. The search bar arrives in a later step.
 */
export default function Home() {
  return (
    <section className="bg-gradient-to-b from-white to-[#EAF5F9] px-6 py-24">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
        <LogoMark size={88} />
        <p className="text-sm font-semibold uppercase tracking-wider text-mid">
          Company reports, explained
        </p>
        <h1 className="font-display text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
          Understand any US company, in plain English.
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-muted">
          Fathom gathers public information about a company, explains it at the
          depth you choose, and shows the source for every point.
        </p>
        <p className="rounded-full border border-line bg-white px-5 py-2.5 text-[15px] font-medium text-ocean">
          Being built. Search is coming soon.
        </p>
      </div>
    </section>
  );
}
