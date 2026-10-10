// POST /api/ops-leak-calculator: the calculator's "email me the breakdown".
// Validate, recompute from the inputs, store the lead, email the visitor a PDF.
//
// The lead is written as a service inquiry (sourcePage "/ops-leak-calculator",
// source "calculator" or "calculator:<channel>"), so HQ's sync-leads cron picks
// it up from the prefix it already reads, with no change on HQ's side. The
// message is a plain summary of what the visitor entered.
//
// BotID BLOCKS here, as on /api/book/request-code and unlike the other lead
// routes: this one sends an email, with an attachment, to an address someone
// typed. That is the weaponizable side effect (an open relay on the booking
// route was once used to mail unrelated inboxes), so a flagged request gets
// the silent success and no send. The PDF and the email also carry nothing
// the visitor wrote, only computed figures and fixed copy, so even a send that
// gets through is useless as spam.
//
// The visitor's email is the one side effect that must work: when it fails
// they are told (502), and the lead is still stored so it can be followed up
// by hand. The notification and the store are best-effort, as on every route.

import { NextResponse } from "next/server";
import { checkBotId } from "botid/server";
import { randomUUID } from "node:crypto";
import { checkAntiBot } from "@gravixar-sv/core/antibot";
import { gateFieldsFromJson } from "@/lib/form-gate";
import { CALCULATOR_PATH, calculatorRequestSchema, compute, money, summarise } from "@/lib/ops-leak";
import { renderBreakdownPdf } from "@/lib/ops-leak-pdf";
import type { ServiceInquiryRecord } from "@/lib/service-inquiry";
import { FROM_EMAIL, NOTIFY_EMAIL, getResend } from "@/lib/resend";
import { appendServiceInquiry } from "@/lib/blob";
import { SITE } from "@/lib/seo";
import ServiceInquiryEmail from "../../../../emails/ServiceInquiryEmail";
import OpsLeakBreakdownEmail from "../../../../emails/OpsLeakBreakdownEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "ops-leak-calculator";

export async function POST(req: Request) {
  const bot = await checkBotId();

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // The anti-bot gate BEFORE the schema, silent on a trip (src/lib/form-gate.ts).
  const fields = gateFieldsFromJson(payload);
  const honeypot =
    fields.hp_website !== undefined && fields.hp_website !== "" ? fields.hp_website : fields.website;
  const gate = checkAntiBot({ hp_website: honeypot, ts: fields.ts, te: fields.te }, bot, { botIdBlocks: true });
  if (!gate.ok) {
    console.warn(`[${ROUTE}] anti-bot gate tripped: ${gate.reason}`);
    return NextResponse.json({ ok: true });
  }

  const parsed = calculatorRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }
  const { inputs, name, email, company, source } = parsed.data;

  const result = compute(inputs);
  const range = `${money(result.low, inputs.currency)} to ${money(result.high, inputs.currency)} a month`;

  const record: ServiceInquiryRecord = {
    name,
    email,
    company,
    message: summarise(inputs, result),
    sourcePage: CALCULATOR_PATH,
    source: source ?? "calculator",
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  };

  const resend = getResend();

  // Best-effort: the store and the note to me.
  const sideEffects: Promise<unknown>[] = [appendServiceInquiry(record)];
  if (resend) {
    sideEffects.push(
      resend.emails
        .send({
          from: FROM_EMAIL,
          to: NOTIFY_EMAIL,
          replyTo: record.email,
          subject: `Calculator: ${record.name}${record.company ? ` (${record.company})` : ""}, ${range}`,
          react: ServiceInquiryEmail({
            name: record.name,
            email: record.email,
            company: record.company,
            message: record.message,
            sourcePage: record.sourcePage,
            source: record.source,
            receivedAt: record.createdAt,
          }),
        })
        .then(({ error }) => {
          if (error) throw new Error(`notify: ${error.name}: ${error.message}`);
        }),
    );
  }

  // The one that must work: the visitor's PDF. Resend's SDK RETURNS
  // `{ error }` on a failed send rather than throwing, so read it.
  let failure: string | null = null;
  if (!resend) {
    failure = "email_unavailable";
  } else {
    try {
      const pdf = await renderBreakdownPdf(inputs, new Date(record.createdAt));
      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        replyTo: NOTIFY_EMAIL,
        subject: `Your Ops Leak estimate: ${range}`,
        react: OpsLeakBreakdownEmail({ range, auditUrl: `${SITE.url}/services/ops-leak-audit` }),
        attachments: [{ filename: "ops-leak-estimate.pdf", content: Buffer.from(pdf) }],
      });
      if (error) failure = `${error.name}: ${error.message}`;
    } catch (err) {
      failure = err instanceof Error ? err.message : String(err);
    }
  }

  const results = await Promise.allSettled(sideEffects);
  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) => String(r.reason));
  if (errors.length > 0) console.error(`[${ROUTE}] partial side-effect failure:`, errors);

  if (failure) {
    // No address in the log line: the visitor's email is personal data.
    console.error(`[${ROUTE}] breakdown email not sent: ${failure}`);
    return NextResponse.json(
      { error: failure === "email_unavailable" ? "email_unavailable" : "send_failed" },
      { status: failure === "email_unavailable" ? 503 : 502 },
    );
  }

  return NextResponse.json({ ok: true, id: record.id });
}
