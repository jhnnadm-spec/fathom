/**
 * Plain-English readings of the tables on the Deep level: for every number,
 * what it is called, what it is, and what it says about this company.
 * Used by both the web page and the PDF. Every value comes from SEC data.
 */
import { formatDate, formatMoney, formatPerDollar, formatPercent, formatPerShare, formatShare } from "./format";
import type { CompanyNumbers, Comparison } from "./metrics";

export type ExplainedNumber = {
  id: string;
  name: string; // what people call it
  term?: string; // glossary key, for the tappable definition
  value: string;
  when: string; // the period or date it covers
  meaning: string; // what this number says about the company, in plain words
};

const dollars = (fraction: number) => `$${Math.round(fraction * 100)}`;

/** Key ratios, each with what it says about this company. */
export function keyRatioRows(n: CompanyNumbers): ExplainedNumber[] {
  const r = n.ratios;
  const rows: ExplainedNumber[] = [];
  const year = (end?: string) => (end ? `Year ended ${formatDate(end)}` : "");
  const on = (end: string) => `On ${formatDate(end)}`;
  const m = n.margins;

  if (m.gross !== undefined) {
    rows.push({
      id: "gross-margin",
      name: "Gross margin",
      term: "gross-margin",
      value: formatShare(m.gross),
      when: year(m.periodEnd),
      meaning: `After paying the direct cost of what it sold, it kept about ${dollars(m.gross)} of every $100 of sales.`,
    });
  }
  if (m.operating !== undefined) {
    rows.push({
      id: "operating-margin",
      name: "Operating margin",
      term: "operating-margin",
      value: formatShare(m.operating),
      when: year(m.periodEnd),
      meaning:
        m.operating >= 0
          ? `After also paying to run the business (staff, offices, research, marketing), about ${dollars(m.operating)} of every $100 was left.`
          : `Running the business cost more than it earned from sales: it lost about ${dollars(Math.abs(m.operating))} on every $100 before interest and tax.`,
    });
  }
  if (m.net !== undefined) {
    rows.push({
      id: "profit-margin",
      name: "Profit margin",
      term: "profit-margin",
      value: formatShare(m.net),
      when: year(m.periodEnd),
      meaning:
        m.net >= 0
          ? `After every cost, including interest and tax, about ${dollars(m.net)} of every $100 of sales was profit.`
          : `After every cost, it lost about ${dollars(Math.abs(m.net))} for every $100 of sales.`,
    });
  }
  const eps = n.annual.eps;
  if (eps) {
    const moved =
      eps.change === undefined ? "" : Math.abs(eps.change) < 0.005 ? ", about the same as the year before" : `, ${eps.change > 0 ? "up" : "down"} ${formatPercent(eps.change)} on the year before`;
    rows.push({
      id: "eps",
      name: "Earnings per share",
      term: "eps",
      value: formatPerShare(eps.latest.value),
      when: year(eps.latest.end),
      meaning:
        eps.latest.value >= 0
          ? `If the year's profit were split equally across all its shares, each share would get ${formatPerShare(eps.latest.value)}${moved}.`
          : `Split across all its shares, the year's loss comes to ${formatPerShare(Math.abs(eps.latest.value))} per share.`,
    });
  }
  if (r.returnOnEquity) {
    rows.push({
      id: "return-on-equity",
      name: "Return on equity",
      term: "return-on-equity",
      value: formatShare(r.returnOnEquity.value),
      when: year(r.returnOnEquity.end),
      meaning: `For every $100 that belongs to shareholders on paper, it made about $${Math.round(r.returnOnEquity.value * 100)} of profit in a year.${r.returnOnEquity.value > 1 ? " A figure above 100% happens when shareholders' equity is small compared with the year's profit." : ""}`,
    });
  }
  if (r.freeCashFlow) {
    rows.push({
      id: "free-cash-flow",
      name: "Free cash flow",
      term: "free-cash-flow",
      value: formatMoney(r.freeCashFlow.value),
      when: year(r.freeCashFlow.end),
      meaning:
        r.freeCashFlow.value >= 0
          ? "The cash left after running the business and paying for new buildings and equipment: money it could use for dividends, buybacks, paying debt or growing."
          : "It spent more on running the business and on buildings and equipment than the business brought in, so it had to use savings or borrow.",
    });
  }
  if (r.currentRatio) {
    const v = r.currentRatio.value;
    rows.push({
      id: "current-ratio",
      name: "Current ratio",
      term: "current-ratio",
      value: v.toFixed(2),
      when: on(r.currentRatio.end),
      meaning: `It had about ${formatPerDollar(v)} of cash and other short-term assets for every $1 of bills due within a year${
        Math.abs(v - 1) < 0.05 ? ", roughly enough to cover them" : v > 1 ? ", more than enough to cover them" : ", less than enough, so it relies on money still to come in"
      }.`,
    });
  }
  if (r.debtToEquity) {
    rows.push({
      id: "debt-to-equity",
      name: "Debt-to-equity",
      term: "debt-to-equity",
      value: `${formatPerDollar(r.debtToEquity.value)} per $1`,
      when: on(r.debtToEquity.end),
      meaning: `It owed about ${formatPerDollar(r.debtToEquity.value)} in long-term loans and bonds for every $1 that belongs to shareholders. Higher means it relies more on borrowed money.`,
    });
  }
  if (r.assetsToLiabilities) {
    rows.push({
      id: "assets-per-dollar-owed",
      name: "Assets per $1 owed",
      term: "total-liabilities",
      value: formatPerDollar(r.assetsToLiabilities.value),
      when: on(r.assetsToLiabilities.end),
      meaning: `Everything it owns (buildings, cash, stock, money owed to it) is worth about ${formatPerDollar(r.assetsToLiabilities.value)} for every $1 it owes in total.`,
    });
  }
  return rows;
}

export type ChangeRow = {
  id: string;
  name: string;
  term?: string;
  when: string;
  latest: string;
  previous?: string;
  change: string; // "Up 6.4%"
  meaning: string;
};

function changeWord(c: Comparison): string {
  if (c.change === undefined) return "No comparison";
  if (Math.abs(c.change) < 0.005) return "About the same";
  return `${c.change > 0 ? "Up" : "Down"} ${formatPercent(c.change)}`;
}

/** "What changed in a year", each line read out in plain words. */
export function changeRows(n: CompanyNumbers): ChangeRow[] {
  const rows: ChangeRow[] = [];
  const add = (
    id: string,
    name: string,
    term: string | undefined,
    c: Comparison | undefined,
    period: "Year" | "Quarter" | "On",
    say: { up: string; down: string; flat: string; none?: string },
  ) => {
    if (!c) return;
    const when = period === "On" ? `On ${formatDate(c.latest.end)}, vs a year earlier` : `${period} ended ${formatDate(c.latest.end)}, vs ${period === "Year" ? "the year before" : "the same quarter a year earlier"}`;
    const meaning =
      c.change === undefined ? (say.none ?? "A percentage change isn't meaningful here, because one of the two figures was a loss or zero.") : Math.abs(c.change) < 0.005 ? say.flat : c.change > 0 ? say.up : say.down;
    rows.push({
      id,
      name,
      term,
      when,
      latest: formatMoney(c.latest.value),
      previous: c.previous ? formatMoney(c.previous.value) : undefined,
      change: changeWord(c),
      meaning,
    });
  };
  add("revenue-year", "Revenue (sales)", "revenue", n.annual.revenue, "Year", {
    up: "It sold more than the year before.",
    down: "It sold less than the year before.",
    flat: "It sold about the same as the year before.",
  });
  add("revenue-quarter", "Revenue (sales)", "quarter", n.quarter.revenue, "Quarter", {
    up: "Its latest three months brought in more sales than the same three months a year earlier.",
    down: "Its latest three months brought in fewer sales than the same three months a year earlier.",
    flat: "Its latest three months brought in about the same sales as a year earlier.",
  });
  add("net-income-year", "Net income (profit)", "net-income", n.annual.netIncome, "Year", {
    up: "It kept more profit after all costs and taxes than the year before.",
    down: "It kept less profit after all costs and taxes than the year before.",
    flat: "Its profit was about the same as the year before.",
  });
  add("net-income-quarter", "Net income (profit)", "net-income", n.quarter.netIncome, "Quarter", {
    up: "Profit in the latest three months was higher than a year earlier.",
    down: "Profit in the latest three months was lower than a year earlier.",
    flat: "Profit in the latest three months was about the same as a year earlier.",
  });
  add("operating-cash-flow", "Cash from operations", "cash-from-operations", n.annual.operatingCashFlow, "Year", {
    up: "Its everyday business brought in more actual cash than the year before.",
    down: "Its everyday business brought in less actual cash than the year before.",
    flat: "Its everyday business brought in about the same cash as the year before.",
  });
  add("cash", "Cash", "cash-and-equivalents", n.balance.cash, "On", {
    up: "It had more cash on hand than a year earlier.",
    down: "It had less cash on hand than a year earlier. That can mean it spent or returned cash, not necessarily trouble.",
    flat: "It had about the same cash on hand as a year earlier.",
  });
  add("long-term-debt", "Long-term debt", "long-term-debt", n.balance.longTermDebt, "On", {
    up: "It owed more in long-term loans and bonds than a year earlier.",
    down: "It owed less in long-term loans and bonds than a year earlier.",
    flat: "Its long-term loans and bonds were about the same as a year earlier.",
  });
  add("equity", "Shareholders' equity", "shareholders-equity", n.balance.equity, "On", {
    up: "What would be left for shareholders, if it sold everything and paid every debt, grew over the year.",
    down: "What would be left for shareholders, if it sold everything and paid every debt, shrank over the year. Buybacks and dividends can cause this.",
    flat: "What would be left for shareholders was about the same as a year earlier.",
  });
  return rows;
}

/** Where each $100 of sales went in the latest year, step by step. */
export function hundredDollarSteps(n: CompanyNumbers): { label: string; amount: number; note: string }[] | undefined {
  const m = n.margins;
  if (m.gross === undefined && m.operating === undefined && m.net === undefined) return undefined;
  const steps = [{ label: "Sales", amount: 100, note: "Every $100 the company took in from customers" }];
  if (m.gross !== undefined) steps.push({ label: "After the cost of what it sold", amount: m.gross * 100, note: "Gross margin" });
  if (m.operating !== undefined) steps.push({ label: "After running the business", amount: m.operating * 100, note: "Operating margin" });
  if (m.net !== undefined) steps.push({ label: "After interest and tax: profit", amount: m.net * 100, note: "Profit margin" });
  return steps;
}

/** One sentence per margin on how it moved across the years shown. */
export function marginTrends(n: CompanyNumbers): string[] {
  const h = n.marginHistory;
  if (h.length < 2) return [];
  const first = h[0];
  const last = h.at(-1)!;
  const out: string[] = [];
  const years = `${first.end.slice(0, 4)} to ${last.end.slice(0, 4)}`;
  const say = (name: string, a: number | undefined, b: number | undefined, meaning: { up: string; down: string }) => {
    if (a === undefined || b === undefined) return;
    if (Math.abs(b - a) < 0.005) out.push(`${name} stayed about the same from ${years}, at around ${formatShare(b)}.`);
    else out.push(`${name} ${b > a ? "rose" : "fell"} from ${formatShare(a)} to ${formatShare(b)} (${years}): ${b > a ? meaning.up : meaning.down}`);
  };
  say("Gross margin", first.gross, last.gross, {
    up: "it now keeps more of each sale after paying for what it sells.",
    down: "making or buying what it sells now takes a bigger share of each sale.",
  });
  say("Operating margin", first.operating, last.operating, {
    up: "the business as a whole has become more profitable per dollar of sales.",
    down: "running costs or product costs now take a bigger share of sales.",
  });
  say("Profit margin", first.net, last.net, {
    up: "more of each dollar of sales ends up as final profit.",
    down: "less of each dollar of sales ends up as final profit.",
  });
  return out;
}
