/**
 * A safety check: does a number we calculated from SEC's tagged data actually
 * appear in the filing's own text? Filings usually print amounts in millions
 * (416,161) or thousands, so we look for those forms.
 */
import type { Figure } from "./metrics";

export function figureAppearsInText(figure: Figure, text: string): boolean {
  const abs = Math.abs(figure.value);
  const forms = new Set<string>();
  for (const divisor of [1e6, 1e3, 1]) {
    const scaled = abs / divisor;
    if (Number.isInteger(scaled) && scaled >= 1) forms.add(scaled.toLocaleString("en-US"));
  }
  // Some filings print one decimal in millions, e.g. 1,234.5
  const oneDecimal = abs / 1e5;
  if (Number.isInteger(oneDecimal)) forms.add((abs / 1e6).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
  // Per-share amounts are printed with cents, e.g. 7.46
  if (!Number.isInteger(abs)) forms.add(abs.toFixed(2));
  return [...forms].some((f) => new RegExp(`(^|[^\\d,.])${f.replace(/[.,]/g, "\\$&")}($|[^\\d,])`).test(text));
}
