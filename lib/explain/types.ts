/**
 * The shape of an AI-written explanation, and the rules every part must follow.
 *
 * Each claim must say which section of which report it came from, and include a
 * short quote copied exactly from that section. The checker throws away any
 * claim whose quote can't be found word-for-word in the report.
 */
import { z } from "zod";

/** The parts of the reports the AI is allowed to read. */
export type SourceSection = {
  id: string; // e.g. "10-K Item 1A"
  title: string; // e.g. "Risk Factors"
  form: string; // "10-K" or "10-Q"
  filingDate: string;
  url: string; // the filing document
  text: string;
};

export const ClaimSchema = z.object({
  text: z.string(),
  section: z.string(),
  quote: z.string(),
});

/** Topics the AI fills in. Each is a list of claims; an empty list means "the report doesn't say". */
export const TOPICS = {
  whatItDoes: "What the company does",
  howItMakesMoney: "How it makes money",
  competitiveEdge: "What the company says gives it an edge",
  marketPosition: "Where it says it stands in its industry",
  industryTrends: "Trends in its industry",
  demandDrivers: "What drives demand",
  biggestRisks: "Key risks the company highlights",
  newRisks: "New or changed risks in the latest quarterly report",
  outlook: "What management expects",
  upcoming: "What the company says is coming up",
} as const;

export type TopicId = keyof typeof TOPICS;

export const ExplanationSchema = z.object(
  Object.fromEntries(Object.keys(TOPICS).map((k) => [k, z.array(ClaimSchema).default([])])) as Record<
    TopicId,
    z.ZodDefault<z.ZodArray<typeof ClaimSchema>>
  >,
);

export type RawClaim = z.infer<typeof ClaimSchema>;

/** A claim that passed every check, with a link to where it came from. */
export type CheckedClaim = {
  text: string;
  quote: string;
  source: { label: string; url: string; section: string };
};

export type SavedExplanation = {
  ticker: string;
  generatedAt: string;
  model: string;
  sources: { id: string; form: string; filingDate: string; url: string }[];
  topics: Record<TopicId, CheckedClaim[]>;
  dropped: { topic: string; reason: string; text: string; quote?: string }[]; // claims that failed the checks, kept for review
};

/** The longest each topic may be, so pages stay readable. */
export const MAX_CLAIMS: Record<TopicId, number> = {
  whatItDoes: 3,
  howItMakesMoney: 4,
  competitiveEdge: 4,
  marketPosition: 3,
  industryTrends: 4,
  demandDrivers: 3,
  biggestRisks: 5,
  newRisks: 4,
  outlook: 3,
  upcoming: 3,
};
