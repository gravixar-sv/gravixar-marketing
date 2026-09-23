// The three steps of the approval loop, as the "how it works" rail
// (Loop.tsx) prints them: titles, the one place the bodies appear, and a
// machine-output chip under each. A plain module (no "use client") so a
// server component can import it as data: a const exported from a client
// module arrives in a server component as a client reference, not the array.
//
// The hero's panel no longer prints these (2026-09-23). It runs one sample
// task at a time through its own four steps (the task, the draft, the
// decision, where it went; ApprovalStrip.tsx), which show the mechanism
// rather than name it, so the two cannot read as the same list twice.
//
// Voice: plain words a non-technical owner can say back after one read on a
// phone. "Write", "stack", "prompt" and "queue" are gone on purpose.
//
// `artifact` is the small machine-output chip the Loop rail shows under each
// step: illustrative, no numbers, no client named. Step 1's detail is NOT the
// hero card's ("reply to a new inquiry"): on a phone the two chips sit about
// one screen apart and read as the same line printed twice. This one is the
// draft the Founder Cockpit demo shows waiting for approval ("Confirm Thursday
// call with the new lead"), cut to fit a 390px phone without truncating.
export const LOOP_STEPS = [
  {
    key: "draft",
    title: "The AI drafts",
    body: "It starts from what is already in your tools, not a blank page.",
    artifact: { state: "draft", detail: "confirm Thursday's call" },
  },
  {
    key: "approve",
    title: "A person approves",
    body: "It waits until the person who answers for it clicks approve.",
    artifact: { state: "approved by you", detail: null },
  },
  {
    key: "sharpen",
    title: "The rules get sharper",
    body: "Each yes tightens the rules the next draft follows.",
    artifact: { state: "rule updated", detail: "next draft uses it" },
  },
] as const;

export type LoopStep = (typeof LOOP_STEPS)[number];
