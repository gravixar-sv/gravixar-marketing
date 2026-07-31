// POST /api/chat — Bosun's only thinking endpoint.
//
// PHASE 1 SPENDS NOTHING. There is no model call here, no ANTHROPIC_API_KEY,
// no third party. The gate is a pure function over an in-memory pack, so a
// request costs CPU and nothing else. That is deliberate: it means an
// unmetered public endpoint cannot run up a bill, which is the failure mode a
// chat widget on a small site is most likely to actually suffer.
//
// It also keeps inviolable rule 3 intact rather than carving an exception from
// it. "AI is never in the critical path" is hard to honour for a visible
// widget, because a failed widget is visibly broken in a way a skipped SEO
// draft never was. Resolving it by having no AI in Phase 1 means the load
// bearing layer is deterministic, and when the model is wired in Phase 2 it
// sits at exactly one step of the gate, with this tier as its fallback.
//
// Statelessness is on purpose. The conversation lives in the browser's
// sessionStorage and nothing here is persisted (clause 11). The client sends
// the one piece of state the gate needs, a count of consecutive misses, so the
// second unanswered question can escalate without a server-side session.

import { NextResponse } from "next/server";
import { z } from "zod";
import { classify, assertSendable, DISCLOSURE } from "@/lib/chat/gate";
import { getPack } from "@/lib/chat/pack";
import { BOSUN, DEFAULT_OPENER, OPENERS } from "@/lib/chat/persona";
import { safeSourcePage } from "@/lib/chat/scrub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  message: z.string().min(1).max(600),
  sourcePage: z.string().max(120).optional(),
  // Client-held, so a forged value can only make Bosun escalate sooner, which
  // is the safe direction. Capped so it cannot be used to skip the gate.
  consecutiveMisses: z.number().int().min(0).max(10).optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 422 });
  }

  const pack = await getPack();
  const result = classify(parsed.data.message, pack, {
    consecutiveMisses: parsed.data.consecutiveMisses ?? 0,
  });

  // Last gate before anything reaches a visitor. In Phase 1 every string is a
  // constant or published copy, so this should never fire. If it ever does,
  // something upstream changed and a 500 is the correct outcome: this surface
  // guarantees it cannot say anything unpublished, and a guarantee that fails
  // open is not a guarantee.
  try {
    assertSendable(result.text, pack);
  } catch (err) {
    console.error("[chat] outgoing text rejected by the send filter:", err);
    return NextResponse.json({ error: "unsendable" }, { status: 500 });
  }

  return NextResponse.json({
    kind: result.kind,
    text: result.text,
    href: result.kind === "answer" ? result.href : undefined,
    // MANDATE CLAUSE 4, and it is not cosmetic. The site is written first
    // person as Qamar, so a published answer repeated verbatim says things like
    // "priced per system, after I look at what you are running". Out of Bosun's
    // mouth that "I" reads as Bosun claiming to do the work, which is exactly
    // the impersonation clause 4 forbids. Verbatim quoting is safe for facts
    // and unsafe for voice, so every pack answer is marked as a QUOTE and the
    // client renders it attributed to the page it came from. Bosun's own words
    // are only ever the constants.
    quoted: result.kind === "answer",
    // The client uses these to decide whether to show the capture card, and to
    // know whether this turn counted as a miss worth logging.
    offerCapture:
      result.kind === "escalate" || result.kind === "miss" || result.kind === "route",
    isMiss: result.kind === "miss" || result.kind === "escalate",
  });
}

/** GET returns the opener for a page, so the panel can render before any typing. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const page = safeSourcePage(url.searchParams.get("page") ?? "/");
  // Longest matching prefix, so /services/ai-tooling gets the services opener.
  const key =
    Object.keys(OPENERS)
      .filter((k) => page === k || (k !== "/" && page.startsWith(k)))
      .sort((a, b) => b.length - a.length)[0] ?? null;

  return NextResponse.json({
    name: BOSUN.name,
    label: BOSUN.label,
    pronunciation: BOSUN.pronunciation,
    // MANDATE CLAUSE 3: the disclosure is the first thing said, always, and it
    // is a constant that no code path can skip.
    disclosure: DISCLOSURE,
    opener: key ? OPENERS[key] : DEFAULT_OPENER,
  });
}
