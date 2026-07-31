// POST /api/job-application — careers-funnel lead capture. Accepts
// multipart/form-data (so the CV file rides along) → validate → upload the CV
// to a PRIVATE Blob server-side → optional Resend notification → append a JSONL
// line. The record travels into HQ Inbox as a `LeadKind.JOB_APPLICATION` row
// via /api/cron/sync-leads.
//
// The CV is uploaded server-side (a plain authenticated `put`) rather than via
// a browser client-upload handshake — simpler and reliable. The file must stay
// under CV_MAX_BYTES, which is kept below the serverless body limit.
//
// Behaviour parity with the other lead routes:
// - BotID warn-only until Vercel Bot Protection is enabled
// - Honeypot silent-success so bots don't learn to retry
// - Side-effects best-effort; a missing key skips rather than fails
// - 200 to the visitor as long as we have their data

import { NextResponse } from "next/server";
import { checkBotId } from "botid/server";
import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import {
  jobApplicationSchema,
  CV_CONTENT_TYPES,
  CV_MAX_BYTES,
  type JobApplicationRecord,
} from "@/lib/job-application";
import { FROM_EMAIL, NOTIFY_EMAIL, getResend } from "@/lib/resend";
import { appendJobApplication } from "@/lib/blob";
import { env } from "@/lib/env";
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

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const str = (k: string): string => {
    const v = form.get(k);
    return typeof v === "string" ? v : "";
  };

  // screeningAnswers travels as a JSON string field.
  let screeningAnswers: unknown = undefined;
  const sa = str("screeningAnswers");
  if (sa) {
    try {
      screeningAnswers = JSON.parse(sa);
    } catch {
      // ignore malformed answers rather than reject the application
    }
  }

  const payload = {
    name: str("name"),
    email: str("email"),
    phone: str("phone"),
    company: str("company") || undefined,
    link: str("link") || undefined,
    message: str("message"),
    sourcePage: str("sourcePage"),
    source: str("source") || undefined,
    website: str("website"),
    screeningAnswers,
  };

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

  // CV: validate + upload server-side to a private Blob. Type/size are hard
  // errors (the visitor can fix them); a blob/token failure is non-fatal — the
  // application still goes through without the CV.
  let cvUrl: string | undefined;
  const cv = form.get("cv");
  if (cv instanceof File && cv.size > 0) {
    if (!(CV_CONTENT_TYPES as readonly string[]).includes(cv.type)) {
      return NextResponse.json({ error: "cv_type" }, { status: 400 });
    }
    if (cv.size > CV_MAX_BYTES) {
      return NextResponse.json({ error: "cv_too_large" }, { status: 400 });
    }
    if (env.BLOB_READ_WRITE_TOKEN) {
      try {
        const safe = cv.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80);
        const blob = await put(`job-applications/cv/${safe}`, cv, {
          // PRIVATE. The URL alone grants nothing, so a leaked link is not a
          // leaked CV. This replaces access: "public" + addRandomSuffix, whose
          // only protection was that the URL was hard to guess: it carried no
          // authentication and never expired, so anyone who came across one
          // could read the CV forever, and HQ's owner gate in front of it was
          // decorative.
          //
          // Requires HQ to READ it correctly, which is why the two shipped as a
          // pair (gravixar-hq #645). head().downloadUrl is NOT a signed URL, it
          // is just the blob URL with ?download=1, so HQ can no longer redirect
          // to it; /api/inbox/leads/[id]/cv now streams the blob server-side
          // with the read-write token. Merge HQ first.
          //
          // addRandomSuffix stays: it keeps filenames unique so two applicants
          // named cv.pdf do not collide. It is no longer load-bearing security.
          access: "private",
          addRandomSuffix: true,
          contentType: cv.type,
          token: env.BLOB_READ_WRITE_TOKEN,
        });
        cvUrl = blob.url;
      } catch (err) {
        console.error("[job-application] CV upload failed:", err);
      }
    }
  }

  const record: JobApplicationRecord = {
    ...parsed.data,
    cvUrl,
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
          phone: record.phone,
          company: record.company,
          message: record.message,
          sourcePage: record.sourcePage,
          link: record.link,
          cvUrl: record.cvUrl,
          screeningAnswers: record.screeningAnswers,
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
