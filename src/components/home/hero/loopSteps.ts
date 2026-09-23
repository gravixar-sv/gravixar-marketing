// The three steps of the approval loop, in ONE place. The hero's approval card
// (ApprovalStrip.tsx, a client component) prints the titles; the "how it
// works" rail (Loop.tsx, a server component) prints the titles and is the one
// place the bodies appear. They used to carry two hand-synced copies with a
// comment asking editors to "edit both or neither". A plain module (no
// "use client") is the only kind both can
// import as data: a const exported from a client module arrives in a server
// component as a client reference, not as the array.
//
// Voice: plain words a non-technical owner can say back after one read on a
// phone. "Write", "stack", "prompt" and "queue" are gone on purpose.
//
// `artifact` is the small machine-output chip the Loop rail shows under each
// step: illustrative, no numbers, no client named.
export const LOOP_STEPS = [
  {
    key: "draft",
    title: "The AI drafts",
    body: "It starts from what is already in your tools, not a blank page.",
    artifact: { state: "draft", detail: "reply to a new inquiry" },
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
