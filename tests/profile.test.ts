import { describe, expect, it } from "vitest";
import { logoUrl, parseProfile, photoCandidates, pickPhotos } from "@/lib/profile/wiki";

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

describe("website choice", () => {
  it("prefers the main .com site over country sites", () => {
    const p = parseProfile([
      row({ item: "http://www.wikidata.org/entity/Q312", website: "https://apple.com.cn/" }),
      row({ item: "http://www.wikidata.org/entity/Q312", website: "https://www.apple.com/" }),
    ])!;
    expect(p.website).toBe("https://www.apple.com/");
  });
});

describe("logo and photos from Wikimedia", () => {
  it("turns the Wikidata logo into a sized Commons address", () => {
    const p = parseProfile([row({ item: "http://www.wikidata.org/entity/Q3295867", logo: "http://commons.wikimedia.org/wiki/Special:FilePath/Coca-Cola%20logo.svg" })])!;
    expect(p.logo).toBe("https://commons.wikimedia.org/wiki/Special:FilePath/Coca-Cola%20logo.svg?width=256");
    expect(logoUrl("not a file")).toBeUndefined();
  });

  it("keeps likely photos and drops logos, maps and charts", () => {
    expect(
      photoCandidates(["Coca-Cola_logo.svg", "Coca-Cola_HQ_Atlanta.jpg", "World_map_coke.jpg", "Coke_stock_price_chart.JPG", "Photograph_of_bottles.jpeg", "Edit-clear.svg"]),
    ).toEqual(["Coca-Cola_HQ_Atlanta.jpg", "Photograph_of_bottles.jpeg"]);
  });

  it("shows only freely licensed photos of a usable size, with credit, in article order", () => {
    const info = (title: string, extra: object) => ({
      title,
      imagerepository: "shared",
      imageinfo: [
        {
          width: 4000,
          height: 3000,
          mime: "image/jpeg",
          thumburl: `https://upload.wikimedia.org/thumb/${title}`,
          thumbwidth: 960,
          thumbheight: 720,
          descriptionurl: `https://commons.wikimedia.org/wiki/${title.replace(/ /g, "_")}`,
          extmetadata: {
            Artist: { value: '<a href="//commons.wikimedia.org/wiki/User:Jane">Jane Doe</a>' },
            LicenseShortName: { value: "CC BY-SA 4.0" },
            ImageDescription: { value: "<p>The headquarters in Atlanta, Georgia. Taken in 2019.</p>" },
          },
        },
      ],
      ...extra,
    });
    const photos = pickPhotos(
      ["B.jpg", "Fair_use.jpg", "Tiny.jpg", "A.jpg"],
      [
        info("File:A.jpg", {}),
        info("File:Fair use.jpg", { imagerepository: "local" }),
        info("File:Tiny.jpg", { imageinfo: [{ width: 300, height: 200, mime: "image/jpeg", descriptionurl: "x" }] }),
        info("File:B.jpg", {}),
      ],
    );
    expect(photos.map((p) => p.page)).toEqual(["https://commons.wikimedia.org/wiki/File:B.jpg", "https://commons.wikimedia.org/wiki/File:A.jpg"]);
    expect(photos[0]).toMatchObject({ credit: "Jane Doe", license: "CC BY-SA 4.0", caption: "The headquarters in Atlanta, Georgia", width: 960 });
  });
});
