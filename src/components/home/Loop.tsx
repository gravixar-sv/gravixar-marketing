import { LOOP_STEPS, type LoopStep } from "./hero/loopSteps";
import styles from "./Loop.module.css";

// How it works: the approval loop the hero's card runs, laid out on a rail
// that fills as the reader moves through it and lights each step's node when
// the fill reaches it. The motion carries information (progress through a
// sequence), so it is scroll-linked and linear, and its base state is the
// COMPLETED rail: engines without scroll timelines, print and reduced motion
// all get every node lit. The rail classes (.loop-track, .loop-fill,
// .loop-fill-y, .loop-step, .loop-node) are global, in globals.css, where the
// node ranges are tuned to three equal columns at md.
//
// Colour: the rail and the two machine steps are ink. Only step 2, the human
// decision, lights coral (Loop.module.css), so the one coral node and the one
// coral check in the row mark the same thing.
//
// The steps come from ./hero/loopSteps.ts. This section is the ONE place the
// three explanatory sentences are printed (the hero's panel runs a sample
// task instead of naming the steps), plus a concrete thing to look at under
// each step: the machine-output chip that step produces. Illustrative, no
// numbers.

function Artifact({ step, index }: { step: LoopStep; index: number }) {
  const { state, detail } = step.artifact;
  return (
    <p className="mt-6 inline-flex max-w-full items-center gap-2 rounded-md border border-line bg-surface/60 px-2.5 py-1.5 font-mono text-label-sm text-ink-400">
      {index === 1 ? (
        // The decision is the one coral mark in the row: approval is what
        // coral means on this site.
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0 text-brand">
          <path d="M3 8.5l3.2 3L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full border border-ink-500" />
      )}
      <span className="whitespace-nowrap text-ink-200">{state}</span>
      {detail ? (
        <>
          <span aria-hidden className="text-ink-600">
            ·
          </span>
          <span className="truncate">{detail}</span>
        </>
      ) : null}
    </p>
  );
}

export function Loop() {
  return (
    <section aria-labelledby="loop-title">
      {/* A two-tone statement: the claim in ivory, one plain sentence of
          explanation continuing in the same element, muted. It replaces an
          eyebrow + h2 + paragraph stack that said the same thing three times. */}
      <h2 id="loop-title" className="max-w-[30ch] text-statement font-semibold text-ink-50">
        One loop runs everything.{" "}
        <span className="text-ink-500">Every AI tool I build follows the same three steps.</span>
      </h2>

      <div className="loop-track relative mt-12 md:mt-16">
        {/* The rail. Horizontal from md, vertical in the gutter on phones. */}
        <div aria-hidden className="absolute inset-x-0 top-[5px] hidden h-px bg-line md:block">
          <span className="loop-fill absolute inset-0 origin-left bg-ink-300/50" />
        </div>
        {/* On phones the rail runs on past step 3 and fades out: the loop
            goes round again, it does not end. */}
        <div
          aria-hidden
          className="absolute bottom-0 left-[5px] top-[13px] w-px bg-line [mask-image:linear-gradient(to_bottom,#000_72%,transparent)] md:hidden"
        >
          <span className="loop-fill-y absolute inset-0 origin-top bg-ink-300/50" />
        </div>

        <ol className="grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-10">
          {LOOP_STEPS.map((step, i) => (
            <li key={step.key} className="loop-step relative pl-9 md:pl-0 md:pt-10">
              <span
                aria-hidden
                className={`loop-node ${step.key === "approve" ? "" : styles.machineNode} absolute left-0 top-2 h-[11px] w-[11px] rounded-full border border-line-strong bg-bg md:top-0`}
              />
              <h3 className="text-reference font-semibold text-ink-50">{step.title}</h3>
              <p className="mt-2.5 max-w-[32ch] text-base leading-relaxed text-ink-400">{step.body}</p>
              <Artifact step={step} index={i} />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
