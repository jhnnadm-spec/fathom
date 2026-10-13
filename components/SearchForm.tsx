/** A plain search form. It works without JavaScript: it simply opens /search?q=... */
export function SearchForm({ size = "large", autoFocus = false }: { size?: "large" | "small"; autoFocus?: boolean }) {
  const large = size === "large";
  return (
    <form
      action="/search"
      method="get"
      role="search"
      className={`flex w-full flex-wrap gap-2.5 rounded-2xl border border-line bg-panel ${
        large ? "max-w-2xl p-2 shadow-[0_0_0_1px_rgba(79,227,208,0.08),0_16px_40px_rgba(0,0,0,0.35)]" : "min-w-0 flex-1 p-1 sm:w-72 sm:flex-none"
      }`}
    >
      <label htmlFor={`q-${size}`} className="sr-only">
        Company name or ticker
      </label>
      <div className={`flex items-center gap-2.5 px-3 ${large ? "flex-[1_1_220px]" : "min-w-0 flex-1"}`}>
        <svg width={large ? 22 : 18} height={large ? 22 : 18} viewBox="0 0 24 24" fill="none" stroke="#9DB4C2" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" />
        </svg>
        <input
          id={`q-${size}`}
          name="q"
          type="search"
          required
          autoFocus={autoFocus}
          autoComplete="off"
          placeholder={large ? "Try Apple, Nike or MSFT" : "Search a company"}
          className={`w-full bg-transparent text-ink outline-none placeholder:text-[#7f98a8] ${large ? "py-3.5 text-lg" : "py-2 text-[15px]"}`}
        />
      </div>
      {large && (
        <button type="submit" className="flex-none cursor-pointer rounded-xl bg-ocean px-6 py-3.5 text-[17px] font-semibold text-abyss hover:bg-ocean-dark">
          Explain it
        </button>
      )}
    </form>
  );
}
