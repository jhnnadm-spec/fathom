/**
 * Plain-English sentences built from the numbers engine.
 *
 * Every number in these sentences is calculated from SEC data, never typed.
 * Finance terms are marked like [[revenue|Revenue]] so the website can explain
 * them on tap: the part before | is the glossary key, the part after is the text shown.
 */
import { formatDate, formatMoney, formatPerDollar, formatPercent, formatPerShare, formatShare } from "./format";
import type { CompanyNumbers, Comparison, Figure, Source } from "./metrics";

export type StatementSection =
  | "growth"
  | "quarter"
  | "profit"
  | "cashAndDebt"
  | "health"
  | "cashFlow"
  | "capital"
  | "returns";

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

  out.push(...healthStatements(numbers), ...cashFlowStatements(numbers), ...capitalStatements(numbers), ...returnStatements(numbers));
  return out;
}

// ---------------------------------------------------------------- balance sheet health

function healthStatements(n: CompanyNumbers): Statement[] {
  const out: Statement[] = [];
  const { currentRatio, debtToEquity, assetsToLiabilities } = n.ratios;

  if (currentRatio) {
    const [ca, cl] = currentRatio.figures;
    const enough = currentRatio.value >= 1;
    out.push(
      statement(
        "current-ratio",
        "health",
        `On ${formatDate(currentRatio.end)}, the company had ${formatMoney(ca.value)} in cash and other assets it expects to use within a year, against ${formatMoney(cl.value)} of bills due within a year. That is about ${formatPerDollar(currentRatio.value)} for every $1 it owes soon, ${enough ? "more than" : "less than"} enough to cover them. This is its [[current-ratio|current ratio]].`,
        currentRatio.figures,
      ),
    );
  }

  if (assetsToLiabilities) {
    const [assets, liabilities] = assetsToLiabilities.figures;
    out.push(
      statement(
        "assets-vs-liabilities",
        "health",
        `It owned ${formatMoney(assets.value)} in [[assets|assets]] and owed ${formatMoney(liabilities.value)} in [[total-liabilities|total liabilities]], so it owned about ${formatPerDollar(assetsToLiabilities.value)} for every $1 it owed.`,
        assetsToLiabilities.figures,
      ),
    );
  }

  if (debtToEquity) {
    const [debt, equity] = debtToEquity.figures;
    out.push(
      statement(
        "debt-to-equity",
        "health",
        `For every $1 of [[shareholders-equity|shareholders' equity]] (${formatMoney(equity.value)}), it owed about ${formatPerDollar(debtToEquity.value)} in long-term debt (${formatMoney(debt.value)}). This is its [[debt-to-equity|debt-to-equity ratio]].`,
        debtToEquity.figures,
      ),
    );
  } else if (n.negativeEquity) {
    out.push(
      statement(
        "negative-equity",
        "health",
        `On ${formatDate(n.negativeEquity.end)}, its [[shareholders-equity|shareholders' equity]] was below zero (${formatMoney(n.negativeEquity.value)}), meaning its liabilities were larger than its assets on paper. Ratios that divide by equity aren't meaningful, so they are left out.`,
        [n.negativeEquity],
      ),
    );
  }
  return out;
}

// ---------------------------------------------------------------- cash flow

function cashFlowStatements(n: CompanyNumbers): Statement[] {
  const fcf = n.ratios.freeCashFlow;
  if (!fcf) return [];
  const [ocf, capex] = fcf.figures;
  const when = `in the year ended ${formatDate(fcf.end)}`;
  const out: Statement[] = [];
  if (fcf.value >= 0) {
    out.push(
      statement(
        "free-cash-flow",
        "cashFlow",
        `Its business brought in ${formatMoney(ocf.value)} of cash ${when} and spent ${formatMoney(capex.value)} on [[capital-expenditure|buildings and equipment]], leaving ${formatMoney(fcf.value)} of [[free-cash-flow|free cash flow]]: money it could use for dividends, buybacks, paying down debt or growing.`,
        fcf.figures,
      ),
    );
  } else {
    out.push(
      statement(
        "free-cash-flow",
        "cashFlow",
        `Its business brought in ${formatMoney(ocf.value)} of cash ${when} but spent ${formatMoney(capex.value)} on [[capital-expenditure|buildings and equipment]], so its [[free-cash-flow|free cash flow]] was negative: it spent ${formatMoney(Math.abs(fcf.value))} more than the business brought in.`,
        fcf.figures,
      ),
    );
  }

  const ni = n.annual.netIncome?.latest;
  if (ni && ni.end === fcf.end && ni.value > 0 && fcf.value > 0) {
    const ratio = fcf.value / ni.value;
    const text =
      ratio >= 1
        ? `Free cash flow was larger than its [[net-income|net income]] (${formatMoney(ni.value)}) that year, meaning the cash the business actually brought in more than matched its accounting profit.`
        : `Free cash flow was smaller than its [[net-income|net income]] (${formatMoney(ni.value)}) that year, meaning less of its accounting profit turned into spare cash.`;
    out.push(statement("fcf-vs-profit", "cashFlow", text, [...fcf.figures, ni]));
  }
  return out;
}

// ---------------------------------------------------------------- how management used the money

function capitalStatements(n: CompanyNumbers): Statement[] {
  const year = n.annual.operatingCashFlow?.latest ?? n.annual.revenue?.latest;
  if (!year) return [];
  const sameYear = (c?: Comparison) => (c && c.latest.start === year.start && c.latest.end === year.end && c.latest.value > 0 ? c.latest : undefined);
  const parts: { text: string; figure: Figure }[] = [];
  const buybacks = sameYear(n.annual.buybacks);
  const dividends = sameYear(n.annual.dividends);
  const capex = sameYear(n.annual.capex);
  const acquisitions = sameYear(n.annual.acquisitions);
  if (buybacks) parts.push({ text: `spent ${formatMoney(buybacks.value)} buying back its own shares ([[share-buyback|buybacks]])`, figure: buybacks });
  if (dividends) parts.push({ text: `paid ${formatMoney(dividends.value)} in [[dividend|dividends]] to shareholders`, figure: dividends });
  if (capex) parts.push({ text: `invested ${formatMoney(capex.value)} in buildings and equipment`, figure: capex });
  if (acquisitions) parts.push({ text: `spent ${formatMoney(acquisitions.value)} buying other businesses`, figure: acquisitions });
  if (parts.length === 0) return [];

  const list =
    parts.length === 1
      ? parts[0].text
      : `${parts.slice(0, -1).map((p) => p.text).join(", ")} and ${parts.at(-1)!.text}`;
  return [
    statement(
      "capital-allocation",
      "capital",
      `In the year ended ${formatDate(year.end)}, the company ${list}.`,
      parts.map((p) => p.figure),
    ),
  ];
}

// ---------------------------------------------------------------- returns and per-share results

function returnStatements(n: CompanyNumbers): Statement[] {
  const out: Statement[] = [];
  const roe = n.ratios.returnOnEquity;
  if (roe) {
    out.push(
      statement(
        "return-on-equity",
        "returns",
        `It earned about ${formatMoney(Math.round(roe.value * 100))} of profit for every $100 of [[shareholders-equity|shareholders' equity]] in the year ended ${formatDate(roe.end)}. This is its [[return-on-equity|return on equity]] (${formatShare(roe.value)}).${roe.value > 1 ? " A figure this high happens when shareholders' equity is small compared with the year's profit." : ""}`,
        roe.figures,
      ),
    );
  }

  const eps = n.annual.eps;
  if (eps) {
    const label = eps.latest.label.startsWith("diluted") ? "[[eps|Earnings per share]] (diluted)" : "[[eps|Earnings per share]] (basic)";
    const value = formatPerShare(eps.latest.value);
    let text: string;
    if (eps.change === undefined) {
      text = `${label} was ${value} in the year ended ${formatDate(eps.latest.end)}.`;
    } else if (Math.abs(eps.change) < FLAT) {
      text = `${label} was about the same as the year before, at ${value}.`;
    } else {
      text = `${label} ${eps.change > 0 ? "rose" : "fell"} ${formatPercent(eps.change)} to ${value} in the year ended ${formatDate(eps.latest.end)}.`;
    }
    out.push(statement("eps", "returns", text, eps.previous ? [eps.latest, eps.previous] : [eps.latest]));
  }

  // How the operating margin (or, if not reported, the gross margin) moved over the years we have.
  const history = n.marginHistory;
  const pick = history.every((y) => y.operating !== undefined) ? "operating" : history.every((y) => y.gross !== undefined) ? "gross" : undefined;
  if (pick && history.length >= 3) {
    const first = history[0];
    const last = history.at(-1)!;
    const a = first[pick]!;
    const b = last[pick]!;
    const name = pick === "operating" ? "[[operating-margin|operating margin]]" : "[[gross-margin|gross margin]]";
    const move = Math.abs(b - a) < 0.005 ? "stayed about the same, at" : b > a ? "rose to" : "fell to";
    const figures = n.revenueHistory.filter((r) => r.end === first.end || r.end === last.end);
    out.push(
      statement(
        "margin-trend",
        "returns",
        `Over the ${history.length} years to ${formatDate(last.end)}, its ${name} ${move} ${formatShare(b)}${move.startsWith("stayed") ? "" : `, from ${formatShare(a)}`}.`,
        figures,
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
