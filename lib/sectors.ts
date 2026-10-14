/**
 * Plain-English sectors, grouped from the industry code (SIC) each company
 * gives the SEC. Used by "Browse by sector".
 */
export type SectorId =
  | "technology"
  | "health"
  | "banks"
  | "insurance"
  | "real-estate"
  | "energy"
  | "utilities"
  | "media"
  | "shops"
  | "consumer"
  | "industrials"
  | "materials"
  | "services";

export const SECTORS: Record<SectorId, { name: string; blurb: string }> = {
  technology: { name: "Technology", blurb: "Computers, phones, chips, software and the internet." },
  health: { name: "Health care", blurb: "Medicines, medical devices, hospitals, health insurance plans and drug distributors." },
  banks: { name: "Banks and finance", blurb: "Banks, lenders, payment companies and investment firms." },
  insurance: { name: "Insurance", blurb: "Companies that protect people and businesses against losses, for a fee." },
  "real-estate": { name: "Property", blurb: "Companies that own, rent out or develop buildings and land." },
  energy: { name: "Oil, gas and energy", blurb: "Finding, producing and refining oil and gas." },
  utilities: { name: "Electricity, water and gas supply", blurb: "Companies that deliver power, water and gas to homes and businesses." },
  media: { name: "Telecom, media and entertainment", blurb: "Phone and internet networks, TV, film, music, publishing, theme parks and leisure." },
  shops: { name: "Shops and restaurants", blurb: "Stores, online retailers and restaurant chains." },
  consumer: { name: "Everyday brands", blurb: "Food, drinks, clothing, shoes, household products, cars and toys." },
  industrials: { name: "Industry and transport", blurb: "Machines, aircraft, construction, airlines, railways and shipping." },
  materials: { name: "Materials and mining", blurb: "Chemicals, metals, mining, paper and packaging." },
  services: { name: "Business services", blurb: "Companies that sell services to other businesses, and wholesale trade." },
};

/** Which plain sector an SEC industry code (SIC) belongs to. Undefined for shell companies. */
export function sectorOf(sic: number): SectorId | undefined {
  const inR = (a: number, b: number) => sic >= a && sic <= b;
  if (sic === 6770 || sic === 9995) return undefined; // blank-cheque shells with no business yet
  if (inR(7370, 7379) || inR(3570, 3579) || inR(3660, 3679) || inR(3820, 3829)) return "technology";
  if (inR(2830, 2836) || inR(3840, 3851) || inR(8000, 8099) || sic === 8731 || sic === 6324 || sic === 5122) return "health"; // 6324: health plans, 5122: drug wholesalers
  if (sic === 6798 || inR(6500, 6553)) return "real-estate";
  if (inR(6300, 6411)) return "insurance";
  if (inR(6000, 6299) || inR(6700, 6799)) return "banks";
  if (inR(1300, 1399) || inR(2900, 2999) || sic === 4922) return "energy"; // 4922: gas pipelines
  if (inR(4900, 4999)) return "utilities";
  if (inR(4800, 4899) || inR(2710, 2741) || inR(7800, 7999)) return "media"; // 7800–7999: film, TV, amusement and recreation
  if (inR(5200, 5999)) return "shops";
  if (inR(2000, 2399) || inR(2840, 2844) || inR(3020, 3021) || inR(3140, 3149) || inR(3630, 3639) || inR(3710, 3716) || inR(3940, 3949) || inR(3910, 3915)) return "consumer";
  if (inR(1000, 1499) || inR(2400, 2799) || inR(2800, 2829) || inR(2850, 2899) || inR(3200, 3399)) return "materials";
  if (inR(1500, 1799) || inR(3400, 3569) || inR(3580, 3659) || inR(3680, 3819) || inR(3830, 3839) || inR(3852, 3999) || inR(4000, 4799) || inR(8700, 8748)) return "industrials";
  if (inR(5000, 5199) || inR(7000, 7369) || inR(7380, 7999) || inR(8100, 8999) || inR(100, 999)) return "services";
  return undefined;
}

/** One company in the sector list (short keys keep the file small). */
export type SectorRow = {
  t: string; // ticker
  n: string; // name
  s: number; // SIC code
  d: string; // SEC industry description
  r?: number; // latest yearly sales (USD), from SEC data, for ordering by size
};
