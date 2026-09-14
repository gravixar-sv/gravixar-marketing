// Small helpers for writing lists into running copy, so a list rendered from
// content reads like a sentence somebody wrote.

/**
 * What goes before item `i` of `n` in a running list: "A", "A and B",
 * "A, B, and C". Oxford comma, per src/lib/ai/gravixar.voice.md.
 */
export function separatorBefore(i: number, n: number): string {
  if (i === 0) return "";
  if (i < n - 1) return ", ";
  return n > 2 ? ", and " : " and ";
}
