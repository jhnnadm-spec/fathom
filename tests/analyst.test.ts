import { describe, expect, it } from "vitest";
import { lookupTerm } from "@/lib/glossary";
import { conceptMap } from "@/lib/report/concept-map";
import { STEPS } from "@/lib/report/outline";
import { describeAnnouncement, EVENT_WHY, stepsForEvent } from "@/lib/sec/events";

describe("the analyst's view", () => {
  it("covers every box on the map", () => {
    for (const n of conceptMap()) {
      expect(n.analyst, n.id).toBeTruthy();
      expect(n.reading, n.id).toBeTruthy();
      expect(n.caveat, n.id).toBeTruthy();
    }
  });

  it("covers every research step's term, with things to look for", () => {
    for (const s of STEPS) {
      expect(lookupTerm(s.term)?.analyst, s.id).toBeTruthy();
      expect(s.lookFor.length, s.id).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("announcements by step", () => {
  const codes = Object.keys(EVENT_WHY);
  const steps = new Set(STEPS.map((s) => s.id));

  it("explains every kind of announcement", () => {
    for (const c of codes.filter((x) => x !== "8.01")) expect(describeAnnouncement([c])[0], c).not.toBe("Announced another event"); // 8.01 is SEC's "other events"
  });

  it("only points at real steps, and results reach the numbers steps", () => {
    for (const c of codes) for (const s of stepsForEvent(c)) expect(steps.has(s), `${c} → ${s}`).toBe(true);
    expect(stepsForEvent("2.02")).toEqual(expect.arrayContaining(["performance", "cash"]));
  });
});
