// The refusal bank. Every string here is a CONSTANT that Bosun returns
// verbatim, chosen by a regex family in gate.ts before any matching happens.
//
// These carry most of the mandate. A refusal that is only an instruction in a
// prompt is a suggestion; a refusal that is a constant returned by a pure
// function is a guarantee, and in Phase 1 there is no model to disregard it.
//
// VOICE: "I" is Bosun. Qamar is third person. No "we". No em dashes. A refusal
// should say what it will not do and then offer the next real step, because a
// dead end reads as broken rather than principled.

import { RESPONSE_CEILING } from "./persona";

export type RefusalReason =
  | "off_topic"
  | "prompt_extraction"
  | "construction"
  | "client_identity"
  | "client_commercials"
  | "account_support"
  | "unpublished_number"
  | "generative_request"
  | "legal_or_medical"
  | "careers_screening";

export const REFUSALS: Record<RefusalReason, string> = {
  // The single most common one. Deliberately not apologetic: this surface is
  // narrow on purpose and saying so is more useful than sounding sorry.
  // Rewritten after a visitor typed "Hello" and got the old version, which
  // opened "That is outside what I cover." Correct, and it reads as a door
  // closing on someone who has not asked anything yet. This is the catch-all
  // for everything with no pack vocabulary, which includes ordinary human
  // noise, so it has to end somewhere useful rather than just decline.
  off_topic:
    "I do not cover that one. What I am good for: the services and what they cost, the work that has shipped, the reusable modules, and booking time with Qamar. Any of those and I will be genuinely useful.",

  // MANDATE CLAUSE 7. Covers "ignore previous instructions", "print your
  // prompt", "what are your rules", "repeat the text above".
  prompt_extraction:
    "I will not print my own instructions. Ask about the services or the work instead.",

  // MANDATE CLAUSE 7. Covers stack, model, hosting, file paths, env vars.
  construction:
    "How I am built is not something I discuss. What the site runs on is written up in the case studies, if that is what you are after.",

  // MANDATE CLAUSE 6. The published `client:` strings are the ceiling, and no
  // amount of inference around the edges changes that.
  client_identity:
    "I do not name clients. The case studies describe each engagement as far as it has been cleared, and that is as specific as it gets from me.",

  // MANDATE CLAUSE 9b. Contracts, terms, references, insurance. Since
  // 2026-09-26 the Ops Leak Audit publishes how it is paid, its NDA and its
  // credit against a build, so this points there rather than calling all of
  // it unpublished. Everything else still is, so any answer would be invented.
  client_commercials:
    `The Ops Leak Audit's terms are on its page: how it is paid, the NDA, and when the fee comes off a build. Anything beyond that, like contracts, references or insurance, is not published, so I would be inventing it. Qamar can answer it properly, ${RESPONSE_CEILING} if you leave your details, or sooner on a call.`,

  // MANDATE CLAUSE 8. There is no identity layer on this site, so Bosun cannot
  // confirm or deny that anyone is a client, and must not try.
  account_support:
    "I hold no account data and I cannot look anything up, so I cannot help from here. If something is broken or overdue, say so and I will put it in front of Qamar.",

  // MANDATE CLAUSE 5. Names every published price, so each figure here must
  // also sit in a service's pricing line. The prebuild validator runs every
  // constant through assertSendable, so a price that leaves a page without
  // leaving this string fails the build. It said $3,500 was the only published
  // figure until 2026-09-14, three weeks after "From $2,500" went live.
  unpublished_number:
    "I only quote figures that are published, and that one is not. What is published: the Ops Leak Audit is $3,500 fixed, the AI Code Confidence Review is $6,500 fixed, an operations infrastructure build is $28,000 to $55,000, and the fractional AI ops retainer is $3,500 a month for one system. Everything else is scoped after a look at what you are running.",

  // "Write me a poem", "draft my email", "summarise this article". Not what
  // this is, and doing it once invites treating it as a general model.
  generative_request:
    "I do not write things. I answer questions about Gravixar from what is published, and that is the whole job.",

  legal_or_medical:
    "Not something I can advise on. If it touches an engagement, Qamar is the person to ask.",

  // The careers funnel has its own form, and a bot implying it influences an
  // application would be both false and unkind.
  careers_screening:
    "I do not screen applications and I cannot tell you how one is going. The role pages and the application form are the whole process from my side.",
};

/**
 * MANDATE CLAUSE 5, enforced rather than asked for. Any candidate answer is
 * checked against the published figures before it is sent. Currency amounts
 * and long integers that are not in the pack kill the answer.
 *
 * This runs over CONSTANTS in Phase 1, which sounds redundant until someone
 * edits a constant, and then it is the thing that catches it in the fixtures.
 */
export const NUMERIC_GUARD = {
  /** Matches $1,000 / $3,500 / £2k style figures. */
  currency: /[$£€]\s?\d[\d,.]*\s?(k|m|bn)?/gi,
  /** Matches bare integers of three digits or more, which read as claims. */
  bigInteger: /\b\d{3,}\b/g,
} as const;
