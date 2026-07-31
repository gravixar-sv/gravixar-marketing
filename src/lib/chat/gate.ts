// The gate. One pure synchronous function decides what Bosun says. No network,
// no model, no I/O, which is what makes it testable as a table of cases and
// what makes Phase 1 cost nothing to run.
//
// ORDER IS THE DESIGN. Each step can only be reached by failing the one above,
// so the dangerous questions are answered by constants before anything that
// could be clever gets a look at them:
//
//   1. normalise        strip the tricks that make a regex miss
//   2. identity         "are you a bot" answers before anything else
//   3. hard deny        injection, secrets, clients, accounts, off-topic asks
//   4. escalate         the five triggers that must reach a human, not an answer
//   5. match            the published answer bank, threshold AND margin
//   6. route            booking, contact, and the standing "what do you do"
//   7. in-domain        no shared vocabulary at all means not our subject
//   8. miss             say so, log it, offer the two real paths
//
// In Phase 2 the model is wired at step 8 and nowhere else. Everything above
// it stays deterministic, which is the whole reason an Anthropic outage
// degrades this surface rather than breaking it.

import {
  DISCLOSURE,
  HANDOFF,
  IDENTITY_ANSWER,
  BANNED_PROMISES,
  RESPONSE_CEILING,
} from "./persona";
import { REFUSALS, type RefusalReason } from "./refusals";
import { confidentMatch, isInDomain } from "./match";
import { extractFigures, type Pack } from "./pack";

export type EscalationTrigger =
  | "human_request"
  | "commercial_terms"
  | "existing_client"
  | "incident"
  | "repeated_miss";

export type GateResult =
  | { kind: "identity"; text: string }
  | { kind: "refusal"; reason: RefusalReason; text: string }
  | { kind: "escalate"; trigger: EscalationTrigger; text: string }
  | { kind: "answer"; text: string; href: string; entryId: string; score: number }
  | { kind: "route"; route: "booking" | "contact" | "overview"; text: string }
  | { kind: "miss"; text: string };

/** Conversation state the gate needs. Deliberately tiny and not persisted. */
export type GateContext = {
  /** How many consecutive misses have already happened. Drives trigger 5. */
  consecutiveMisses: number;
};

// ---- 1. Normalise ----------------------------------------------------
// Zero-width and bidi characters exist to make "ignore previous instructions"
// survive a regex. Strip them before anything looks at the text, and cap the
// length so a wall of text cannot be used to push a payload past a check.
const MAX_INPUT = 600;

export function normalise(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/[​-‏‪-‮⁦-⁩﻿]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_INPUT);
}

// ---- 2 and 3. The regex families -------------------------------------
// Each family maps to exactly one constant. Kept as data so the fixtures can
// iterate them and so adding a phrasing is a one-line change.

const IDENTITY =
  /\b(are you (a |an )?(real|human|person|bot|ai|robot|machine)|is this (a )?(bot|human|ai|real person)|am i (talking|speaking) (to|with) (a )?(human|person|bot|qamar)|who am i (talking|speaking) to|are you qamar|what are you)\b/i;

// SECURITY denies run before escalation. Nothing about how this thing is built
// is ever worth surfacing, whoever is asking and however they frame it.
const SECURITY_DENY: readonly { reason: RefusalReason; re: RegExp }[] = [
  {
    reason: "prompt_extraction",
    re: /\b(ignore (all )?(previous|prior|above|earlier)|disregard (the )?(above|previous)|system prompt|your (instructions|prompt|rules|directives)|repeat (the )?(text|words) above|print your|reveal your|show me your (prompt|instructions)|jailbreak|developer mode|act as (if|though) you)\b/i,
  },
  {
    reason: "construction",
    re: /\b(what (model|llm|ai) (are|do) you|which (model|llm)|are you (gpt|claude|gemini|llama)|api key|env var|environment variable|what (stack|framework|database) (are|do) you (use|run)|your source code|how were you built|what powers you)\b/i,
  },
];

// CONTENT denies run AFTER escalation, because "my portal is down" is an
// incident that needs a person, not a lecture about holding no account data.
// Order here is a product decision, not a formality: getting it backwards
// sends someone with a real problem away with a refusal.
const CONTENT_DENY: readonly { reason: RefusalReason; re: RegExp }[] = [
  {
    reason: "client_identity",
    // `clients?` matters: the first draft only matched the singular, so the
    // plainest possible version of this question, "who are your clients", sailed
    // past and got a confident answer out of the matcher.
    re: /\b(who (are|is) (your|the) clients?|name (your|the|a) clients?|which compan(y|ies) (do|did|is|was) (you|he|it)|who did (you|he) (build|work) (it |this )?for|clients? list|customer list|who is the (agency|clinic|studio)|real name of)\b/i,
  },
  {
    reason: "account_support",
    re: /\b(my (account|invoice|subscription|login|password)|reset my|log ?in (issue|problem)|can'?t (log ?in|sign in|access)|my (project|portal|dashboard) (is|has)|check my|look up my|order (number|status))\b/i,
  },
  {
    reason: "generative_request",
    re: /\b(write (me|us|a|an)|draft (me|a|an)|compose|generate (a|an|me)|summari[sz]e (this|the following)|translate (this|the)|rewrite (this|the)|give me code|write code|tell me a (joke|story)|poem)\b/i,
  },
  {
    reason: "legal_or_medical",
    re: /\b(legal advice|is it legal|sue|lawsuit|medical advice|diagnos|prescri)\b/i,
  },
  {
    reason: "careers_screening",
    re: /\b(status of my application|did i get the (job|role)|am i shortlisted|why was i rejected|review my (cv|resume)|rate my (cv|resume))\b/i,
  },
];

// ---- 4. Escalation triggers ------------------------------------------
const ESCALATE: readonly { trigger: EscalationTrigger; re: RegExp }[] = [
  {
    // MANDATE CLAUSE 9b. None of this is published anywhere, so the honest move
    // is a person, not a refusal that reads as a door closing.
    trigger: "commercial_terms",
    re: /\b(nda|dpa|baa|msa|sow|contract|terms and conditions|notice period|payment terms|net 30|invoice terms|do you sign|references|referees|insurance|liability|indemnit)\b/i,
  },
  {
    trigger: "human_request",
    re: /\b(speak|talk|chat) (to|with) (a )?(human|person|someone|qamar|him)\b|\b(get|put) me (through|in touch)\b|\breal person\b|\bcall me\b/i,
  },
  {
    // Ahead of existing_client on purpose. "our portal is down" matches both,
    // and the incident copy is the useful one: it asks what is happening and
    // routes it, where the client copy explains what Bosun does not hold.
    trigger: "incident",
    re: /\b(is (down|broken|offline)|not working|stopped working|outage|urgent|emergency|overdue|missed the deadline|nothing is (loading|working))\b/i,
  },
  {
    trigger: "existing_client",
    re: /\b(i am|i'?m|we are|we'?re) (a|an|your|one of your) (client|customer|subscriber)\b|\bmy retainer\b|\bour (portal|instance|deployment)\b/i,
  },
];

// ---- 6. Routing ------------------------------------------------------
const ROUTE_BOOKING =
  /\b(book|schedule|set up|arrange) (a )?(call|meeting|chat|time|slot)\b|\bbook a call\b|\bavailability\b|\bcalendar\b/i;
const ROUTE_OVERVIEW =
  /\b(what do you (do|offer)|what services|what can you (do|help)|how does this work|what is gravixar)\b/i;

export const ROUTE_COPY = {
  booking:
    "Booking is on the site: pick a slot, confirm the email is yours, and it lands in both calendars with a Meet link. The Book a call button in the header is the whole flow.",
  overview:
    "Six services across three tracks. Build: operations infrastructure, AI tooling, brand and visuals. Ongoing: a fractional AI ops lead, and a system audit. Maintain: managed services. Ask what any of them includes and I will quote the page.",
  contact: `Leave your details and Qamar replies ${RESPONSE_CEILING}.`,
} as const;

// ---- The gate ---------------------------------------------------------

export function classify(rawInput: string, pack: Pack, ctx: GateContext): GateResult {
  const input = normalise(rawInput);
  if (!input) return { kind: "miss", text: HANDOFF.offer };

  // 2. Identity, before anything else, always a constant, always free.
  if (IDENTITY.test(input)) return { kind: "identity", text: IDENTITY_ANSWER };

  // 3. Security denies. Nothing outranks these.
  for (const { reason, re } of SECURITY_DENY) {
    if (re.test(input)) return { kind: "refusal", reason, text: REFUSALS[reason] };
  }

  // 4. Escalations, ahead of the content denies so a real problem reaches a
  // person instead of being told what Bosun does not hold.
  for (const { trigger, re } of ESCALATE) {
    if (re.test(input)) {
      return { kind: "escalate", trigger, text: escalationCopy(trigger) };
    }
  }

  // 5. Content denies.
  for (const { reason, re } of CONTENT_DENY) {
    if (re.test(input)) return { kind: "refusal", reason, text: REFUSALS[reason] };
  }

  // 5. The published answer bank.
  const match = confidentMatch(input, pack);
  if (match) {
    return {
      kind: "answer",
      text: match.entry.answer,
      href: match.entry.href,
      entryId: match.entry.id,
      score: match.score,
    };
  }

  // 6. Standing routes. After matching, so a published answer always wins.
  if (ROUTE_BOOKING.test(input)) {
    return { kind: "route", route: "booking", text: ROUTE_COPY.booking };
  }
  if (ROUTE_OVERVIEW.test(input)) {
    return { kind: "route", route: "overview", text: ROUTE_COPY.overview };
  }

  // 7. Not our subject at all.
  if (!isInDomain(input, pack)) {
    return { kind: "refusal", reason: "off_topic", text: REFUSALS.off_topic };
  }

  // 8. In domain, but nothing published answers it. Trigger 5 on the second.
  if (ctx.consecutiveMisses >= 1) {
    return { kind: "escalate", trigger: "repeated_miss", text: escalationCopy("repeated_miss") };
  }
  return { kind: "miss", text: HANDOFF.offer };
}

function escalationCopy(trigger: EscalationTrigger): string {
  switch (trigger) {
    case "human_request":
      return `${HANDOFF.noLiveAgent} Book a slot and it goes straight in his calendar, or leave your details here and he replies ${RESPONSE_CEILING}.`;
    case "existing_client":
      return `If you are already working with Qamar, do not route it through me: I hold no account data and cannot look anything up. Leave a note here and it reaches him ${RESPONSE_CEILING}, or email him directly.`;
    case "incident":
      return `That needs a person, not me. Leave what is happening and your email, and it goes to Qamar ${RESPONSE_CEILING}. If it is genuinely urgent, say so in the note.`;
    case "commercial_terms":
      return REFUSALS.client_commercials;
    case "repeated_miss":
      return `That is the second thing I could not answer, so I will stop guessing at it. ${HANDOFF.offer}`;
  }
}

/**
 * The last check before anything reaches a visitor. Phase 1 only emits
 * constants and published strings, so this should never fire, which is exactly
 * why it is worth having: if it ever does, something upstream changed.
 */
export function assertSendable(text: string, pack: Pack): void {
  if (/[—–]/.test(text)) {
    throw new Error(`[chat] em or en dash in outgoing text: ${text.slice(0, 80)}`);
  }
  // Word boundaries, not substring. "your team" CONTAINS "our team", so a
  // naive includes() rejected four published compare pages on the first run.
  for (const phrase of BANNED_PROMISES) {
    const re = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(text)) {
      throw new Error(`[chat] outgoing text promises a human ("${phrase}"): ${text.slice(0, 80)}`);
    }
  }
  // MANDATE CLAUSE 5: every figure must be one the site already publishes.
  // Same extractor that registered them, or this rejects the site's own copy.
  for (const f of extractFigures(text)) {
    if (!pack.numbers.has(f)) {
      throw new Error(`[chat] unpublished figure "${f}" in outgoing text: ${text.slice(0, 80)}`);
    }
  }
}

export { DISCLOSURE };
