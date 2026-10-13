import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TOPICS } from "@/lib/explain/types";
import { AREAS, SURFACE, type Item } from "@/lib/report/outline";

// Every sentence id the templates can produce, read from the templates file itself.
const source = readFileSync("lib/financials/templates.ts", "utf8");
const allIds = [...new Set([...source.matchAll(/statement\(\s*"([a-z-]+)"/g)].map((m) => m[1]))];

const idsIn = (items: Item[]) => items.flatMap((i) => (i.kind === "statements" || i.kind === "firstOf" ? i.ids : []));
const topicsIn = (items: Item[]) => items.flatMap((i) => (i.kind === "topic" ? [i.topic, ...(i.fallback ?? [])] : []));

describe("nothing is left out", () => {
  it("found the sentence ids", () => {
    expect(allIds.length).toBeGreaterThan(20);
  });

  it("Deep shows every detailed sentence and every AI topic", () => {
    const deep = AREAS.flatMap((a) => a.deep);
    const detailed = allIds.filter((id) => !id.startsWith("s-"));
    expect(detailed.filter((id) => !idsIn(deep).includes(id))).toEqual([]);
    expect(Object.keys(TOPICS).filter((t) => !topicsIn(deep).includes(t as never))).toEqual([]);
  });

  it("Surface shows every one-minute sentence", () => {
    const surface = SURFACE.flatMap((r) => r.items);
    expect(allIds.filter((id) => id.startsWith("s-") && !idsIn(surface).includes(id))).toEqual([]);
  });

  it("Below covers every area that Deep explains, except the raw tables", () => {
    for (const a of AREAS) if (a.id !== "numbers") expect(a.below.length, a.id).toBeGreaterThan(0);
  });
});
