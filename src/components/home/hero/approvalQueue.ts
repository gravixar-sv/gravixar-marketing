import { PRIORITIES, TASKS, applyOption, freshTask, taskDef, type TaskState } from "./approvalTasks";

// The approval loop as one pure reducer. HeroStage owns it; the panel reads
// the task at the gate from it and the 3D scene reads the queue order, so the
// two can never disagree about what is waiting.
//
//   review     the task at the gate is on the panel, waiting for a decision
//   choosing   "Send back for revision" is open: what should change?
//   sent       just approved: the panel shows where it went, the card leaves
//   returned   just sent back: the panel shows the rewrite, the card arcs to
//              the back of the queue
//   clear      nothing left: "All clear" until new tasks come in
//
// `sent` and `returned` are holds. HeroStage advances them on a timer, so the
// visitor sees the outcome of each click before the next task takes its place.

export type Phase = "review" | "choosing" | "sent" | "returned" | "clear";

export interface QueueStats {
  approved: number;
  /** Send-back events, not tasks: one task sent back twice counts twice. */
  sentBack: number;
  /** Approved tasks that had been rewritten at least once. */
  rewrites: number;
}

export interface QueueState {
  batch: number;
  /** Task ids in queue order. Index 0 is at the gate. */
  order: readonly string[];
  tasks: Readonly<Record<string, TaskState>>;
  phase: Phase;
  /** The task the panel is about: the one at the gate, or the one that just left it. */
  focus: string | null;
  /** Bumps each time a task arrives at the gate, so the panel types its draft out. */
  seq: number;
  /** Bumps each time a revision is applied, so the panel types the changed part in. */
  rewrite: number;
  stats: QueueStats;
}

export type QueueAction =
  | { type: "approve" }
  | { type: "revise" }
  | { type: "cancel" }
  | { type: "choose"; option: string }
  | { type: "advance" }
  | { type: "refill" };

function batchOf(batch: number) {
  // Sorted High to Low at the start; the sample set is already in that order,
  // and a stable sort keeps it that way within a priority.
  const tasks = [...TASKS]
    .sort((a, b) => PRIORITIES[b.priority].level - PRIORITIES[a.priority].level)
    .map((def) => freshTask(def, batch));
  return {
    order: tasks.map((t) => t.id),
    tasks: Object.fromEntries(tasks.map((t) => [t.id, t])) as Record<string, TaskState>,
  };
}

export function initialQueue(): QueueState {
  const { order, tasks } = batchOf(0);
  return {
    batch: 0,
    order,
    tasks,
    phase: "review",
    focus: order[0] ?? null,
    seq: 0,
    rewrite: 0,
    stats: { approved: 0, sentBack: 0, rewrites: 0 },
  };
}

export function queueReducer(state: QueueState, action: QueueAction): QueueState {
  switch (action.type) {
    case "approve": {
      if ((state.phase !== "review" && state.phase !== "choosing") || state.order.length === 0) return state;
      const id = state.order[0]!;
      const task = state.tasks[id]!;
      return {
        ...state,
        order: state.order.slice(1),
        phase: "sent",
        focus: id,
        stats: {
          ...state.stats,
          approved: state.stats.approved + 1,
          rewrites: state.stats.rewrites + (task.version > 1 ? 1 : 0),
        },
      };
    }
    case "revise":
      return state.phase === "review" && state.order.length > 0 ? { ...state, phase: "choosing" } : state;
    case "cancel":
      return state.phase === "choosing" ? { ...state, phase: "review" } : state;
    case "choose": {
      if (state.phase !== "choosing" || state.order.length === 0) return state;
      const id = state.order[0]!;
      const task = state.tasks[id]!;
      const next = applyOption(taskDef(task.key), task, action.option);
      if (next === task) return state;
      return {
        ...state,
        tasks: { ...state.tasks, [id]: next },
        // To the back of the queue.
        order: [...state.order.slice(1), id],
        phase: "returned",
        focus: id,
        rewrite: state.rewrite + 1,
        stats: { ...state.stats, sentBack: state.stats.sentBack + 1 },
      };
    }
    case "advance": {
      if (state.phase !== "sent" && state.phase !== "returned") return state;
      if (state.order.length === 0) return { ...state, phase: "clear", focus: null };
      return { ...state, phase: "review", focus: state.order[0]!, seq: state.seq + 1 };
    }
    case "refill": {
      if (state.phase !== "clear") return state;
      const batch = state.batch + 1;
      const { order, tasks } = batchOf(batch);
      return {
        batch,
        order,
        tasks,
        phase: "review",
        focus: order[0] ?? null,
        seq: state.seq + 1,
        rewrite: state.rewrite,
        stats: { approved: 0, sentBack: 0, rewrites: 0 },
      };
    }
  }
}

/** "6 tasks done. 2 sent back for revision, 2 rewrites approved." */
export function summaryLine({ approved, sentBack, rewrites }: QueueStats): string {
  const done = `${approved} ${approved === 1 ? "task" : "tasks"} done.`;
  if (sentBack === 0) return `${done} Nothing was sent back this round.`;
  return `${done} ${sentBack} sent back for revision, ${rewrites} ${rewrites === 1 ? "rewrite" : "rewrites"} approved.`;
}

/** The line under the summary. The spec's wording when something was sent back. */
export function learningLine({ sentBack }: QueueStats): string {
  return sentBack > 0
    ? "Each time something was sent back, the AI noted why. Those notes shape its next drafts."
    : "When something is sent back, the AI notes why. Those notes shape its next drafts.";
}
