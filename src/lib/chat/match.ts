// Lexical matching against the pack. No embeddings, no network, no model.
//
// Two similarity measures, and the max of them wins, because they fail in
// different directions. Token-set Jaccard is strong on paraphrase and blind to
// word order, but it collapses when the visitor uses a different word for the
// same thing. Character-trigram cosine survives typos, plurals and partial
// words, but happily matches unrelated text that shares common letter runs.
// Taking the max means either one can carry a match; taking the average would
// let the weaker one veto a good hit.
//
// THE MARGIN IS THE IMPORTANT PART. A score above the threshold is not enough:
// the winner has to beat the runner-up by a clear gap. Without it, a question
// that sits between two published answers picks one essentially at random, and
// a confidently wrong answer from a surface that claims it only repeats
// published copy is worse than an honest miss. When the margin is not met, the
// query falls through and is logged. Over-refusal is recoverable, and the miss
// log is how it gets fixed. A wrong answer is not recoverable, because nobody
// reports it.

import { tokenize, type Pack, type PackEntry } from "./pack";

/** Below this, no answer. Tuned so a paraphrase lands and a topic shift does not. */
export const MATCH_THRESHOLD = 0.62;

/** The winner must beat the runner-up by this, or Bosun says nothing. */
export const MATCH_MARGIN = 0.08;

export type Match = { entry: PackEntry; score: number };

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  return shared / (a.size + b.size - shared);
}

function trigrams(input: string): Map<string, number> {
  const s = ` ${input.toLowerCase().replace(/\s+/g, " ").trim()} `;
  const out = new Map<string, number>();
  for (let i = 0; i < s.length - 2; i++) {
    const g = s.slice(i, i + 3);
    out.set(g, (out.get(g) ?? 0) + 1);
  }
  return out;
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let dot = 0;
  for (const [g, av] of a) {
    const bv = b.get(g);
    if (bv) dot += av * bv;
  }
  if (dot === 0) return 0;
  let ma = 0;
  for (const v of a.values()) ma += v * v;
  let mb = 0;
  for (const v of b.values()) mb += v * v;
  return dot / (Math.sqrt(ma) * Math.sqrt(mb));
}

function scoreAgainst(
  queryTokens: Set<string>,
  queryGrams: Map<string, number>,
  candidate: string,
): number {
  const t = new Set(tokenize(candidate));
  const g = trigrams(candidate);
  return Math.max(jaccard(queryTokens, t), cosine(queryGrams, g));
}

/**
 * Scores the query against every entry's question and aliases. Answers are NOT
 * scored: an answer is long published prose and matching against it rewards
 * length rather than relevance, which is how a matcher ends up confidently
 * returning the wordiest entry in the bank for everything.
 */
export function bestMatch(
  query: string,
  pack: Pack,
): { best: Match | null; runnerUpScore: number; margin: number } {
  const qTokens = new Set(tokenize(query));
  const qGrams = trigrams(query);
  if (qTokens.size === 0) return { best: null, runnerUpScore: 0, margin: 0 };

  let best: Match | null = null;
  let runnerUpScore = 0;

  for (const entry of pack.entries) {
    let score = scoreAgainst(qTokens, qGrams, entry.question);
    for (const alias of entry.aliases) {
      const s = scoreAgainst(qTokens, qGrams, alias);
      if (s > score) score = s;
    }

    if (!best || score > best.score) {
      // Entries from the same source answering the same thing should not count
      // as rivals, or a service's own three entries would veto each other.
      if (best && sourceOf(best.entry.id) !== sourceOf(entry.id)) {
        runnerUpScore = best.score;
      }
      best = { entry, score };
    } else if (score > runnerUpScore && best && sourceOf(entry.id) !== sourceOf(best.entry.id)) {
      runnerUpScore = score;
    }
  }

  const margin = best ? best.score - runnerUpScore : 0;
  return { best, runnerUpScore, margin };
}

/** `service:managed-services:cost` -> `service:managed-services`. */
function sourceOf(id: string): string {
  return id.split(":").slice(0, 2).join(":");
}

/** The full decision, threshold and margin together. */
export function confidentMatch(query: string, pack: Pack): Match | null {
  const { best, margin } = bestMatch(query, pack);
  if (!best) return null;
  if (best.score < MATCH_THRESHOLD) return null;
  if (margin < MATCH_MARGIN) return null;
  return best;
}

/**
 * MANDATE CLAUSE 1's cheapest half. If a query shares no vocabulary at all
 * with the pack, it is not about Gravixar and never reaches the matcher.
 */
export function isInDomain(query: string, pack: Pack): boolean {
  const tokens = tokenize(query);
  if (tokens.length === 0) return false;
  return tokens.some((t) => pack.terms.has(t));
}
