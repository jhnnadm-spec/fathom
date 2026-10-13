/**
 * Turning a filing's web page into plain text, split into its official sections.
 *
 * Annual reports (10-K) are organised as "Item 1. Business", "Item 1A. Risk Factors",
 * "Item 7. Management's Discussion and Analysis" and so on. Quarterly reports
 * (10-Q) have the same idea in two parts: Part I (financial information) and
 * Part II (other information).
 *
 * Each item heading appears twice: once in the table of contents and once where
 * the section really starts. We keep the one followed by the most text.
 */
import * as cheerio from "cheerio";
import { secFetchText } from "./client";

export type Section = {
  id: string; // 10-K: "1A"; 10-Q: "I-2" or "II-1A"
  part?: string; // "I", "II" ...
  item: string; // "1A"
  title: string; // e.g. "Risk Factors"
  text: string;
};

const BLOCK_TAGS = "p, div, tr, li, h1, h2, h3, h4, h5, h6, table, section, article, blockquote, pre";

/** Plain text from a filing's HTML, keeping paragraph breaks. */
export function htmlToText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, head, title").remove();
  // Hidden blocks (such as the tagging data at the top of modern filings) aren't part of the report.
  $('[style*="display:none"], [style*="display: none"]').remove();
  $("ix\\:header").remove();

  $("br").replaceWith("\n");
  $("td, th").each((_, el) => {
    $(el).append(" ");
  });
  $(BLOCK_TAGS).each((_, el) => {
    $(el).append("\n");
  });

  const raw = $("body").length ? $("body").text() : $.root().text();
  return raw
    .replace(/ | | /g, " ")
    .split("\n")
    .map((line) => line.replace(/[ \t\r\f\v]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const PART_RE = /^part\s+(iv|i{1,3})\b[.:\s-]*/i;
const ITEM_RE = /^item\s+(\d{1,2}[a-c]?)\s*[.:\-–—]?\s*(.*)$/i;
const MAX_HEADING_CHARS = 200;

type Candidate = { id: string; part?: string; item: string; title: string; line: number };

function cleanTitle(text: string): string {
  return text
    .replace(/\s+\d{1,3}$/, "") // page numbers in the table of contents
    .replace(/[.\s]+$/, "")
    .trim();
}

/** Split a filing's text into its sections. Works for 10-K and 10-Q. */
export function splitSections(text: string, form: string): Section[] {
  const isQuarterly = form.startsWith("10-Q");
  const lines = text.split("\n");
  const candidates: Candidate[] = [];
  let part: string | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.length > MAX_HEADING_CHARS) continue;

    const partMatch = line.match(PART_RE);
    if (partMatch) {
      part = partMatch[1].toUpperCase();
      // "PART II. OTHER INFORMATION Item 1. Legal Proceedings" can share a line.
      const rest = line.slice(partMatch[0].length);
      const itemOnSameLine = rest.match(/item\s+\d/i);
      if (!itemOnSameLine) continue;
    }

    const itemSource = partMatch ? line.slice(line.search(/item\s+\d/i)) : line;
    const m = itemSource.match(ITEM_RE);
    if (!m) continue;

    const item = m[1].toUpperCase();
    let title = cleanTitle(m[2] ?? "");
    if (!title) {
      // Some filings put the title on the next line.
      const next = lines.slice(i + 1, i + 4).find((l) => l.length > 0);
      if (next && next.length <= MAX_HEADING_CHARS && !ITEM_RE.test(next)) title = cleanTitle(next);
    }
    const id = isQuarterly ? `${part ?? "?"}-${item}` : item;
    candidates.push({ id, part, item, title, line: i });
  }

  // How much text follows each candidate before the next heading of any kind.
  const lineStarts: number[] = [];
  let offset = 0;
  for (const l of lines) {
    lineStarts.push(offset);
    offset += l.length + 1;
  }
  const followingChars = (idx: number) => {
    const start = lineStarts[candidates[idx].line];
    const end = idx + 1 < candidates.length ? lineStarts[candidates[idx + 1].line] : text.length;
    return end - start;
  };

  // For each section, keep the heading followed by the most text.
  const best = new Map<string, number>();
  candidates.forEach((c, idx) => {
    const current = best.get(c.id);
    if (current === undefined || followingChars(idx) > followingChars(current)) best.set(c.id, idx);
  });

  const chosen = [...best.values()].sort((a, b) => candidates[a].line - candidates[b].line);
  return chosen.map((idx, n) => {
    const c = candidates[idx];
    const startLine = c.line;
    const endLine = n + 1 < chosen.length ? candidates[chosen[n + 1]].line : lines.length;
    return {
      id: c.id,
      part: c.part,
      item: c.item,
      title: c.title,
      text: lines.slice(startLine, endLine).join("\n").trim(),
    };
  });
}

/** Download a filing's main document and split it into sections. */
export async function loadSections(url: string, form: string): Promise<{ text: string; sections: Section[] }> {
  const text = htmlToText(await secFetchText(url));
  return { text, sections: splitSections(text, form) };
}

export function findSection(sections: Section[], id: string): Section | undefined {
  return sections.find((s) => s.id === id);
}
