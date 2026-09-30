// POST /api/service-inquiry — per-service-page lead capture (Phase 6.B1).
// Mirrors /api/lead structurally: validate → optional Resend notification
// → append to a Vercel Blob JSONL line. The difference is the new
// `sourcePage` field that travels with the record into HQ Inbox as a
// `LeadKind.SERVICE_INQUIRY` row.
//
// Behavior parity with /api/lead:
// - BotID warn-only until Vercel Bot Protection is enabled
// - Anti-bot gate (honeypot, time trap, staleness) before the schema, with a
//   silent success so bots don't learn to retry
// - Both side-effects best-effort, missing keys skip rather than fail
// - 200 to the visitor as long as we have their data in memory
//
// Two callers: ServiceInquiryForm (sends `ts` and `te`) and Bosun's chat
// handoff card, which sends neither time field nor a honeypot, so only BotID
// and the schema see it. Both are optional in the gate, which is why that
// still works.

import { NextResponse } from "next/server";
import { checkBotId } from "botid/server";
import { randomUUID } from "node:crypto";
import { gateFieldsFromJson, gateLeadForm } from "@/lib/form-gate";
import {
  serviceInquirySchema,
  type ServiceInquiryRecord,
} from "@/lib/service-inquiry";
import { FROM_EMAIL, NOTIFY_EMAIL, getResend } from "@/lib/resend";
import { appendServiceInquiry } from "@/lib/blob";
import ServiceInquiryEmail from "../../../../emails/ServiceInquiryEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const bot = await checkBotId();

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Anti-bot gate BEFORE the schema: silent success. See src/lib/form-gate.ts.
  if (!gateLeadForm(gateFieldsFromJson(payload), bot, "service-inquiry").ok) {
    return NextResponse.json({ ok: true });
  }

  const parsed = serviceInquirySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const record: ServiceInquiryRecord = {
    ...parsed.data,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  };

  const tasks: Promise<unknown>[] = [];

  const resend = getResend();
  if (resend) {
    tasks.push(
      resend.emails.send({
        from: FROM_EMAIL,
        to: NOTIFY_EMAIL,
        replyTo: record.email,
        subject: `Service inquiry: ${record.sourcePage}, ${record.name}${record.company ? ` (${record.company})` : ""}`,
        react: ServiceInquiryEmail({
          name: record.name,
          email: record.email,
          company: record.company,
          message: record.message,
          sourcePage: record.sourcePage,
          source: record.source,
          receivedAt: record.createdAt,
        }),
      }),
    );
  }

  tasks.push(appendServiceInquiry(record));

  const results = await Promise.allSettled(tasks);
  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) => String(r.reason));

  if (errors.length > 0) {
    console.error("[service-inquiry] partial side-effect failure:", errors);
  }

  return NextResponse.json({ ok: true, id: record.id });
}
