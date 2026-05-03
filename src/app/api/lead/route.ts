import { NextResponse } from "next/server";
import { checkBotId } from "botid/server";
import { randomUUID } from "node:crypto";
import { leadSchema, type LeadRecord } from "@/lib/lead";
import { FROM_EMAIL, NOTIFY_EMAIL, getResend } from "@/lib/resend";
import { appendLead } from "@/lib/blob";
import LeadInboundEmail from "../../../../emails/LeadInboundEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Bot check first — botid platform headers are populated by the wrapper
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

  const parsed = leadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // Honeypot — silent success so bots don't learn to retry.
  if (parsed.data.website && parsed.data.website.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const record: LeadRecord = {
    ...parsed.data,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  };

  // Both side-effects are best-effort. If a key is missing in this env,
  // skip that step rather than failing the visitor's submission.
  const tasks: Promise<unknown>[] = [];

  const resend = getResend();
  if (resend) {
    tasks.push(
      resend.emails.send({
        from: FROM_EMAIL,
        to: NOTIFY_EMAIL,
        replyTo: record.email,
        subject: `New lead — ${record.name}${record.company ? ` (${record.company})` : ""}`,
        react: LeadInboundEmail({
          name: record.name,
          email: record.email,
          company: record.company,
          message: record.message,
          source: record.source,
          receivedAt: record.createdAt,
        }),
      }),
    );
  }

  tasks.push(appendLead(record));

  const results = await Promise.allSettled(tasks);
  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) => String(r.reason));

  if (errors.length > 0) {
    // Log server-side; visitor still gets a success response since we have
    // their data captured client-side and can replay if needed.
    console.error("[lead] partial side-effect failure:", errors);
  }

  return NextResponse.json({ ok: true, id: record.id });
}
