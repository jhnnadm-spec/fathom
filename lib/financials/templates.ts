/**
 * Plain-English sentences built from the numbers engine.
 *
 * Every number in these sentences is calculated from SEC data, never typed.
 * Finance terms are marked like [[revenue|Revenue]] so the website can explain
 * them on tap: the part before | is the glossary key, the part after is the text shown.
 */
import { formatDate, formatMoney, formatPercent } from "./format";
import type { CompanyNumbers, Comparison, Figure, Source } from "./metrics";

export type StatementSection = "growth" | "quarter" | "profit" | "cashAndDebt";

export type Statement = {
  id: string;
  section: StatementSection;
  text: string;
  sources: Source[];
  figures: Figure[];
};

// Changes smaller than this are described as "about the same".
const FLAT = 0.005;

function uniqueSources(figures: Figure[]): Source[] {
  const seen = new Map<string, Source>();
  for (const f of figures) if (!seen.has(f.source.url)) seen.set(f.source.url, f.source);
  return [...seen.values()];
}

function statement(id: string, section: StatementSection, text: string, figures: Figure[]): Statement {
  return { id, section, text, figures, sources: uniqueSources(figures) };
}

function figuresOf(c: Comparison): Figure[] {
  return c.previous ? [c.latest, c.previous] : [c.latest];
}

function revenueYear(c: Comparison): Statement {
  const when = `in the year ended ${formatDate(c.latest.end)}`;
  const amount = formatMoney(c.latest.value);
  let text: string;
  if (c.change === undefined) {
    text = `[[revenue|Revenue]] was ${amount} ${when}.`;
  } else if (Math.abs(c.change) < FLAT) {
    text = `[[revenue|Revenue]] was about the same as the year before, at ${amount} ${when}.`;
  } else if (c.change > 0) {
    text = `[[revenue|Revenue]] grew ${formatPercent(c.change)} ${when}, to ${amount}. This means the company sold more than the year before.`;
  } else {
    text = `[[revenue|Revenue]] fell ${formatPercent(c.change)} ${when}, to ${amount}. This means the company sold less than the year before.`;
  }
  return statement("revenue-year", "growth", text, figuresOf(c));
}

function revenueQuarter(c: Comparison): Statement {
  const when = `In the [[quarter|quarter]] ended ${formatDate(c.latest.end)}`;
  const amount = formatMoney(c.latest.value);
  let text: string;
  if (c.change === undefined) {
    text = `${when}, revenue was ${amount}.`;
  } else if (Math.abs(c.change) < FLAT) {
    text = `${when}, revenue was ${amount}, about the same as the same quarter a year earlier.`;
  } else {
    const direction = c.change > 0 ? "up" : "down";
    text = `${when}, revenue was ${amount}, ${direction} ${formatPercent(c.change)} from the same quarter a year earlier.`;
  }
  return statement("revenue-quarter", "quarter", text, figuresOf(c));
}

function netIncomeYear(c: Comparison): Statement {
  const when = `in the year ended ${formatDate(c.latest.end)}`;
  const value = c.latest.value;
  const prev = c.previous?.value;
  let text: string;
  if (value < 0) {
    text = `The company made a [[net-loss|net loss]] of ${formatMoney(Math.abs(value))} ${when}, meaning its costs were bigger than its income.`;
  } else if (prev !== undefined && prev < 0) {
    text = `The company made a [[net-income|net income]] (profit) of ${formatMoney(value)} ${when}, after a loss the year before.`;
  } else if (c.change === undefined || Math.abs(c.change) < FLAT) {
    text = `[[net-income|Net income]], the profit left after all costs and taxes, was ${formatMoney(value)} ${when}.`;
  } else {
    const direction = c.change > 0 ? "rose" : "fell";
    text = `[[net-income|Net income]], the profit left after all costs and taxes, ${direction} ${formatPercent(c.change)} to ${formatMoney(value)} ${when}.`;
  }
  return statement("net-income-year", "profit", text, figuresOf(c));
}

function perHundred(fraction: number): string {
  return `$${Math.round(fraction * 100)}`;
}

export function buildStatements(numbers: CompanyNumbers): Statement[] {
  const out: Statement[] = [];
  const { annual, quarter, balance, margins } = numbers;

  if (annual.revenue) out.push(revenueYear(annual.revenue));
  if (quarter.revenue) out.push(revenueQuarter(quarter.revenue));
  if (annual.netIncome) out.push(netIncomeYear(annual.netIncome));

  const revenue = annual.revenue?.latest;
  if (revenue && margins.gross !== undefined && margins.gross > 0 && annual.grossProfit) {
    out.push(
      statement(
        "gross-margin",
        "profit",
        `After paying for the products it sold, the company kept about ${perHundred(margins.gross)} of every $100 of sales. This is called its [[gross-margin|gross margin]].`,
        [annual.grossProfit.latest, revenue],
      ),
    );
  }
  if (revenue && margins.net !== undefined && margins.net > 0 && annual.netIncome) {
    out.push(
      statement(
        "net-margin",
        "profit",
        `Out of every $100 of sales, about ${perHundred(margins.net)} was left as profit after all costs and taxes. This is called its [[profit-margin|profit margin]].`,
        [annual.netIncome.latest, revenue],
      ),
    );
  }
  if (annual.operatingCashFlow && annual.operatingCashFlow.latest.value > 0) {
    const c = annual.operatingCashFlow;
    out.push(
      statement(
        "operating-cash-flow",
        "profit",
        `Its day-to-day business brought in ${formatMoney(c.latest.value)} of cash in the year ended ${formatDate(c.latest.end)}. This is called [[cash-from-operations|cash from operations]].`,
        [c.latest],
      ),
    );
  }

  const cash = balance.cash?.latest;
  const debt = balance.longTermDebt?.latest;
  if (cash) {
    out.push(
      statement(
        "cash",
        "cashAndDebt",
        `On ${formatDate(cash.end)}, the company had ${formatMoney(cash.value)} in [[cash-and-equivalents|cash and cash equivalents]], money it can use quickly.`,
        [cash],
      ),
    );
  }
  if (debt) {
    out.push(
      statement(
        "long-term-debt",
        "cashAndDebt",
        `On ${formatDate(debt.end)}, it owed ${formatMoney(debt.value)} in [[long-term-debt|${debt.label}]].`,
        [debt],
      ),
    );
  }
  if (cash && debt && cash.end === debt.end) {
    const more = cash.value >= debt.value;
    out.push(
      statement(
        "cash-vs-debt",
        "cashAndDebt",
        more
          ? "On that date it held more in cash than it owed in long-term debt."
          : "On that date it owed more in long-term debt than it held in cash.",
        [cash, debt],
      ),
    );
  }

  return out;
}

/** The sentence with term markers removed, for places that can't show explanations (like search results). */
export function plainText(text: string): string {
  return text.replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g, "$1");
}

/** All glossary keys used in a sentence. */
export function termsIn(text: string): string[] {
  return [...text.matchAll(/\[\[([^|\]]+)\|/g)].map((m) => m[1]);
}
