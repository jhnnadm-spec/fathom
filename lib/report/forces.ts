/**
 * "Key drivers": the forces that act on a business, grouped the way
 * an analyst thinks about them, each with a simple chain from cause to
 * consequence.
 *
 *  - The company itself (fundamentals): from its own SEC figures.
 *  - The economy (macroeconomic factors): official US data, plus what the company says.
 *  - Market mood (sentiment): how investors feel, which moves the price.
 *  - Outside forces: competition, rules, technology, supplies, world events, nature,
 *    from the risks the company itself describes.
 *
 * The chains describe how such a force usually works (general economics), and are
 * labelled that way. Anything about this particular company comes from its own
 * figures or its own words, with a source.
 */
import type { CheckedClaim, SavedExplanation, TopicId } from "../explain/types";
import { formatDate, formatMoney, formatPercent, formatShare } from "../financials/format";
import type { CompanyNumbers } from "../financials/metrics";
import type { Indicator } from "../macro/data";

export type ForceGroup = "company" | "economy" | "sentiment" | "outside";

export type Force = {
  id: string;
  group: ForceGroup;
  plain: string; // everyday name
  term: string; // the real finance term, shown as the heading
  glossary?: string; // glossary key, when the term has a full explanation
  now?: { text: string; source?: { name: string; url: string } }; // the latest reading
  chain: [string, string, string]; // cause → how it reaches the company → what it changes
  affects: string[]; // concept-map ids for the consequence
  company?: string; // a fact about this company's exposure, from its own figures
  ownWords: CheckedClaim[]; // what the company says about it, from its reports
};

export const FORCE_GROUPS: Record<ForceGroup, { title: string; term: string; intro: string }> = {
  company: {
    title: "The company itself",
    term: "Fundamentals",
    intro: "Things inside the business: how fast it grows, how much of each sale it keeps, what it owes and the cash it makes.",
  },
  economy: {
    title: "The economy",
    term: "Macroeconomic factors",
    intro: "Interest rates, rising prices and jobs affect almost every company, through its costs, its customers or its borrowing.",
  },
  sentiment: {
    title: "How investors feel",
    term: "Market sentiment",
    intro: "How investors feel about the company and the market. It moves the share price, sometimes even when the business hasn't changed.",
  },
  outside: {
    title: "Forces outside its control",
    term: "External factors",
    intro: "Competitors, governments, technology, suppliers, world events and nature: forces the company can't control but must deal with.",
  },
};

// ---------------------------------------------------------------- sorting the company's own words

const TOPICS_TO_SCAN: TopicId[] = ["biggestRisks", "newRisks", "industryTrends", "demandDrivers", "outlook", "upcoming", "marketPosition", "competitiveEdge"];

/** Which force a sentence from the reports is about. First match wins, so each sentence appears once. */
const KEYWORDS: [string, RegExp][] = [
  ["sentiment", /\b(stock|share) price|volatil|investor sentiment|market price of (our|the) (common )?stock/],
  ["rates", /interest rate|borrowing cost|credit market|cost of (borrowing|capital)|access (to )?financing|financing at reasonable/],
  ["inflation", /inflation|commodit|raw material|input cost|cost of (ingredients|materials)|energy cost/],
  ["demand", /recession|economic (condition|downturn|slowdown|uncertaint|weakness)|consumer (spending|confidence|demand)|discretionary|unemployment|macroeconomic/],
  ["competition", /competit|rival|market share/],
  ["rules", /regulat|\blaws?\b|legislat|government|tariff|\btax|legal|litigation|antitrust|compliance/],
  ["tech", /technolog|cyber|data breach|security breach|artificial intelligence|\bai\b|digital|software|information system/],
  ["nature", /climate|weather|natural disaster|pandemic|epidemic|water scarcity|environment/],
  ["supply", /supply|supplier|manufactur|shortage|logistic|bottl|distribution|single or limited source/],
  ["world", /geopolit|\bwar\b|international|foreign|currenc|exchange rate|\btrade\b|china|global/],
];

export function classifyClaims(e?: SavedExplanation): Record<string, CheckedClaim[]> {
  const out: Record<string, CheckedClaim[]> = {};
  if (!e) return out;
  const seen = new Set<string>();
  for (const t of TOPICS_TO_SCAN) {
    for (const c of e.topics[t] ?? []) {
      if (seen.has(c.text)) continue;
      const hay = `${c.text} ${c.quote}`.toLowerCase();
      const hit = KEYWORDS.find(([, re]) => re.test(hay));
      if (!hit) continue;
      if (t === "competitiveEdge" && hit[0] !== "competition") continue; // an edge only counts as being about competitors
      seen.add(c.text);
      (out[hit[0]] ??= []).push(c);
    }
  }
  return out;
}

// ---------------------------------------------------------------- building the forces

const pct = (v: number) => `${(Math.round(v * 100) / 100).toFixed(2)}%`;
const monthYear = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

function trend(now: number, ago: number | undefined, unit = "points"): string {
  if (ago === undefined) return "";
  const d = Math.round((now - ago) * 100) / 100;
  if (Math.abs(d) < 0.1) return ", about the same as a year earlier";
  return `, ${d > 0 ? "up" : "down"} from ${ago.toFixed(unit === "points" ? 2 : 1)}% a year earlier`;
}

export function buildForces(name: string, n: CompanyNumbers | undefined, e: SavedExplanation | undefined, macro: Indicator[]): Force[] {
  const words = classifyClaims(e);
  const forces: Force[] = [];
  const a = n?.annual;
  const b = n?.balance;
  const r = n?.ratios;

  // ---- The company itself
  if (a?.revenue) {
    const q = n?.quarter.revenue;
    forces.push({
      id: "growth",
      group: "company",
      plain: "How fast sales are growing",
      term: "Revenue growth",
      glossary: "revenue",
      now: {
        text: `Sales ${a.revenue.change !== undefined ? `${a.revenue.change >= 0 ? "rose" : "fell"} ${formatPercent(a.revenue.change)}` : "were " + formatMoney(a.revenue.latest.value)} in the year ended ${formatDate(a.revenue.latest.end)}${
          q?.change !== undefined ? `; the latest quarter was ${q.change >= 0 ? "up" : "down"} ${formatPercent(q.change)} on a year earlier` : ""
        }.`,
      },
      chain: ["More customers, or higher prices", "Sales grow", "More room for profit and cash, if costs don't rise as fast"],
      affects: ["revenue", "profit"],
      ownWords: [],
    });
  }
  if (n?.margins.net !== undefined) {
    forces.push({
      id: "margins",
      group: "company",
      plain: "How much of each sale it keeps",
      term: "Profit margins",
      glossary: "profit-margin",
      now: { text: `About $${Math.round(n.margins.net * 100)} of every $100 of sales was left as profit (${formatShare(n.margins.net)} net profit margin)${n.margins.periodEnd ? ` in the year ended ${formatDate(n.margins.periodEnd)}` : ""}.` },
      chain: ["Costs rise or fall compared with prices", "Each sale keeps more or less", "Profit grows or shrinks even if sales don't change"],
      affects: ["margin", "profit"],
      ownWords: [],
    });
  }
  if (b?.longTermDebt) {
    const cash = b.cash?.latest;
    forces.push({
      id: "debt",
      group: "company",
      plain: "How much it has borrowed",
      term: "Leverage (debt)",
      glossary: "long-term-debt",
      now: {
        text: `It owed ${formatMoney(b.longTermDebt.latest.value)} in long-term debt${cash && cash.end === b.longTermDebt.latest.end ? ` and held ${formatMoney(cash.value)} in cash` : ""} on ${formatDate(b.longTermDebt.latest.end)}${
          r?.debtToEquity ? `, about $${r.debtToEquity.value.toFixed(2)} borrowed for every $1 of owners' money` : ""
        }.`,
      },
      chain: ["More borrowing", "More interest to pay every year", "Less profit left over, and less room for a bad year"],
      affects: ["debt", "dte", "profit"],
      ownWords: [],
    });
  }
  if (r?.freeCashFlow) {
    forces.push({
      id: "cashgen",
      group: "company",
      plain: "How much spare cash it makes",
      term: "Free cash flow",
      glossary: "free-cash-flow",
      now: { text: `${formatMoney(r.freeCashFlow.value)} of spare cash in the year ended ${formatDate(r.freeCashFlow.end)}.` },
      chain: ["The business brings in more cash than it spends on equipment", "Spare cash builds up", "Money to pay owners, cut debt or grow, without borrowing"],
      affects: ["fcf", "dividends", "buybacks"],
      ownWords: [],
    });
  }
  if (e?.topics.competitiveEdge.length) {
    forces.push({
      id: "edge",
      group: "company",
      plain: "What it says sets it apart",
      term: "Competitive advantage",
      chain: ["Something rivals find hard to copy", "Customers stay, or pay a bit more", "Steadier sales and higher margins over time"],
      affects: ["revenue", "margin"],
      ownWords: e.topics.competitiveEdge.slice(0, 2),
    });
  }

  // ---- The economy
  const ind = (id: Indicator["id"]) => macro.find((m) => m.id === id);
  const short = ind("short-rate");
  const long = ind("long-rate");
  const debtLine = b?.longTermDebt
    ? `${name} owed ${formatMoney(b.longTermDebt.latest.value)} in long-term debt on ${formatDate(b.longTermDebt.latest.end)}. Companies that borrow a lot feel rate changes more.`
    : undefined;
  forces.push({
    id: "rates",
    group: "economy",
    plain: "What it costs to borrow money",
    term: "Interest rates",
    glossary: "interest-rates",
    now:
      short || long
        ? {
            text: [
              short && `Short-term US rates (3-month Treasury bill): ${pct(short.value)}${trend(short.value, short.yearAgo)}.`,
              long && `Long-term (10-year Treasury note): ${pct(long.value)}${trend(long.value, long.yearAgo)}.`,
              `As of ${formatDate((short ?? long)!.date)}.`,
            ]
              .filter(Boolean)
              .join(" "),
            source: (short ?? long)!.source,
          }
        : undefined,
    chain: ["Rates go up", "Borrowing costs more, for the company and its customers", "Less profit after interest, slower sales of things bought on credit, and share prices often fall"],
    affects: ["debt", "costs", "price"],
    company: debtLine,
    ownWords: words.rates ?? [],
  });
  const infl = ind("inflation");
  forces.push({
    id: "inflation",
    group: "economy",
    plain: "Prices rising across the economy",
    term: "Inflation",
    glossary: "inflation",
    now: infl ? { text: `US consumer prices were ${infl.value}% higher than a year earlier in ${monthYear(infl.date)}${infl.yearAgo !== undefined ? ` (a year before that: ${infl.yearAgo}%)` : ""}.`, source: infl.source } : undefined,
    chain: ["Materials, wages and transport cost more", "The company's costs rise; it may raise its own prices", "Profit per sale shrinks if it can't pass the costs on"],
    affects: ["costs", "margin"],
    company:
      n?.margins.gross !== undefined && n.marginHistory.length >= 3
        ? `Its gross margin (what's left after the cost of what it sells) was ${formatShare(n.marginHistory[0].gross ?? n.margins.gross)} ${n.marginHistory[0].gross !== undefined ? `in the year ended ${formatDate(n.marginHistory[0].end)} and ` : ""}${formatShare(n.margins.gross)} in its latest year. Comparing the two shows whether its prices have kept up with its costs.`
        : undefined,
    ownWords: words.inflation ?? [],
  });
  const jobs = ind("unemployment");
  forces.push({
    id: "demand",
    group: "economy",
    plain: "Jobs and spending",
    term: "Consumer demand",
    glossary: "consumer-demand",
    now: jobs ? { text: `${jobs.value}% of people in the US workforce were out of work and looking for a job in ${monthYear(jobs.date)}${jobs.yearAgo !== undefined ? ` (a year earlier: ${jobs.yearAgo}%)` : ""}.`, source: jobs.source } : undefined,
    chain: ["Fewer people in work, or more worried about money", "Households and businesses spend less", "Sales fall, usually first for things people can put off"],
    affects: ["revenue"],
    ownWords: words.demand ?? [],
  });

  // ---- Market mood
  forces.push({
    id: "sentiment",
    group: "sentiment",
    plain: "How investors feel",
    term: "Market sentiment",
    glossary: "market-sentiment",
    now: { text: "See the live share price and valuation in step 7, and the latest headlines further down this page." },
    chain: ["News, results or fear and excitement", "More people want to buy, or sell, the shares", "The share price and P/E ratio move, sometimes far more than the business itself changed"],
    affects: ["price", "pe", "mcap"],
    ownWords: words.sentiment ?? [],
  });

  // ---- Outside forces: only the ones the company itself talks about
  const outside: Omit<Force, "group" | "ownWords">[] = [
    { id: "competition", plain: "Competitors", term: "Competition", glossary: "competition", chain: ["Rivals cut prices or launch better products", "Customers switch, or the company must cut prices", "Lower sales or thinner margins"], affects: ["revenue", "margin"] },
    { id: "rules", plain: "Laws, taxes and governments", term: "Regulation", glossary: "regulation", chain: ["New laws, taxes, tariffs or court cases", "Extra costs, or limits on what it can sell", "Higher costs, lower sales, or fines"], affects: ["costs", "revenue"] },
    { id: "tech", plain: "Technology and cyber threats", term: "Technological change", chain: ["New technology, or a cyber attack", "Products age faster, or systems are disrupted", "Spending to keep up, lost sales, or repair costs"], affects: ["costs", "revenue"] },
    { id: "supply", plain: "Suppliers and partners", term: "Supply chain", chain: ["A supplier or partner has problems", "It can't make or deliver enough, or pays more", "Lost sales and higher costs"], affects: ["costs", "revenue"] },
    { id: "world", plain: "World events and currencies", term: "Geopolitical and currency risk", chain: ["Conflict, trade disputes, or a stronger US dollar", "Sales abroad are disrupted or worth fewer dollars", "Lower reported sales and profit"], affects: ["revenue", "profit"] },
    { id: "nature", plain: "Nature, climate and health", term: "Environmental factors", chain: ["Bad weather, climate change or a pandemic", "Operations, supplies or customers are disrupted", "Lost sales and extra costs"], affects: ["costs", "revenue"] },
  ];
  for (const f of outside) {
    const w = words[f.id];
    if (w?.length) forces.push({ ...f, group: "outside", ownWords: w.slice(0, 3) });
  }
  return forces;
}
