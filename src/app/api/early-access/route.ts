// Early-access waitlist signup endpoint. Smaller schema than /api/lead
// (email is the only required field), separate Blob log, distinct email
// subject so notifications don't conflict with discovery-call leads.
//
// When the SaaS is ready: this list is the audience for the open-beta
// invite mailer.

import { NextResponse } from "next/server";
import { checkBotId } from "botid/server";
import { randomUUID } from "node:crypto";
import { earlyAccessSchema, type EarlyAccessRecord } from "@/lib/early-access";
import { FROM_EMAIL, NOTIFY_EMAIL, getResend } from "@/lib/resend";
import { appendEarlyAccess } from "@/lib/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Bot check first, botid platform headers are populated by the wrapper
  // in next.config.ts. Locally this is a no-op pass.
  const bot = await checkBotId();
  if (bot.isBot) {
    return NextResponse.json({ error: "blocked" }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = earlyAccessSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // Honeypot, silent success so bots don't learn to retry.
  if (parsed.data.website && parsed.data.website.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const record: EarlyAccessRecord = {
    ...parsed.data,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  };

  // Both side-effects best-effort. Missing keys skip the step rather
  // than failing the visitor's submission.
  const tasks: Promise<unknown>[] = [];

  const resend = getResend();
  if (resend) {
    const subject = `Early-access signup, ${record.email}${record.name ? ` (${record.name})` : ""}`;
    const text = [
      `Email: ${record.email}`,
      record.name ? `Name: ${record.name}` : null,
      record.need ? `Need: ${record.need}` : null,
      record.source ? `Source: ${record.source}` : null,
      `Received: ${record.createdAt}`,
    ]
      .filter(Boolean)
      .join("\n");

    tasks.push(
      resend.emails.send({
        from: FROM_EMAIL,
        to: NOTIFY_EMAIL,
        replyTo: record.email,
        subject,
        text,
      }),
    );
  }

  tasks.push(appendEarlyAccess(record));

  const results = await Promise.allSettled(tasks);
  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) => String(r.reason));

  if (errors.length > 0) {
    console.error("[early-access] partial side-effect failure:", errors);
  }

  return NextResponse.json({ ok: true, id: record.id });
}
