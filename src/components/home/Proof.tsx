import type { HomeBlock, SystemStat } from "@/content/schema";
import systemStats from "../../../content/data/system-stats.json";
import { Clients } from "./Clients";

// The caption under Selected work: who the work was for, as a logo rail, and
// one ledger line of counted figures. It is a caption, not a section, so it
// has no heading of its own: the rows above are the argument and this is the
// footnote that says how wide the range is.
//
// THE LEDGER LINE IS READ, NEVER TYPED. Every value and the date come from
// content/data/system-stats.json, where each figure carries its source and the
// day it was counted, and the prebuild validator fails the build once that
// date goes stale. Only the wording around each number lives here, keyed by
// stat key. The JSON's own labels are written for a dashboard ("automated jobs
// in HQ"), and HQ means nothing to a visitor, so this line says what the
// number is instead, in the nav's own words ("the building blocks I reuse
// across builds"), because "modules" and "scheduled jobs" are engineering
// terms a non-technical owner skims past. A key missing from the JSON drops
// its phrase rather than printing a hole.
//
// Static on purpose. The old hero rolled these up from zero, which made
// audited figures read like a gimmick; here they sit still under a date.
const LEDGER: { key: string; phrase: (value: string) => string }[] = [
  { key: "modules-built", phrase: (v) => `${v} building blocks built` },
  { key: "modules-reused", phrase: (v) => `${v} of them reused across products` },
  { key: "automated-jobs", phrase: (v) => `${v} automated jobs running my own business` },
];

function formatCounted(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

function ledgerLine(): string | null {
  const stats = systemStats.stats as SystemStat[];
  const used = LEDGER.flatMap(({ key, phrase }) => {
    const stat = stats.find((s) => s.key === key);
    return stat ? [{ stat, text: phrase(stat.value) }] : [];
  });
  if (used.length === 0) return null;
  // The oldest date among the figures shown, so the line never claims a
  // fresher count than its stalest number.
  const counted = used
    .map((u) => u.stat.verifiedAt)
    .sort()[0] as string;
  const parts = used.map((u) => u.text);
  const list =
    parts.length > 1
      ? `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`
      : parts[0];
  return `Counted ${formatCounted(counted)}: ${list}.`;
}

export function Proof({ meta, body }: { meta: HomeBlock; body: string }) {
  // The MDX body is one plain sentence, so it renders as text: running it
  // through <MDX> would wrap it in a prose paragraph with its own margins.
  // The label and the range read as ONE left-aligned line (the label as its
  // lead-in), not two captions pushed to opposite edges of the page.
  const range = body.trim();
  const label = meta.title.trim().replace(/[.:]$/, "");
  const ledger = ledgerLine();
  return (
    <div>
      <p className="text-caption text-ink-400">
        <span className="font-medium text-ink-200">{label}.</span>
        {range ? <> {range}</> : null}
      </p>
      <div className="mt-6 md:mt-8">
        <Clients />
      </div>
      {ledger ? (
        <p className="mt-6 border-t border-line-soft pt-5 text-caption text-ink-500 md:mt-8">
          {ledger}
        </p>
      ) : null}
    </div>
  );
}
