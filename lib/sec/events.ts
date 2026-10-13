/**
 * Every 8-K announcement lists "item" codes saying what kind of event it is.
 * These are SEC's official categories, translated into plain English.
 * Source of the categories: SEC Form 8-K General Instructions.
 */
const EVENT_LABELS: Record<string, string> = {
  "1.01": "Signed a major agreement",
  "1.02": "Ended a major agreement",
  "1.03": "Filed for bankruptcy",
  "1.04": "Mine safety issue reported",
  "1.05": "Reported a serious cybersecurity incident",
  "2.01": "Completed buying or selling a business or major assets",
  "2.02": "Shared financial results",
  "2.03": "Took on a major new debt or obligation",
  "2.04": "An event made a debt or obligation come due sooner",
  "2.05": "Announced cost cutting or restructuring",
  "2.06": "Wrote down the value of some assets",
  "3.01": "Received a notice about its stock exchange listing",
  "3.02": "Sold shares without a public offering",
  "3.03": "Changed the rights of shareholders",
  "4.01": "Changed its auditor",
  "4.02": "Said earlier financial statements should no longer be relied on",
  "5.01": "Change in who controls the company",
  "5.02": "Change in its leaders or board",
  "5.03": "Changed its company rules or financial year",
  "5.04": "Temporarily stopped employee trading in its retirement plan",
  "5.05": "Changed its code of ethics",
  "5.06": "Stopped being a shell company",
  "5.07": "Shared shareholder vote results",
  "5.08": "Set a date for shareholders to nominate directors",
  "7.01": "Shared information with investors",
  "8.01": "Announced another event",
};

// 9.01 just means "documents attached", so it is not an event on its own.
const NOT_AN_EVENT = new Set(["9.01"]);

/** Plain-English labels for an 8-K's item codes, skipping attachments-only codes. */
export function describeAnnouncement(items: string[]): string[] {
  return items
    .filter((code) => !NOT_AN_EVENT.has(code))
    .map((code) => EVENT_LABELS[code] ?? "Announced another event");
}
