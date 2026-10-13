/**
 * Collect the report sections the AI is allowed to read: the latest annual
 * report's Business, Risk Factors and Management's Discussion, plus the latest
 * quarterly report's Management's Discussion and risk factor updates.
 *
 * Very long sections are cut to a limit so the request fits the AI model and the
 * free daily allowance. The cut always happens at a paragraph break.
 */
import { latestFiling, loadFilings, type Filing } from "../sec/filings";
import { findSection, loadSections } from "../sec/sections";
import type { SourceSection } from "./types";

const PLAN: { form: "10-K" | "10-Q"; id: string; label: string; maxChars: number }[] = [
  { form: "10-K", id: "1", label: "10-K Item 1", maxChars: 26_000 },
  { form: "10-K", id: "1A", label: "10-K Item 1A", maxChars: 36_000 },
  { form: "10-K", id: "7", label: "10-K Item 7", maxChars: 26_000 },
  { form: "10-Q", id: "I-2", label: "10-Q Part I Item 2", maxChars: 14_000 },
  { form: "10-Q", id: "II-1A", label: "10-Q Part II Item 1A", maxChars: 10_000 },
];

export function trimAtParagraph(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const cut = text.lastIndexOf("\n", maxChars);
  return text.slice(0, cut > maxChars * 0.6 ? cut : maxChars).trim();
}

export async function gatherSections(cik: string): Promise<{ name: string; sections: SourceSection[] }> {
  const filings = await loadFilings(cik);
  const reports: Partial<Record<"10-K" | "10-Q", Filing>> = {
    "10-K": latestFiling(filings, "10-K"),
    "10-Q": latestFiling(filings, "10-Q"),
  };
  // A quarterly report older than the annual report is out of date, so it is skipped.
  if (reports["10-Q"] && reports["10-K"] && reports["10-Q"].filingDate < reports["10-K"].filingDate) {
    delete reports["10-Q"];
  }

  const loaded: Partial<Record<"10-K" | "10-Q", Awaited<ReturnType<typeof loadSections>>>> = {};
  for (const form of ["10-K", "10-Q"] as const) {
    const f = reports[form];
    if (f) loaded[form] = await loadSections(f.url, f.form);
  }

  const sections: SourceSection[] = [];
  for (const p of PLAN) {
    const filing = reports[p.form];
    const section = loaded[p.form] && findSection(loaded[p.form]!.sections, p.id);
    if (!filing || !section || section.text.length < 200) continue;
    sections.push({
      id: p.label,
      title: section.title,
      form: p.form,
      filingDate: filing.filingDate,
      url: filing.url,
      text: trimAtParagraph(section.text, p.maxChars),
    });
  }
  return { name: filings.name, sections };
}
