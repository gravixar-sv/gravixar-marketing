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
// - Anti-bot gate (honeypot, time trap, staleness) before the schema, with a
//   silent success so bots don't learn to retry
// - Side-effects best-effort; a missing key skips rather than fails
// - 200 to the visitor as long as we have their data

import { NextResponse } from "next/server";
import { checkBotId } from "botid/server";
import { randomUUID } from "node:crypto";
import { gateFieldsFromForm, gateLeadForm } from "@/lib/form-gate";
import {
  jobApplicationSchema,
  CV_CONTENT_TYPES,
  CV_MAX_BYTES,
  type JobApplicationRecord,
} from "@/lib/job-application";
import { FROM_EMAIL, NOTIFY_EMAIL, getResend } from "@/lib/resend";
import { appendJobApplication } from "@/lib/blob";
import { putPrivateFile } from "@/lib/pii-blob";
import JobApplicationEmail from "../../../../emails/JobApplicationEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const bot = await checkBotId();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  // Anti-bot gate BEFORE the schema and before the CV is touched: silent
  // success. See src/lib/form-gate.ts.
  if (!gateLeadForm(gateFieldsFromForm(form), bot, "job-application").ok) {
    return NextResponse.json({ ok: true });
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

  // CV: validate + upload server-side to a private Blob. Type/size are hard
  // errors (the visitor can fix them); a blob/token failure is non-fatal — the
  // application still goes through without the CV.
  let cvUrl: string | undefined;
  let cvError: string | undefined;
  const cv = form.get("cv");
  if (cv instanceof File && cv.size > 0) {
    if (!(CV_CONTENT_TYPES as readonly string[]).includes(cv.type)) {
      return NextResponse.json({ error: "cv_type" }, { status: 400 });
    }
    if (cv.size > CV_MAX_BYTES) {
      return NextResponse.json({ error: "cv_too_large" }, { status: 400 });
    }
    try {
      const safe = cv.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80);
      // PRIVATE, and into the private store (src/lib/pii-blob.ts). The URL
      // alone grants nothing, so a leaked link is not a leaked CV.
      //
      // From 2026-07-31 this asked the PUBLIC store for a private write, which
      // a public store refuses outright ("Cannot use private access on a
      // public store"), so every CV in that window was dropped. The private
      // store is the fix. HQ's /api/inbox/leads/[id]/cv streams these over
      // OIDC; it shipped first (gravixar-hq #1029). head().downloadUrl is NOT
      // a signed URL, so HQ never redirects to it.
      //
      // addRandomSuffix keeps filenames unique so two applicants named cv.pdf
      // do not collide. It is not load-bearing security.
      const blob = await putPrivateFile(`job-applications/cv/${safe}`, cv, cv.type);
      cvUrl = blob.url;
    } catch (err) {
      // SWALLOWED ON PURPOSE, so an applicant never loses a completed form to
      // a storage fault. It was swallowed SILENTLY until 2026-09-02, and that
      // was the wrong part: a failed upload looked exactly like an applicant
      // who chose not to attach a CV. Now it is logged and the operator's
      // email subject says so.
      cvError = err instanceof Error ? err.message : String(err);
      console.error(`[job-application] done: CV UPLOAD FAILED ${cvError}`);
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
        subject: `${cvError ? "[CV UPLOAD FAILED] " : ""}Job application: ${record.sourcePage}: ${record.name}${record.company ? ` (${record.company})` : ""}`,
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
