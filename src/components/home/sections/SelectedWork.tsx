import Link from "next/link";
import type { CaseStudy, HomeBlock } from "@/content/schema";
import { Arrow } from "@/components/ui/Button";
import { Proof } from "../Proof";

// SELECTED WORK: what the work did, not what it could do. The demos further
// down are sample data; these rows are real engagements, each told in one
// sentence of outcome (`homeLine` in the case study's frontmatter, a
// compression of what the study already says, never a new claim).
//
// Rows, not cards. An outcome sentence is the content, so it is set in display
// type on the canvas with hairlines between, and the whole row is the link.
//
// WHICH THREE. loadCaseStudies already returns the curated order, so this takes
// the first three that carry a homeLine AND whose free-form `period` reads as
// still running ("Since 2022", "Live since June 2026", "Sep 2021 to present")
// and not as finished ("Handed off", "delivered"). The heading promises work
// that is running right now, and that filter is what keeps the promise true if
// a delivered, wound-down study ever gets a homeLine and a low order. A period
// reworded into terms this does not know drops the study off the homepage
// rather than claiming it as live.
//
// ONE STATEMENT, ONE CAPTION ROW. The heading is a single ivory statement; the
// count of what follows and the way out to every study sit together in one
// caption row on the list's top hairline, so the act has one footnote line
// above the rows and one (the client rail and the ledger) below them.
//
// HOVER. The row's top hairline brightens from the left in ivory, 240ms on
// transform only. It is not coral: coral marks a human decision on this site,
// and a hover is not one. Keyboard focus gets the global coral ring and
// nothing else, so the focused row carries one signal, not two.
//
// No view-transition name on the row text. The case-study page morphs its h1
// from the study TITLE, and these rows show the homeLine, a different
// sentence, so a shared name here would morph one sentence into another.
const ROWS = 3;
const RUNNING = /\b(present|live|since|ongoing|current|in daily use)\b/i;
const FINISHED = /\b(handed off|delivered|wound down|ended|completed|archived)\b/i;
const COUNT_WORDS = ["", "One", "Two", "Three"] as const;

function isLive(study: CaseStudy) {
  return RUNNING.test(study.period) && !FINISHED.test(study.period);
}

// A hyphenated compound ("4-year") never breaks at its hyphen. The client
// caption is a narrow column, and text-wrap: pretty will split a compound to
// avoid a one-word last line, which printed "4-" at the end of a line on
// phones.
function keepCompounds(text: string) {
  return text
    .split(/(\S+-\S+)/)
    .map((part, i) => (i % 2 ? <span key={i} className="whitespace-nowrap">{part}</span> : part));
}

export function SelectedWork({
  studies,
  proof,
}: {
  studies: CaseStudy[];
  proof: { meta: HomeBlock; body: string };
}) {
  const rows = studies.filter((s) => s.homeLine && isLive(s)).slice(0, ROWS);
  if (rows.length === 0) return null;
  const total = studies.length;
  const count = `${COUNT_WORDS[rows.length] ?? rows.length} client ${rows.length === 1 ? "system" : "systems"}`;
  return (
    <section aria-labelledby="selected-work">
      <h2 id="selected-work" className="max-w-[24ch] text-statement text-ink-50">
        Work that is running right now.
      </h2>

      <div className="mt-10 flex min-h-11 items-center justify-between gap-6 md:mt-14">
        <p className="text-caption text-ink-400">{count}</p>
        {total > rows.length ? (
          <Link
            href="/work"
            className="group -my-1 inline-flex min-h-11 items-center gap-2 text-caption text-ink-300 transition-colors hover:text-ink-50"
          >
            <span className="link-draw">All {total} case studies</span>
            <Arrow />
          </Link>
        ) : null}
      </div>

      <ol className="reveal-stagger mt-2 border-b border-line">
        {rows.map((study) => (
          <li key={study.slug}>
            <Link
              href={`/work/${study.slug}`}
              className="group relative grid gap-3 border-t border-line py-7 outline-offset-4 before:absolute before:inset-x-0 before:-top-px before:h-px before:origin-left before:scale-x-0 before:bg-ink-600 before:transition-transform before:duration-[240ms] before:ease-out hover:before:scale-x-100 motion-reduce:before:transition-none md:grid-cols-[220px_minmax(0,1fr)_auto] md:items-baseline md:gap-10 md:py-9"
            >
              <p className="text-caption text-ink-400 transition-colors duration-200 group-hover:text-ink-300 group-focus-visible:text-ink-300">
                {keepCompounds(study.client)}
              </p>
              <h3 className="max-w-[32ch] text-2xl font-semibold leading-[1.15] tracking-[-0.02em] text-ink-200 transition-colors duration-200 ease-out group-hover:text-ink-50 group-focus-visible:text-ink-50 md:text-[2rem]">
                {study.homeLine}
              </h3>
              <span className="inline-flex items-center gap-2 text-caption text-ink-300 transition-colors duration-200 group-hover:text-ink-50 group-focus-visible:text-ink-50 md:justify-self-end">
                <span className="link-draw group-focus-visible:[background-size:100%_1px]">
                  Read the case study
                </span>
                <Arrow />
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <div className="mt-16 md:mt-20">
        <Proof meta={proof.meta} body={proof.body} />
      </div>
    </section>
  );
}
