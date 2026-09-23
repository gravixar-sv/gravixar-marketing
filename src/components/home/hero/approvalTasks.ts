import type { CategoryKey } from "./taskPalette";

// The six sample tasks the hero's approval loop runs, and the small template
// engine behind "Send back for revision". Illustrative sample data, not a
// live system: the panel says so under every state. The names, businesses and
// addresses are the operator's own sample set (2026-09-23 spec).
//
// EVERY DRAFT IS A TEMPLATE WITH NAMED PARTS. A revision option edits exactly
// one part, and that part is what the panel marks as "changed in this
// version". Changes stack: V3 keeps V2's change and adds its own. No option is
// ever a no-op, so a visitor never sees the same text come back for a change:
//   cycle   walks to the next value (Thursday 3pm, Friday 11am, Monday 2pm...)
//   swing   alternates between two directions ("Make it shorter", then
//           "Make it warmer"), each with its own rotating wording
//   toggle  adds a line, then offers to remove it ("Add pricing" becomes
//           "Remove the pricing"); adding it again uses different wording
//   add     adds a line; asked again, it swaps in a different one, and its
//           label says so ("Add hashtags" becomes "Try other hashtags")
//
// Voice: the drafts are written as the business owner who approves them,
// first person, plain words, no dashes. Each V1 fits four lines of the panel
// at its narrowest, and no stack of changes runs past five.

export type PriorityKey = "high" | "medium" | "low";

export const PRIORITIES: Record<PriorityKey, { label: string; level: 1 | 2 | 3 }> = {
  high: { label: "High", level: 3 },
  medium: { label: "Medium", level: 2 },
  low: { label: "Low", level: 1 },
};

type Seg = string | { part: string };

export type TaskOption =
  | { id: string; kind: "cycle"; part: string; label: string; values: readonly string[] }
  | { id: string; kind: "add"; part: string; label: string; again: string; values: readonly string[] }
  | { id: string; kind: "toggle"; part: string; labels: readonly [string, string]; values: readonly string[] }
  | {
      id: string;
      kind: "swing";
      part: string;
      labels: readonly [string, string];
      values: readonly [readonly string[], readonly string[]];
    };

export interface TaskDef {
  key: string;
  name: string;
  category: CategoryKey;
  priority: PriorityKey;
  /** Where it went once approved. `target` is machine output (an address) and prints in mono. */
  done: { text: string; target?: string };
  draft: readonly Seg[];
  /** V1 values for parts that start filled. Parts not listed start empty. */
  initial: Readonly<Record<string, string>>;
  options: readonly [TaskOption, TaskOption, TaskOption];
}

export const TASKS: readonly TaskDef[] = [
  {
    key: "inquiry",
    name: "Reply to a new inquiry",
    category: "email",
    priority: "high",
    done: { text: "Sent to", target: "omar@northbay.co" },
    draft: ["Hi Omar, ", { part: "tone" }, " Can you talk on ", { part: "time" }, "?", { part: "price" }],
    initial: {
      tone: "thanks for asking about a client portal. I'd be glad to show you how it works.",
      time: "Thursday at 3pm",
    },
    options: [
      {
        id: "time",
        kind: "cycle",
        part: "time",
        label: "Suggest another time",
        values: ["Thursday at 3pm", "Friday at 11am", "Monday at 2pm", "Tuesday at 10am", "Wednesday at 4pm", "Friday at 2pm"],
      },
      {
        id: "tone",
        kind: "swing",
        part: "tone",
        labels: ["Make it shorter", "Make it warmer"],
        values: [
          ["thanks for reaching out.", "thanks for getting in touch."],
          [
            "so glad you reached out. A portal sounds like a great fit for your team.",
            "it was lovely to hear from you, and I think a portal would really help.",
          ],
        ],
      },
      {
        id: "price",
        kind: "toggle",
        part: "price",
        labels: ["Add pricing", "Remove the pricing"],
        values: [" Setup starts at $900 with no contract.", " For a team your size, setup is about $900."],
      },
    ],
  },
  {
    key: "intake",
    name: "New intake form received",
    category: "portal",
    priority: "high",
    done: { text: "Client added to the portal" },
    draft: [
      "New intake from Harbor Dental: a booking site for two clinics, budget ",
      { part: "budget" },
      ". Assigned to the ",
      { part: "team" },
      " team.",
      { part: "next" },
    ],
    initial: { budget: "$6,000", team: "web" },
    options: [
      {
        id: "team",
        kind: "cycle",
        part: "team",
        label: "Assign another team",
        values: ["web", "design", "ops", "content", "growth"],
      },
      {
        id: "budget",
        kind: "cycle",
        part: "budget",
        label: "Change the budget",
        values: ["$6,000", "$8,500", "$4,500", "$10,000", "$7,000", "$5,500"],
      },
      {
        id: "next",
        kind: "add",
        part: "next",
        label: "Add a next step",
        again: "Change the next step",
        values: [
          " Next step: book a kickoff call this week.",
          " Next step: send the welcome pack today.",
          " Next step: ask for photos of both clinics.",
        ],
      },
    ],
  },
  {
    key: "invoice",
    name: "Send invoice email",
    category: "email",
    priority: "medium",
    done: { text: "Sent to", target: "sara@lumenstudio.co" },
    draft: [
      "Hi Sara, here is invoice 1042 for September's work. It is due ",
      { part: "due" },
      ".",
      { part: "pay" },
      " ",
      { part: "signoff" },
    ],
    initial: { due: "on 15 October", signoff: "Thanks!" },
    options: [
      {
        id: "due",
        kind: "cycle",
        part: "due",
        label: "Change the due date",
        values: ["on 15 October", "on 30 October", "on 1 November", "within 14 days", "on 20 October", "by the end of October"],
      },
      {
        id: "pay",
        kind: "add",
        part: "pay",
        label: "Add a pay-online link",
        again: "Reword the pay-online line",
        values: [
          " You can pay online with the link below.",
          " There is a link below to pay by card.",
          " Paying online takes a minute with the link below.",
        ],
      },
      {
        id: "signoff",
        kind: "cycle",
        part: "signoff",
        label: "Change the sign-off",
        values: ["Thanks!", "Many thanks.", "Best wishes.", "Thanks again for a great month.", "Kind regards."],
      },
    ],
  },
  {
    key: "followup",
    name: "Follow up a quiet lead",
    category: "email",
    priority: "medium",
    done: { text: "Sent to", target: "bilal@kitebrand.com" },
    draft: ["Hi Bilal, ", { part: "tone" }, " ", { part: "ask" }, { part: "example" }],
    initial: {
      tone: "just checking in on the proposal I sent last week.",
      ask: "Would a quick call on Friday help?",
    },
    options: [
      {
        id: "tone",
        kind: "cycle",
        part: "tone",
        label: "Change the tone",
        values: [
          "just checking in on the proposal I sent last week.",
          "a gentle nudge on last week's proposal, since weeks get busy.",
          "circling back on last week's proposal, no pressure at all.",
          "I wanted to make sure last week's proposal reached you.",
          "a friendly follow-up on the proposal I sent over.",
        ],
      },
      {
        id: "ask",
        kind: "cycle",
        part: "ask",
        label: "Change the ask",
        values: [
          "Would a quick call on Friday help?",
          "Should I hold a start date for you next month?",
          "Is there anything I can answer by email?",
          "Would a smaller first phase be easier?",
          "Can I send a short video walkthrough instead?",
        ],
      },
      {
        id: "example",
        kind: "add",
        part: "example",
        label: "Add a past example",
        again: "Use another example",
        values: [
          " I did the same setup for a retail brand in June.",
          " A studio your size made the same switch this spring.",
          " I can show you one I built for a similar agency.",
        ],
      },
    ],
  },
  {
    key: "product",
    name: "Upload new product",
    category: "website",
    priority: "low",
    done: { text: "Live on the store" },
    draft: [
      { part: "title" },
      ". Hand-thrown stoneware that holds 350ml, glazed in speckled white. ",
      { part: "price" },
      ".",
      { part: "care" },
    ],
    initial: { title: "Speckled Stoneware Mug", price: "$28" },
    options: [
      {
        id: "title",
        kind: "cycle",
        part: "title",
        label: "Rewrite the title",
        values: [
          "Speckled Stoneware Mug",
          "The Everyday Mug in Speckled White",
          "Speckled White Coffee Mug",
          "The Morning Mug, Speckled",
          "Hand-Thrown Speckled Mug",
        ],
      },
      {
        id: "price",
        kind: "cycle",
        part: "price",
        label: "Change the price",
        values: ["$28", "$32", "$26", "$30", "$34"],
      },
      {
        id: "care",
        kind: "add",
        part: "care",
        label: "Add care details",
        again: "Change the care details",
        values: [
          " Safe in the dishwasher and microwave.",
          " Hand wash to keep the glaze bright.",
          " Dishwasher safe, and it stacks neatly.",
        ],
      },
    ],
  },
  {
    key: "update",
    name: "Post weekly update",
    category: "social",
    priority: "low",
    done: { text: "Posted to LinkedIn" },
    draft: [
      { part: "opening" },
      " I moved two clients onto one shared portal, so every update now lives in one place.",
      { part: "question" },
      { part: "tags" },
    ],
    initial: { opening: "Small win this week." },
    options: [
      {
        id: "opening",
        kind: "cycle",
        part: "opening",
        label: "Try a new opening",
        values: [
          "Small win this week.",
          "A quick update from the studio.",
          "One change made a real difference.",
          "Here is something that worked.",
          "Less email, more done.",
        ],
      },
      {
        id: "question",
        kind: "add",
        part: "question",
        label: "End with a question",
        again: "Ask a different question",
        values: [
          " How do you keep clients in the loop?",
          " What would you move into a portal first?",
          " Where do your client updates live today?",
        ],
      },
      {
        id: "tags",
        kind: "add",
        part: "tags",
        label: "Add hashtags",
        again: "Try other hashtags",
        values: [" #ops #smallbusiness", " #clientwork #automation", " #agencylife #ops"],
      },
    ],
  },
];

const BY_KEY: Record<string, TaskDef> = Object.fromEntries(TASKS.map((t) => [t.key, t]));

export function taskDef(key: string): TaskDef {
  const def = BY_KEY[key];
  if (!def) throw new Error(`Unknown approval task: ${key}`);
  return def;
}

/** One task's live state: which version it is on and what each part says now. */
export interface TaskState {
  /** Unique per batch, so a refilled task is a new card, not the old one back. */
  id: string;
  key: string;
  version: number;
  parts: Readonly<Record<string, string>>;
  /** Per option: the index of the value last used (cycles and additions). */
  step: Readonly<Record<string, number>>;
  /** Per toggle or swing option: which of its two labels it shows next. */
  flip: Readonly<Record<string, 0 | 1>>;
  /** The part this version changed; null on V1 and when the change removed a line. */
  changed: string | null;
  /** What the visitor asked for, as the panel quotes it ("suggest another time"). */
  reason: string | null;
}

export function freshTask(def: TaskDef, batch: number): TaskState {
  return {
    id: batch === 0 ? def.key : `${def.key}-${batch}`,
    key: def.key,
    version: 1,
    parts: { ...def.initial },
    step: {},
    flip: {},
    changed: null,
    reason: null,
  };
}

/** The label an option shows right now, given what has already been applied. */
export function optionLabel(opt: TaskOption, st: TaskState): string {
  switch (opt.kind) {
    case "cycle":
      return opt.label;
    case "add":
      return st.parts[opt.part] ? opt.again : opt.label;
    case "toggle":
    case "swing":
      return opt.labels[st.flip[opt.id] ?? 0];
  }
}

const quote = (label: string) => label.charAt(0).toLowerCase() + label.slice(1);

/** Apply one revision option: a new version with exactly one part changed. */
export function applyOption(def: TaskDef, st: TaskState, optionId: string): TaskState {
  const opt = def.options.find((o) => o.id === optionId);
  if (!opt) return st;
  const reason = quote(optionLabel(opt, st));
  const parts = { ...st.parts };
  const step = { ...st.step };
  const flip = { ...st.flip };
  let changed: string | null = opt.part;

  switch (opt.kind) {
    case "cycle": {
      const i = ((step[opt.id] ?? 0) + 1) % opt.values.length;
      step[opt.id] = i;
      parts[opt.part] = opt.values[i]!;
      break;
    }
    case "add": {
      const i = ((step[opt.id] ?? -1) + 1) % opt.values.length;
      step[opt.id] = i;
      parts[opt.part] = opt.values[i]!;
      break;
    }
    case "toggle": {
      if ((flip[opt.id] ?? 0) === 0) {
        const i = ((step[opt.id] ?? -1) + 1) % opt.values.length;
        step[opt.id] = i;
        parts[opt.part] = opt.values[i]!;
        flip[opt.id] = 1;
      } else {
        parts[opt.part] = "";
        flip[opt.id] = 0;
        // Nothing new to mark: the version line says what was removed.
        changed = null;
      }
      break;
    }
    case "swing": {
      const mode = flip[opt.id] ?? 0;
      const list = opt.values[mode];
      const k = `${opt.id}:${mode}`;
      const i = ((step[k] ?? -1) + 1) % list.length;
      step[k] = i;
      parts[opt.part] = list[i]!;
      flip[opt.id] = mode === 0 ? 1 : 0;
      break;
    }
  }

  return { ...st, version: st.version + 1, parts, step, flip, changed, reason };
}

export interface DraftSegment {
  text: string;
  /** Written by this version's change: the panel marks it. */
  changed: boolean;
}

/** The draft as text runs, with the part this version changed split out. */
export function draftSegments(def: TaskDef, st: TaskState): DraftSegment[] {
  const out: DraftSegment[] = [];
  for (const seg of def.draft) {
    const text = typeof seg === "string" ? seg : (st.parts[seg.part] ?? "");
    if (!text) continue;
    const changed = typeof seg !== "string" && seg.part === st.changed;
    const last = out[out.length - 1];
    if (last && last.changed === changed) last.text += text;
    else out.push({ text, changed });
  }
  return out;
}
