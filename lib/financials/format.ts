/** Turning raw numbers into the way people say them. */

/** $416.2 billion, $9.2 billion, $850 million, $12,400 */
export function formatMoney(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1e12) return `${sign}$${trim(abs / 1e12)} trillion`;
  if (abs >= 1e9) return `${sign}$${trim(abs / 1e9)} billion`;
  if (abs >= 1e6) return `${sign}$${trim(abs / 1e6)} million`;
  return `${sign}$${Math.round(abs).toLocaleString("en-US")}`;
}

/** One decimal place, dropping ".0": 416.2, 9, 12.5 */
function trim(n: number): string {
  return (Math.round(n * 10) / 10).toLocaleString("en-US", { maximumFractionDigits: 1 });
}

/** 6.4% (always positive; the sentence says "up" or "down") */
export function formatPercent(fraction: number): string {
  return `${trim(Math.abs(fraction) * 100)}%`;
}

/** "September 27, 2025" */
export function formatDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

/** Fractional change from `previous` to `current`, or undefined when it can't be read sensibly. */
export function percentChange(current: number, previous: number): number | undefined {
  // Growth from a loss (or from zero) isn't meaningful as a percentage.
  if (previous <= 0 || current < 0) return undefined;
  return (current - previous) / previous;
}
