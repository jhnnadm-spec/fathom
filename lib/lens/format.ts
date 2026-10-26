/** Writing lens figures the way people read them. */
import { formatDate, formatMoney, formatPercent, formatPerShare } from "../financials/format";
import type { Figure, Period } from "./types";

/** $47.9 billion, 27.3%, 1.16, $2.86, by the figure's unit. */
export function figureValue(f: Figure): string {
  if (f.status !== "reported") return f.status === "needs-price" ? "Needs a share price" : "Not reported";
  switch (f.unit) {
    case "per-share":
      return formatPerShare(f.value);
    case "ratio":
      return f.value.toFixed(2);
    case "percent":
      return `${f.value < 0 ? "−" : ""}${formatPercent(f.value)}`;
    default:
      return formatMoney(f.value);
  }
}

/** "Year to December 31, 2025" or "On December 31, 2025". */
export function periodText(p: Period): string {
  return p.kind === "year" ? `Year to ${formatDate(p.end)}` : `On ${formatDate(p.end)}`;
}

/** "December 31" from "1231". */
export function yearEndText(mmdd?: string): string | undefined {
  if (!mmdd || mmdd.length !== 4) return undefined;
  const d = new Date(Date.UTC(2001, Number(mmdd.slice(0, 2)) - 1, Number(mmdd.slice(2))));
  return Number.isNaN(d.getTime()) ? undefined : d.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
}
