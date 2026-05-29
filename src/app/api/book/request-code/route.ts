// POST { email, name? } → emails a 6-digit verification code, returns a
// signed token. Stateless: the token (HMAC over email+code+expiry) is
// what proves we issued the code; nothing is stored.
import { NextResponse } from "next/server";
import { z } from "zod";
import { issueCode } from "@/lib/booking";
import { FROM_EMAIL, getResend } from "@/lib/resend";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email().max(160),
  name: z.string().max(120).optional(),
  website: z.string().max(0).optional(), // honeypot
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
  if (parsed.data.website) {
    // honeypot tripped — pretend success, do nothing
    return NextResponse.json({ ok: true, token: "" });
  }

  const { email } = parsed.data;
  const { code, token } = issueCode(email);

  const resend = getResend();
  if (!resend) {
    return NextResponse.json({ error: "email_unavailable" }, { status: 503 });
  }
  try {
    await resend.emails.send({
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
  } catch {
    return NextResponse.json({ error: "send_failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, token });
}
