// POST /api/chat/miss — the only thing Bosun ever writes down.
//
// MANDATE CLAUSE 11. One row per conversation, containing the questions Bosun
// could NOT answer and nothing else. No transcript, no answers, no IP, no user
// agent, no id that joins this conversation to a lead, a booking, or another
// conversation. The row is scrubbed before the write, not on read, because a
// redaction step that can be skipped is one that will be.
//
// It is sent once, when the panel closes or the page unloads, rather than per
// turn: a row per turn would be a transcript assembled by other means.
//
// WHY THIS EXISTS AT ALL. It is the entire evidence base for the Phase 2
// decision. Six weeks of real unmatched questions either shows a tail no
// matcher can reach, which is the case for wiring a model, or it shows a list
// of things a pricing page would have answered, which is the case for writing
// the page instead and never wiring one. Without it that call is a guess, and
// the guess costs either an unnecessary integration or a worse site.
//
// Fails open in every direction. A visitor's conversation must never break
// because a log write did not land.

import { NextResponse } from "next/server";
import { z } from "zod";
import { appendChatMiss } from "@/lib/blob";
import { buildMissRecord } from "@/lib/chat/scrub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  sourcePage: z.string().max(120).optional(),
  // Capped hard. This is a backlog signal, not an inbox, and an uncapped array
  // on an unauthenticated endpoint is a storage bill waiting to happen.
  misses: z.array(z.string().min(1).max(600)).min(1).max(12),
  turns: z.number().int().min(1).max(50),
  outcome: z.enum(["none", "handoff_offered", "captured"]),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const parsed = schema.safeParse(body);
  // Silent ok on a malformed beacon. There is no visitor waiting on this
  // response and nothing useful to tell an abuser.
  if (!parsed.success) return NextResponse.json({ ok: true });

  const record = buildMissRecord({
    // Day, not a timestamp. The hour a question was asked identifies a person
    // far better than it informs a content backlog.
    day: new Date().toISOString().slice(0, 10),
    sourcePage: parsed.data.sourcePage ?? "/",
    misses: parsed.data.misses,
    turns: parsed.data.turns,
    outcome: parsed.data.outcome,
  });

  if (record.misses.length === 0) return NextResponse.json({ ok: true });

  try {
    await appendChatMiss(record);
  } catch (err) {
    console.error("[chat/miss] append failed:", err);
  }

  return NextResponse.json({ ok: true });
}
