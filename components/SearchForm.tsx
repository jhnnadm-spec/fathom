/** A plain search form. It works without JavaScript: it simply opens /search?q=... */
export function SearchForm({ size = "large", autoFocus = false }: { size?: "large" | "small"; autoFocus?: boolean }) {
  const large = size === "large";
  return (
    <form
      action="/search"
      method="get"
      role="search"
      className={`flex w-full flex-wrap gap-2 rounded-2xl border focus-within:border-mid ${
        large ? "max-w-2xl border-[#c9d6dd] bg-white p-2" : "min-w-0 border-line bg-panel-2 p-0.5"
      }`}
    >
      <label htmlFor={`q-${size}`} className="sr-only">
        Company name, ticker or finance term
      </label>
      <div className={`flex items-center gap-2.5 px-3 ${large ? "flex-[1_1_220px]" : "min-w-0 flex-1"}`}>
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
          placeholder={large ? "Try Apple or Nike" : "Search a company"}
          className={`w-full bg-transparent text-ink outline-none placeholder:text-[#6B8592] ${large ? "py-3.5 text-lg" : "py-2 text-[15px]"}`}
        />
      </div>
      {large && (
        <button type="submit" className="flex-none cursor-pointer rounded-xl bg-ocean px-6 py-3.5 text-[17px] font-semibold text-abyss hover:bg-ocean-dark">
          Search
        </button>
      )}
    </form>
  );
}
