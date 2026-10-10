// The Ops Leak calculator's model: what it asks, the arithmetic, and the rules
// a submission has to pass. One file because three places read it and must
// agree to the unit: the page (live result), the PDF (the same rows on paper)
// and the route (which recomputes from the inputs and never trusts a total
// sent by the browser).
//
// EVERY OUTPUT IS AN ESTIMATE, from the visitor's own numbers. Nothing here is
// a published figure, which is why the calculator says so beside the result,
// in the PDF and in the email. The audit is the thing that counts; this only
// shows whether counting is worth it.
//
// The rows read like the audit report's (src/components/services/LeakExample.tsx):
// workflow, who, hours a week, where the number came from, cost a month. Each
// row rounds to 10, and the total is the sum of the rounded rows, so the
// column adds up for anyone checking it by hand.

import { z } from "zod";

export const WEEKS_PER_MONTH = 52 / 12;

export const CURRENCIES = {
  USD: { label: "US dollars", locale: "en-US", defaultRate: 40 },
  GBP: { label: "Pounds", locale: "en-GB", defaultRate: 35 },
  AED: { label: "Dirhams", locale: "en-AE", defaultRate: 150 },
} as const;
export type Currency = keyof typeof CURRENCIES;
export const CURRENCY_CODES = Object.keys(CURRENCIES) as Currency[];

// The four places the audit most often finds the hours. `audit` is what the
// audit does instead of asking for a guess, in the audit page's own method
// (interviews, a screen recording of the work, each count tied to its source).
export const LEAKS = [
  {
    key: "status",
    label: "Status reports and client updates put together by hand",
    short: "Status reports by hand",
    audit: "Records one real reporting cycle and counts every person who touches it, and for how long.",
  },
  {
    key: "approvals",
    label: "Chasing approvals and sign-offs across email and chat",
    short: "Chasing approvals",
    audit: "Traces a week of approvals through email and chat, and times the waiting as well as the work.",
  },
  {
    key: "rekeying",
    label: "Typing the same information into a second tool",
    short: "Typing it in twice",
    audit: "Watches the hand-off between the tools on a recording and counts every field typed twice.",
  },
  {
    key: "searching",
    label: "Looking for files, briefs and the latest version",
    short: "Looking for files",
    audit: "Counts the searches in a recorded working day, how long each took, and where the file was in the end.",
  },
] as const;
export type LeakKey = (typeof LEAKS)[number]["key"];

// The tools the work runs on. A fixed list on purpose: these names travel into
// a PDF emailed to an address the visitor typed, and nothing free-text does.
export const TOOLS = [
  "monday.com",
  "Asana",
  "ClickUp",
  "Notion",
  "Jira",
  "HubSpot",
  "Slack",
  "Microsoft Teams",
  "Google Drive",
  "SharePoint",
  "Dropbox",
  "Xero",
  "QuickBooks",
  "Spreadsheets",
] as const;

// A 12-person example team, so the result has numbers in it on arrival. The
// page says these are an example and asks for the visitor's own.
export const EXAMPLE: CalcInput = {
  teamSize: 12,
  tools: [],
  leaks: {
    status: { people: 3, hours: 2 },
    approvals: { people: 2, hours: 3 },
    rekeying: { people: 2, hours: 2 },
    searching: { people: 12, hours: 1 },
  },
  rate: CURRENCIES.GBP.defaultRate,
  currency: "GBP",
};

const leakInput = z.object({
  people: z.number().int().min(0).max(500),
  // Per person who does it, per week. Above 40 is a full-time job, not a leak.
  hours: z.number().min(0).max(40),
});

export const calcInputSchema = z
  .object({
    teamSize: z.number().int().min(1).max(500),
    tools: z.array(z.enum(TOOLS)).max(TOOLS.length),
    leaks: z.object({
      status: leakInput,
      approvals: leakInput,
      rekeying: leakInput,
      searching: leakInput,
    }),
    rate: z.number().min(1).max(2000),
    currency: z.enum(["USD", "GBP", "AED"]),
  })
  .refine((v) => LEAKS.every((l) => v.leaks[l.key].people <= v.teamSize), {
    message: "More people on a leak than on the team.",
    path: ["leaks"],
  });
export type CalcInput = z.infer<typeof calcInputSchema>;

// What the breakdown form posts to /api/ops-leak-calculator. The name and
// company go to HQ with the lead and never into the PDF or the visitor's email.
export const calculatorRequestSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(160),
  company: z.string().max(160).optional(),
  inputs: calcInputSchema,
  // Honeypot, must be empty. Bots fill every input.
  website: z.string().max(0).optional(),
  // "calculator", or "calculator:<channel>" from sourceTag().
  source: z.string().max(80).optional(),
});
export type CalculatorRequest = z.infer<typeof calculatorRequestSchema>;

// The page the lead came from, as HQ shows it beside the lead.
export const CALCULATOR_PATH = "/ops-leak-calculator";

export type LeakRow = {
  key: LeakKey;
  label: string;
  short: string;
  audit: string;
  people: number;
  hoursEach: number;
  weeklyHours: number;
  monthlyCost: number;
};

export type CalcResult = {
  rows: LeakRow[];
  /** The rows with any cost, largest first, at most three. */
  top: LeakRow[];
  weeklyHours: number;
  monthlyCost: number;
  low: number;
  high: number;
};

const round10 = (n: number) => Math.round(n / 10) * 10;

// Two significant figures, so a range never claims more precision than a
// remembered number has: 3,099.75 reads 3,100, not 3,099.
export function roundNice(n: number): number {
  if (n <= 0) return 0;
  if (n < 100) return round10(n);
  const step = 10 ** (Math.floor(Math.log10(n)) - 1);
  return Math.round(n / step) * step;
}

// One decimal at most, so 2.5 hours stays 2.5 and float noise never shows.
const tidy = (n: number) => Math.round(n * 10) / 10;

export function compute(input: CalcInput): CalcResult {
  const rows: LeakRow[] = LEAKS.map((l) => {
    const { people, hours } = input.leaks[l.key];
    const weeklyHours = tidy(people * hours);
    return {
      key: l.key,
      label: l.label,
      short: l.short,
      audit: l.audit,
      people,
      hoursEach: hours,
      weeklyHours,
      monthlyCost: round10(weeklyHours * WEEKS_PER_MONTH * input.rate),
    };
  });
  const monthlyCost = rows.reduce((sum, r) => sum + r.monthlyCost, 0);
  return {
    rows,
    top: rows
      .filter((r) => r.monthlyCost > 0)
      .sort((a, b) => b.monthlyCost - a.monthlyCost)
      .slice(0, 3),
    weeklyHours: tidy(rows.reduce((sum, r) => sum + r.weeklyHours, 0)),
    monthlyCost,
    // A quarter either side, because hours remembered are rough. The page and
    // the PDF both say that this is where the range comes from.
    low: roundNice(monthlyCost * 0.75),
    high: roundNice(monthlyCost * 1.25),
  };
}

export function money(n: number, currency: Currency): string {
  return new Intl.NumberFormat(CURRENCIES[currency].locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  })
    .format(n)
    .replace(/ /g, " ");
}

export const who = (people: number) => `${people} ${people === 1 ? "person" : "people"}`;

/**
 * The plain-text summary that lands in HQ Inbox as the lead's message, so the
 * person following up sees what the visitor entered without opening the PDF.
 */
export function summarise(input: CalcInput, result: CalcResult): string {
  const m = (n: number) => money(n, input.currency);
  const lines = [
    `Ops Leak calculator estimate, from the visitor's own numbers.`,
    `Team of ${input.teamSize}. Hourly cost ${m(input.rate)}.`,
    `Tools: ${input.tools.length ? input.tools.join(", ") : "none ticked"}.`,
    `Estimate ${m(result.low)} to ${m(result.high)} a month (${m(result.monthlyCost)} as entered), ${result.weeklyHours} hours a week.`,
    ...result.rows.map(
      (r) => `${r.short}: ${who(r.people)} x ${r.hoursEach} h = ${r.weeklyHours} h a week, ${m(r.monthlyCost)} a month.`,
    ),
  ];
  return lines.join("\n");
}
