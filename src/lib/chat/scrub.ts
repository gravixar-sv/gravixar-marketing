// MANDATE CLAUSE 11. Bosun never stores a conversation. The only thing that
// is ever persisted is one row per conversation listing the questions it could
// NOT answer, scrubbed first.
//
// Why persist anything at all. The miss log is the entire evidence base for
// deciding whether the model tier in Phase 2 is worth wiring: six weeks of
// real unmatched questions either shows a tail a matcher cannot reach, or it
// shows a list of things a pricing page would have answered. Without it, that
// decision is a guess. It is also the cheapest content backlog on the site,
// because it is written by the people the content is for.
//
// What is deliberately NOT stored: answers, full transcripts, IP addresses,
// user agents, timestamps finer than the day, or anything linking two
// conversations to one person. A miss row should be useless to anyone who
// steals it and still useful to the person writing next month's FAQ.
//
// The scrubber runs BEFORE the write, not on read, because a redaction step
// that can be skipped is a redaction step that will be.

/** Order matters: email before phone, or an email's digits get phone-masked. */
const REDACTIONS: readonly { name: string; re: RegExp; mask: string }[] = [
  { name: "email", re: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, mask: "[email]" },
  {
    name: "url",
    // Visitors paste their own dashboards and staging links. A URL is both
    // identifying and useless for the backlog, so it goes.
    re: /\bhttps?:\/\/\S+/gi,
    mask: "[url]",
  },
  {
    name: "phone",
    // Deliberately greedy across separators: +92 300 1234567, (555) 123-4567.
    re: /(?:\+?\d[\d\s().-]{7,}\d)/g,
    mask: "[phone]",
  },
  {
    name: "digits",
    // Anything else long enough to be an account, invoice or card fragment.
    re: /\b\d{5,}\b/g,
    mask: "[number]",
  },
  {
    name: "secretish",
    // Long opaque tokens. Cheap insurance against a visitor pasting a key.
    re: /\b[A-Za-z0-9_-]{28,}\b/g,
    mask: "[token]",
  },
];

/** Longer than this and it stops being a question and starts being a payload. */
const MAX_MISS_CHARS = 240;

export type ScrubResult = {
  text: string;
  /** Which redaction families fired. Useful for spotting a pattern of pasted PII. */
  redacted: string[];
};

export function scrub(input: string): ScrubResult {
  let text = input.normalize("NFKC").replace(/\s+/g, " ").trim();
  const redacted: string[] = [];

  for (const { name, re, mask } of REDACTIONS) {
    // Fresh lastIndex each pass: these are /g and reused across calls.
    re.lastIndex = 0;
    if (re.test(text)) {
      redacted.push(name);
      re.lastIndex = 0;
      text = text.replace(re, mask);
    }
  }

  if (text.length > MAX_MISS_CHARS) {
    text = `${text.slice(0, MAX_MISS_CHARS)}…`;
  }

  return { text, redacted };
}

/**
 * One row per conversation. `day` rather than a timestamp, because the hour a
 * question was asked identifies a person far better than it informs a backlog.
 * No id that could be joined to a lead, a booking, or another conversation.
 */
export type ChatMissRecord = {
  /** YYYY-MM-DD. Deliberately coarse. */
  day: string;
  /** The page the panel was opened from. Route only, never a query string. */
  sourcePage: string;
  /** Scrubbed questions Bosun could not answer, in order. */
  misses: string[];
  /** Redaction families that fired anywhere in this conversation. */
  redacted: string[];
  /** How many turns the conversation ran. A single integer, not a transcript. */
  turns: number;
  /** Whether it ended in a capture, a booking nudge, or nothing. */
  outcome: "none" | "handoff_offered" | "captured";
};

/** Strips a path to its route, so `/services/x?utm=y#z` cannot smuggle anything. */
export function safeSourcePage(raw: string | undefined): string {
  if (!raw) return "/";
  const path = raw.split("?")[0]?.split("#")[0] ?? "/";
  if (!path.startsWith("/") || path.length > 120) return "/";
  return /^[a-zA-Z0-9/_-]*$/.test(path) ? path : "/";
}

export function buildMissRecord(args: {
  day: string;
  sourcePage: string;
  misses: string[];
  turns: number;
  outcome: ChatMissRecord["outcome"];
}): ChatMissRecord {
  const scrubbed = args.misses.map(scrub);
  return {
    day: args.day,
    sourcePage: safeSourcePage(args.sourcePage),
    misses: scrubbed.map((s) => s.text).filter(Boolean),
    redacted: [...new Set(scrubbed.flatMap((s) => s.redacted))],
    turns: args.turns,
    outcome: args.outcome,
  };
}
