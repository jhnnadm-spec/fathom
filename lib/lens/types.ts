/**
 * The shared shape every research lens returns, so the company page and the
 * comparison tool can treat them all the same way.
 *
 * Rules every lens follows:
 *  - numbers are worked out in code from public filings or open data, never by the AI
 *  - every figure carries its period, currency and a link to where it came from
 *  - a missing figure is marked "not reported" (or why it's missing), never shown as zero
 *  - the summary is plain English built from the structured data only
 */

export type Market = "US"; // Malaysia ("MY") comes later, once Bursa's terms are checked

export type LensId = "fundamental" | "thematic" | "events" | "macro" | "forensic";

export type SourceRef = { name: string; url: string; date: string }; // e.g. "10-K filed February 20, 2026"

export type Period = {
  kind: "year" | "date"; // a whole financial year, or a single day (for what it owns and owes)
  start?: string;
  end: string;
};

export type Unit = "currency" | "percent" | "ratio" | "per-share";

export type Figure =
  | {
      status: "reported";
      value: number;
      unit: Unit;
      currency: string; // "USD" for every US filer Fathom covers
      period: Period;
      sources: SourceRef[];
    }
  | {
      status: "not-reported" | "not-comparable" | "needs-price";
      reason: string; // in plain words, shown to the reader
    };

export type LensMeta = {
  company: string;
  ticker: string;
  currency: string;
  accountingStandard: "US GAAP";
  fiscalYearEnd?: string; // "MMDD"
  sector?: string; // Fathom's plain sector name
  industry?: string;
};

export type LensResult<T> = {
  lens: LensId;
  ticker: string;
  market: Market;
  meta: LensMeta;
  data: T;
  sources: SourceRef[];
  updatedAt: string; // when Fathom built this result
  summary: string[]; // plain-English sentences built from `data`
};

export type Lens<T> = {
  id: LensId;
  run(ticker: string, market: Market): Promise<LensResult<T> | null>;
};
