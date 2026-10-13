/** A plain search form. It works without JavaScript: it simply opens /search?q=... */
export function SearchForm({ size = "large", autoFocus = false }: { size?: "large" | "small"; autoFocus?: boolean }) {
  const large = size === "large";
  return (
    <form
      action="/search"
      method="get"
      role="search"
      className={`flex w-full flex-wrap gap-2.5 rounded-2xl border border-[#CFE2EA] bg-white ${
        large ? "max-w-2xl p-2 shadow-[0_12px_32px_rgba(11,79,108,0.10)]" : "max-w-sm p-1"
      }`}
    >
      <label htmlFor={`q-${size}`} className="sr-only">
        Company name or ticker
      </label>
      <div className="flex flex-[1_1_220px] items-center gap-2.5 px-3">
        <svg width={large ? 22 : 18} height={large ? 22 : 18} viewBox="0 0 24 24" fill="none" stroke="#4A6573" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
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
          className={`w-full bg-transparent text-ink outline-none placeholder:text-[#6B8592] ${large ? "py-3.5 text-lg" : "py-2 text-[15px]"}`}
        />
      </div>
      {large && (
        <button type="submit" className="flex-none cursor-pointer rounded-xl bg-ocean px-6 py-3.5 text-[17px] font-semibold text-white hover:bg-ocean-dark">
          Explain it
        </button>
      )}
    </form>
  );
}
