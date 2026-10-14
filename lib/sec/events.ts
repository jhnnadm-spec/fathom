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

/** Why an announcement of each kind matters to someone studying the company, in one line. */
export const EVENT_WHY: Record<string, string> = {
  "1.01": "A major new contract can change what the company sells, spends or owes.",
  "1.02": "Losing a major agreement can affect future sales or costs.",
  "1.03": "In bankruptcy, lenders are paid before shareholders, who can lose most or all of their investment.",
  "1.04": "Safety problems can lead to fines or stopped operations.",
  "1.05": "A cyber attack can disrupt the business and bring repair costs or legal claims.",
  "2.01": "Buying or selling a business changes what the company owns and how it earns money.",
  "2.02": "New results: figures on this page will update when the full quarterly or annual report is filed.",
  "2.03": "New borrowing adds to what the company owes and the interest it pays.",
  "2.04": "A debt falling due early can put pressure on its cash.",
  "2.05": "Restructuring usually brings one-off costs now, aimed at lower costs later.",
  "2.06": "A write-down lowers profit and the recorded value of what it owns, without any cash being spent.",
  "3.01": "Notices from the stock exchange can come before shares are removed from trading.",
  "3.02": "New shares spread the profit across more shares (dilution).",
  "3.03": "Changes to shareholders' rights affect what owners can vote on or receive.",
  "4.01": "Changing auditor is often routine, but can signal a disagreement about the accounts.",
  "4.02": "The company said earlier financial statements can't be relied on, so past figures may change.",
  "5.01": "A new controlling owner can change the company's direction.",
  "5.02": "New leaders or board members can bring a change in strategy.",
  "5.03": "Changes to the company's rules or the dates of its financial year.",
  "5.04": "A temporary block on employees trading shares in their retirement plan.",
  "5.05": "Changes to the rules its staff and leaders must follow.",
  "5.06": "The company now runs an actual business rather than being an empty shell.",
  "5.07": "How shareholders voted on board members and proposals.",
  "5.08": "Sets the timetable for shareholders to put forward board candidates.",
  "7.01": "Information shared with investors, often a presentation or press release.",
  "8.01": "Another event the company chose to report publicly.",
};

/** Which research step each kind of announcement bears on (one announcement can matter to several). */
const EVENT_STEPS: Record<string, string[]> = {
  "1.01": ["business", "management"],
  "1.02": ["business"],
  "1.03": ["health", "outlook"],
  "1.04": ["outlook"],
  "1.05": ["outlook"],
  "2.01": ["business", "management"],
  "2.02": ["performance", "cash", "health"],
  "2.03": ["health"],
  "2.04": ["health"],
  "2.05": ["performance", "outlook"],
  "2.06": ["performance", "health"],
  "3.01": ["value", "outlook"],
  "3.02": ["value"],
  "3.03": ["value", "management"],
  "4.01": ["management"],
  "4.02": ["management", "performance"],
  "5.01": ["management"],
  "5.02": ["management"],
  "5.03": ["management"],
  "5.05": ["management"],
  "5.07": ["management"],
  "5.08": ["management"],
  "7.01": ["value"],
  "8.01": ["outlook"],
};

export function stepsForEvent(code: string): string[] {
  return EVENT_STEPS[code] ?? [];
}

/** The item codes that are real events (not just "documents attached"). */
export function eventCodes(items: string[]): string[] {
  return items.filter((code) => !NOT_AN_EVENT.has(code));
}
