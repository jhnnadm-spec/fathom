import { describe, expect, it } from "vitest";
import { parseProfile } from "@/lib/profile/wiki";

const row = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { value: v }]));

describe("company background from Wikidata", () => {
  it("picks the latest employee count and tidies the facts", () => {
    const p = parseProfile([
      row({ item: "http://www.wikidata.org/entity/Q312", ceoLabel: "Tim Cook", inception: "+1976-04-01T00:00:00Z", hqLabel: "Apple Park", founderLabel: "Steve Jobs", employees: "147000", empDate: "2021-09-25T00:00:00Z", website: "https://www.apple.com/", article: "https://en.wikipedia.org/wiki/Apple_Inc." }),
      row({ item: "http://www.wikidata.org/entity/Q312", ceoLabel: "Tim Cook", founderLabel: "Steve Wozniak", employees: "164000", empDate: "2023-09-30T00:00:00Z" }),
    ])!;
    expect(p.ceo).toBe("Tim Cook");
    expect(p.founded).toBe("1976");
    expect(p.founders).toEqual(["Steve Jobs", "Steve Wozniak"]);
    expect(p.employees).toEqual({ count: 164000, asOf: "2023" });
    expect(p.wikidataUrl).toBe("https://www.wikidata.org/entity/Q312");
    expect(p.article).toBe("https://en.wikipedia.org/wiki/Apple_Inc.");
  });

  it("leaves out unclear facts and unlabelled items", () => {
    const p = parseProfile([
      row({ item: "http://www.wikidata.org/entity/Q1", ceoLabel: "A Person" }),
      row({ item: "http://www.wikidata.org/entity/Q1", ceoLabel: "Another Person", hqLabel: "Q123456" }),
    ])!;
    expect(p.ceo).toBeUndefined();
    expect(p.headquarters).toBeUndefined();
    expect(parseProfile([])).toBeUndefined();
  });
});
