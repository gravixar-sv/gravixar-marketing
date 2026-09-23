// A public figure, printed as it was counted. No roll-up.
//
// This used to roll each number up from zero when it scrolled into view, with
// a watchdog timer so a stalled animation could not leave "17" on screen as
// "11". The stats have since left the fold for one quiet ledger line, where a
// ticker is ambient motion with nothing to earn, and a number that never moves
// cannot be caught mid-roll. So it is a server component that prints the
// value from content/data/system-stats.json, tabular so figures align.
export function StatValue({ value }: { value: string }) {
  return <span className="tabular-nums">{value}</span>;
}
