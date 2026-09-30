// POST { email, name? } → emails a 6-digit verification code, returns a
// signed token. Stateless: the token (HMAC over email+code+expiry) is
// what proves we issued the code; nothing is stored.
import { NextResponse } from "next/server";
import { checkBotId } from "botid/server";
import { checkAntiBot } from "@gravixar-sv/core/antibot";
import { z } from "zod";
import { isBookingConfigured, issueCode } from "@/lib/booking";
import { FROM_EMAIL, getResend } from "@/lib/resend";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email().max(160),
  name: z.string().max(120).optional(),
  website: z.string().optional(), // legacy honeypot name (cached clients)
  hp_website: z.string().optional(), // fleet honeypot (@gravixar-sv/core/antibot)
  ts: z.number().optional(), // form-render timestamp (time-trap fallback)
  te: z.number().optional(), // ms the form was open, on the browser's clock (time-trap)
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 422 });
  }

  // The fleet anti-bot gate (@gravixar-sv/core/antibot — honeypot + time-trap)
  // combined with the BotID verdict, and BotID BLOCKS here (not warn-only like
  // the lead / early-access / inquiry endpoints). Those only log a lead, so a
  // false-flag just drops one record; this endpoint SENDS AN EMAIL to a
  // caller-supplied address, which is the weaponizable side effect — an
  // unprotected open relay was abused to emit "Your Gravixar verification
  // code" to dozens of unrelated inboxes (~1/hr), burning Resend quota +
  // sender reputation. Silent fake-success on every trip so the abuser gets
  // no signal to adapt against.
  const bot = await checkBotId();
  const gate = checkAntiBot(
    { hp_website: parsed.data.hp_website ?? parsed.data.website, ts: parsed.data.ts, te: parsed.data.te },
    bot,
    { botIdBlocks: true },
  );
  if (!gate.ok) {
    console.warn(`[request-code] anti-bot gate tripped: ${gate.reason}`);
    return NextResponse.json({ ok: true, token: "" });
  }

  // Refuse rather than issue a code the signature cannot vouch for. Same shape
  // as the `email_unavailable` 503 below: a missing operator secret disables
  // the flow, it does not quietly downgrade it.
  if (!isBookingConfigured()) {
    console.error(
      "[request-code] BOOKING_HMAC_SECRET is not set; refusing to issue a code.",
    );
    return NextResponse.json({ error: "booking_unavailable" }, { status: 503 });
  }

  const { email } = parsed.data;
  const { code, token } = issueCode(email);

  const resend = getResend();
  if (!resend) {
    return NextResponse.json({ error: "email_unavailable" }, { status: 503 });
  }
  // The Resend SDK (v6) does NOT throw when a send fails: an API rejection
  // (bad key, unverified domain, quota) and a network failure both come back
  // as `{ data: null, error }`. Until 2026-09-29 this block only caught a
  // throw, so a failed send still answered `{ ok: true, token }` and the
  // visitor waited on the verify step for a code that was never sent. The
  // `error` field is the failure signal; the catch stays for anything that
  // does throw before the request is made.
  let failure: string | null = null;
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Your Gravixar verification code: ${code}`,
      text: [
        `Your code to book a call with Gravixar is:`,
        ``,
        `    ${code}`,
        ``,
        `It expires in 10 minutes. If you didn't request this, ignore this email.`,
      ].join("\n"),
    });
    if (error) failure = `${error.name}: ${error.message}`;
  } catch (err) {
    failure = err instanceof Error ? err.message : String(err);
  }
  if (failure) {
    // No address in the log line: the visitor's email is personal data.
    console.error(`[request-code] verification email not sent: ${failure}`);
    return NextResponse.json({ error: "send_failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, token });
}
