/**
 * "Check your understanding" questions, one per research step. Where the
 * company's numbers allow, the question uses them (so the answer comes from
 * SEC data); otherwise it checks the idea the step teaches.
 */
import { formatMoney, formatPercent } from "../financials/format";
import { SECTORS, sectorOf, type SectorId } from "../sectors";
import type { CompanyReport } from "./company";
import { moneyUses } from "./visuals";

export type Quiz = { question: string; options: string[]; answer: number; explain: string };

/** A stable shuffle, so the right answer isn't always in the same place but doesn't jump around on reload. */
function place(correct: string, wrong: string[], seed: string): { options: string[]; answer: number } {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const answer = h % (wrong.length + 1);
  const options = [...wrong];
  options.splice(answer, 0, correct);
  return { options, answer };
}

function quiz(seed: string, question: string, correct: string, wrong: string[], explain: string): Quiz {
  return { question, ...place(correct, wrong, seed), explain };
}

export function quizFor(step: string, report: CompanyReport): Quiz | undefined {
  const n = report.numbers;
  const name = report.company.name;
  const seed = `${report.company.ticker}-${step}`;

  switch (step) {
    case "business": {
      const own = sectorOf(report.company.sic);
      if (own) {
        const others = (Object.keys(SECTORS) as SectorId[]).filter((s) => s !== own);
        const pick = [others[(report.company.sic * 7) % others.length], others[(report.company.sic * 13 + 5) % others.length]];
        const wrong = [...new Set(pick)].map((s) => SECTORS[s].name);
        if (wrong.length < 2) wrong.push(SECTORS[others.find((s) => !pick.includes(s))!].name);
        return quiz(
          seed,
          `Which part of the economy is ${name} in?`,
          SECTORS[own].name,
          wrong.slice(0, 2),
          `${name} tells the SEC its industry is "${report.company.industry}", which Fathom groups under ${SECTORS[own].name}. Knowing the sector tells you who it competes with and what affects it.`,
        );
      }
      return undefined;
    }
    case "performance": {
      const net = n?.margins.net;
      if (net !== undefined && net > 0 && net < 0.9) {
        const right = Math.round(net * 100);
        const gross = n?.margins.gross !== undefined ? Math.round(n.margins.gross * 100) : undefined;
        const candidates = [gross, Math.max(1, Math.round(right / 4)), Math.min(95, right * 2 + 10), 100 - right].filter(
          (x): x is number => x !== undefined && Math.abs(x - right) >= 6,
        );
        const wrong = [...new Set(candidates)].slice(0, 2).map((x) => `$${x}`);
        if (wrong.length === 2) {
          return quiz(
            seed,
            `Out of every $100 of sales, about how much did ${name} keep as final profit?`,
            `$${right}`,
            wrong,
            `About $${right}: that's its profit margin. The rest paid for making its products, running the business, interest and tax.`,
          );
        }
      }
      const c = n?.annual.revenue?.change;
      if (c !== undefined && Math.abs(c) >= 0.005) {
        return quiz(
          seed,
          `Did ${name}'s yearly sales go up or down in its latest year?`,
          c > 0 ? `Up, by ${formatPercent(c)}` : `Down, by ${formatPercent(c)}`,
          [c > 0 ? `Down, by ${formatPercent(c)}` : `Up, by ${formatPercent(c)}`, "Stayed exactly the same"],
          `Sales went ${c > 0 ? "up" : "down"} ${formatPercent(c)} compared with the year before.`,
        );
      }
      return undefined;
    }
    case "health": {
      const cash = n?.balance.cash?.latest;
      const debt = n?.balance.longTermDebt?.latest;
      if (cash && debt && cash.end === debt.end) {
        const more = cash.value >= debt.value;
        return quiz(
          seed,
          `On its latest balance sheet, did ${name} hold more cash or owe more long-term debt?`,
          more ? "More cash than long-term debt" : "More long-term debt than cash",
          [more ? "More long-term debt than cash" : "More cash than long-term debt", "It has no debt at all"],
          `It held ${formatMoney(cash.value)} in cash and owed ${formatMoney(debt.value)} in long-term debt. Owing more than you hold isn't automatically bad; it depends on whether the business brings in enough cash to pay.`,
        );
      }
      return quiz(
        seed,
        "What does a current ratio above 1 mean?",
        "It has more short-term assets than bills due within a year",
        ["It made a profit this year", "Its share price went up"],
        "The current ratio compares what a company can turn into cash within a year with the bills it must pay in that time.",
      );
    }
    case "cash":
      return quiz(
        seed,
        "What is free cash flow?",
        "Cash left over after paying for buildings and equipment",
        ["All the money a company makes from sales", "Money a company borrows from banks"],
        "Free cash flow is the spare cash a business produces. Companies use it for dividends, buybacks, paying off debt or growing.",
      );
    case "management": {
      const uses = moneyUses(n);
      if (uses && uses.segments.length >= 2) {
        const all = ["Buying back its own shares", "Dividends to shareholders", "Buildings and equipment", "Buying other businesses"];
        const right = uses.segments[0].label;
        const wrong = all.filter((x) => x !== right).slice(0, 2);
        return quiz(
          seed,
          `What did ${name} spend the most money on in its latest year?`,
          right,
          wrong,
          `${right}: ${uses.segments[0].display}. Where a company puts its spare cash shows what its leaders think matters most.`,
        );
      }
      return quiz(
        seed,
        "What happens in a share buyback?",
        "The company buys its own shares, so each remaining share owns a bigger slice",
        ["The company sells new shares to raise money", "Shareholders sell their shares back to the government"],
        "A buyback reduces the number of shares, so each remaining share owns a larger part of the company.",
      );
    }
    case "outlook":
      return quiz(
        seed,
        "Where do the risks on this page come from?",
        "The company's own annual and quarterly reports",
        ["Fathom's opinion", "Comments from people online"],
        "Every risk point quotes the company's own reports to the SEC. Companies must describe the main things that could hurt them.",
      );
    case "value":
      return quiz(
        seed,
        "If a company's P/E ratio is 30, what does that mean?",
        "Buyers pay $30 for each $1 of its yearly profit",
        ["The company made $30 of profit", "The share price will rise 30%"],
        "P/E compares the share price with a year of profit per share. It describes the price; it doesn't say whether the price is right.",
      );
  }
  return undefined;
}
