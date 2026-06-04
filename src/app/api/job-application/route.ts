// POST /api/job-application — careers-funnel lead capture. Mirrors
// /api/service-inquiry structurally: validate → optional Resend notification
// → append to a Vercel Blob JSONL line. The record travels into HQ Inbox as
// a `LeadKind.JOB_APPLICATION` row (sourcePage = "/careers/<slug>", link =
// CV/portfolio) via /api/cron/sync-leads.
//
// Behaviour parity with the other lead routes:
// - BotID warn-only until Vercel Bot Protection is enabled
// - Honeypot silent-success so bots don't learn to retry
// - Both side-effects best-effort, missing keys skip rather than fail
// - 200 to the visitor as long as we have their data in memory

import { NextResponse } from "next/server";
import { checkBotId } from "botid/server";
import { randomUUID } from "node:crypto";
import {
  jobApplicationSchema,
  type JobApplicationRecord,
} from "@/lib/job-application";
import { FROM_EMAIL, NOTIFY_EMAIL, getResend } from "@/lib/resend";
import { appendJobApplication } from "@/lib/blob";
import JobApplicationEmail from "../../../../emails/JobApplicationEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const bot = await checkBotId();
  if (bot.isBot) {
    console.warn(
      "[job-application] botid flagged as bot; warn-only mode, allowing through",
    );
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = jobApplicationSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // Honeypot: silent success.
  if (parsed.data.website && parsed.data.website.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const record: JobApplicationRecord = {
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
        subject: `Job application — ${record.sourcePage} — ${record.name}${record.company ? ` (${record.company})` : ""}`,
        react: JobApplicationEmail({
          name: record.name,
          email: record.email,
          company: record.company,
          message: record.message,
          sourcePage: record.sourcePage,
          link: record.link,
          source: record.source,
          receivedAt: record.createdAt,
        }),
      }),
    );
  }

  tasks.push(appendJobApplication(record));

  const results = await Promise.allSettled(tasks);
  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) => String(r.reason));

  if (errors.length > 0) {
    console.error("[job-application] partial side-effect failure:", errors);
  }

  return NextResponse.json({ ok: true, id: record.id });
}
