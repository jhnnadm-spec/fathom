/**
 * The numbers engine: picks the right figures from SEC data and works out
 * comparisons and ratios. Every figure keeps a link to the filing it came from.
 *
 * Rules that protect accuracy:
 *  - use the tag with the newest data, and only that tag for a comparison
 *  - leave a number out if it is stale compared with the company's latest report
 *  - compare a year with the previous year, and a quarter with the same quarter a year earlier
 *  - only combine two numbers into a ratio when they cover exactly the same period or date
 */
import { SEC_URLS } from "../sec/client";
import { getSeries, type CompanyFacts, type PeriodKind, type SeriesPoint } from "../sec/facts";
import type { CompanyFilings } from "../sec/filings";
import { formatDate, percentChange } from "./format";
import { METRICS, type MetricDefinition, type MetricId } from "./concepts";

export type Source = {
  label: string; // e.g. "10-K filed October 31, 2025"
  url: string;
  form: string;
  filed: string;
};

export type Figure = {
  value: number;
  start?: string;
  end: string;
  tag: string;
  label: string; // plain description of exactly what this number is
  source: Source;
};

export type Comparison = {
  id: MetricId;
  latest: Figure;
  previous?: Figure; // the same period a year earlier, when available
  change?: number; // fraction, e.g. 0.064 for +6.4%
};

export type Omission = { id: MetricId; period: PeriodKind; reason: "not-reported" | "stale" };

/** A ratio worked out from two or more figures, with the figures kept for sources. */
export type Ratio = { value: number; end: string; figures: Figure[] };

export type YearMargins = { end: string; gross?: number; operating?: number; net?: number };

export type CompanyNumbers = {
  asOf: string; // end of the latest period covered by the company's reports
  annual: Partial<Record<MetricId, Comparison>>;
  quarter: Partial<Record<MetricId, Comparison>>;
  balance: Partial<Record<MetricId, Comparison>>;
  margins: { gross?: number; operating?: number; net?: number; periodEnd?: string };
  marginHistory: YearMargins[]; // oldest first
  revenueHistory: Figure[]; // up to 5 years, oldest first
  ratios: {
    freeCashFlow?: Ratio; // cash from operations minus spending on buildings and equipment (a $ amount)
    currentRatio?: Ratio;
    debtToEquity?: Ratio;
    assetsToLiabilities?: Ratio;
    returnOnEquity?: Ratio;
  };
  negativeEquity?: Figure; // when shareholders' equity is below zero, ratios using it are skipped
  omitted: Omission[];
};

const DAY = 86_400_000;
const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);

// How old a figure may be, compared with the latest report, before we leave it out.
const MAX_AGE_DAYS: Record<PeriodKind, number> = { annual: 380, quarterly: 120, instant: 120 };

function sourceFor(point: SeriesPoint, filings: CompanyFilings): Source {
  const filing = filings.filings.find((f) => f.accessionNumber === point.accn);
  return {
    label: `${point.form} filed ${formatDate(filing?.filingDate ?? point.filed)}`,
    url: filing?.url ?? SEC_URLS.filingIndex(filings.cik, point.accn),
    form: point.form,
    filed: filing?.filingDate ?? point.filed,
  };
}

function toFigure(point: SeriesPoint, label: string, filings: CompanyFilings): Figure {
  return {
    value: point.value,
    start: point.start,
    end: point.end,
    tag: point.concept,
    label,
    source: sourceFor(point, filings),
  };
}

/** The series for the tag whose data is newest. Ties go to the tag listed first. */
function chooseSeries(facts: CompanyFacts, def: MetricDefinition, kind: PeriodKind) {
  let best: { series: SeriesPoint[]; label: string } | undefined;
  for (const { tag, label } of def.tags) {
    const series = getSeries(facts, [tag], kind, def.unit ?? "USD");
    if (series.length === 0) continue;
    if (!best || series[0].end > best.series[0].end) best = { series, label };
  }
  return best;
}

/** The point roughly one year before `end` (within 3 weeks), if there is one. */
function yearEarlier(series: SeriesPoint[], end: string): SeriesPoint | undefined {
  return series.find((p) => Math.abs(days(p.end, end) - 365) <= 21);
}

/** The point on (or within a week of) a given date. */
function onDate(series: SeriesPoint[], date: string): SeriesPoint | undefined {
  return series.find((p) => Math.abs(days(p.end, date)) <= 7);
}

function compare(
  facts: CompanyFacts,
  filings: CompanyFilings,
  id: MetricId,
  kind: PeriodKind,
  asOf: string,
  omitted: Omission[],
): Comparison | undefined {
  const chosen = chooseSeries(facts, METRICS[id], kind);
  if (!chosen) {
    omitted.push({ id, period: kind, reason: "not-reported" });
    return undefined;
  }
  const [latestPoint] = chosen.series;
  if (days(latestPoint.end, asOf) > MAX_AGE_DAYS[kind]) {
    omitted.push({ id, period: kind, reason: "stale" });
    return undefined;
  }
  const previousPoint = yearEarlier(chosen.series, latestPoint.end);
  const latest = toFigure(latestPoint, chosen.label, filings);
  const previous = previousPoint ? toFigure(previousPoint, chosen.label, filings) : undefined;
  return {
    id,
    latest,
    previous,
    change: previous ? percentChange(latest.value, previous.value) : undefined,
  };
}

/** The date the company's latest annual or quarterly report covers up to. */
export function latestPeriodEnd(filings: CompanyFilings): string | undefined {
  return filings.filings
    .filter((f) => (f.form === "10-K" || f.form === "10-Q") && f.reportDate)
    .map((f) => f.reportDate)
    .sort()
    .at(-1);
}

const samePeriod = (a?: Figure, b?: Figure) => Boolean(a && b && a.start === b.start && a.end === b.end);
const sameDate = (a?: Figure, b?: Figure) => Boolean(a && b && a.end === b.end);

export function computeNumbers(facts: CompanyFacts, filings: CompanyFilings): CompanyNumbers {
  const asOf = latestPeriodEnd(filings) ?? new Date().toISOString().slice(0, 10);
  const omitted: Omission[] = [];
  const annual: CompanyNumbers["annual"] = {};
  const quarter: CompanyNumbers["quarter"] = {};
  const balance: CompanyNumbers["balance"] = {};

  for (const def of Object.values(METRICS)) {
    if (def.kind === "instant") {
      const c = compare(facts, filings, def.id, "instant", asOf, omitted);
      if (c) balance[def.id] = c;
    } else {
      const a = compare(facts, filings, def.id, "annual", asOf, omitted);
      if (a) annual[def.id] = a;
      if (def.quarterly) {
        const q = compare(facts, filings, def.id, "quarterly", asOf, omitted);
        if (q) quarter[def.id] = q;
      }
    }
  }

  // ---- Margins for the latest year: only when both numbers cover exactly the same year.
  const margins: CompanyNumbers["margins"] = {};
  const revenue = annual.revenue?.latest;
  if (revenue && revenue.value > 0) {
    margins.periodEnd = revenue.end;
    if (samePeriod(annual.grossProfit?.latest, revenue)) margins.gross = annual.grossProfit!.latest.value / revenue.value;
    if (samePeriod(annual.operatingIncome?.latest, revenue)) margins.operating = annual.operatingIncome!.latest.value / revenue.value;
    if (samePeriod(annual.netIncome?.latest, revenue)) margins.net = annual.netIncome!.latest.value / revenue.value;
  }

  // ---- Revenue over up to five years, all from the same tag, oldest first.
  const revenueHistory: Figure[] = [];
  const chosenRevenue = chooseSeries(facts, METRICS.revenue, "annual");
  if (chosenRevenue && annual.revenue) {
    let cursor: SeriesPoint | undefined = chosenRevenue.series[0];
    while (cursor && revenueHistory.length < 5) {
      revenueHistory.unshift(toFigure(cursor, chosenRevenue.label, filings));
      cursor = yearEarlier(chosenRevenue.series, cursor.end);
    }
  }

  // ---- Margins year by year, for the years we have revenue.
  const seriesOf = (id: MetricId) => (annual[id] ? chooseSeries(facts, METRICS[id], "annual")?.series ?? [] : []);
  const gross = seriesOf("grossProfit");
  const operating = seriesOf("operatingIncome");
  const net = seriesOf("netIncome");
  const marginHistory: YearMargins[] = revenueHistory
    .filter((r) => r.value > 0)
    .map((r) => {
      const match = (s: SeriesPoint[]) => s.find((p) => p.start === r.start && p.end === r.end);
      const g = match(gross);
      const o = match(operating);
      const n = match(net);
      return {
        end: r.end,
        gross: g ? g.value / r.value : undefined,
        operating: o ? o.value / r.value : undefined,
        net: n ? n.value / r.value : undefined,
      };
    });

  // ---- Ratios
  const ratios: CompanyNumbers["ratios"] = {};
  const ocf = annual.operatingCashFlow?.latest;
  const capex = annual.capex?.latest;
  if (ocf && capex && samePeriod(ocf, capex)) {
    ratios.freeCashFlow = { value: ocf.value - capex.value, end: ocf.end, figures: [ocf, capex] };
  }

  const ca = balance.currentAssets?.latest;
  const cl = balance.currentLiabilities?.latest;
  if (ca && cl && sameDate(ca, cl) && cl.value > 0) {
    ratios.currentRatio = { value: ca.value / cl.value, end: ca.end, figures: [ca, cl] };
  }

  const assets = balance.assets?.latest;
  const liabilities = balance.liabilities?.latest;
  if (assets && liabilities && sameDate(assets, liabilities) && liabilities.value > 0) {
    ratios.assetsToLiabilities = { value: assets.value / liabilities.value, end: assets.end, figures: [assets, liabilities] };
  }

  const equity = balance.equity?.latest;
  let negativeEquity: Figure | undefined;
  if (equity && equity.value <= 0) negativeEquity = equity;

  const debt = balance.longTermDebt?.latest;
  if (debt && equity && sameDate(debt, equity) && equity.value > 0) {
    ratios.debtToEquity = { value: debt.value / equity.value, end: equity.end, figures: [debt, equity] };
  }

  // Return on equity: a year's profit divided by the average equity at the start and end of that year.
  const ni = annual.netIncome?.latest;
  const equitySeries = annual.netIncome && balance.equity ? chooseSeries(facts, METRICS.equity, "instant") : undefined;
  if (ni && ni.start && equitySeries) {
    const endPoint = onDate(equitySeries.series, ni.end);
    const startPoint = onDate(equitySeries.series, new Date(Date.parse(ni.start) - DAY).toISOString().slice(0, 10));
    if (endPoint && startPoint && endPoint.value > 0 && startPoint.value > 0) {
      const average = (endPoint.value + startPoint.value) / 2;
      ratios.returnOnEquity = {
        value: ni.value / average,
        end: ni.end,
        figures: [ni, toFigure(endPoint, equitySeries.label, filings), toFigure(startPoint, equitySeries.label, filings)],
      };
    }
  }

  return { asOf, annual, quarter, balance, margins, marginHistory, revenueHistory, ratios, negativeEquity, omitted };
}
