// POST confirmSchema → verify the emailed code, re-check the slot is
// free, store the booking, and email both parties the Meet link + an
// .ics invite. No DB, no Google API.
import { NextResponse } from "next/server";
import {
  BOOKING,
  buildIcs,
  confirmSchema,
  isBookingConfigured,
  isValidSlot,
  meetUrl,
  verifyCode,
  type BookingRecord,
} from "@/lib/booking";
import { appendBooking, readTakenSlots } from "@/lib/blob";
import { FROM_EMAIL, NOTIFY_EMAIL, getResend } from "@/lib/resend";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 422 });
  }
  const { name, email, code, token, startUtc, service, note, website } = parsed.data;
  if (website) return NextResponse.json({ ok: true }); // honeypot

  // 0. Without the secret, verifyCode() cannot distinguish a real token from a
  // forged one in any meaningful way, so say so plainly instead of returning
  // bad_code and sending the visitor round the loop again.
  if (!isBookingConfigured()) {
    console.error(
      "[book/confirm] BOOKING_HMAC_SECRET is not set; refusing to confirm.",
    );
    return NextResponse.json({ error: "booking_unavailable" }, { status: 503 });
  }

  // 1. Verify the email actually owns the code.
  if (!verifyCode(email, code, token)) {
    return NextResponse.json({ error: "bad_code" }, { status: 401 });
  }

  // 2. Slot must be a real, current slot and still free.
  if (!isValidSlot(startUtc)) {
    return NextResponse.json({ error: "slot_unavailable" }, { status: 409 });
  }
  const taken = await readTakenSlots().catch((): string[] => []);
  if (taken.includes(startUtc)) {
    return NextResponse.json({ error: "slot_taken" }, { status: 409 });
  }

  // 3. Persist.
  const record: BookingRecord = {
    id: `bk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    name,
    email,
    startUtc,
    service,
    note,
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
  };
  await appendBooking(record).catch(() => null);

  // 4. Notify both parties (best-effort) with the Meet link + .ics.
  const link = meetUrl();
  const when = new Date(startUtc);
  const whenPretty = `${when.toUTCString()} (UTC) · ${BOOKING.durationMin} min`;
  const ics = buildIcs({
    startUtc,
    name,
    email,
    meetUrl: link,
    summary: "Gravixar — project call with Qamar",
    description: `30-minute call.\nJoin: ${link}\n${service ? `Topic: ${service}\n` : ""}${note ? `Notes: ${note}` : ""}`,
  });
  const icsAttachment = [
    { filename: "gravixar-call.ics", content: Buffer.from(ics).toString("base64") },
  ];

  const resend = getResend();
  if (resend) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: "Your call with Gravixar is booked",
        text: [
          `Hi ${name.split(" ")[0]},`,
          ``,
          `You're booked for a 30-minute call with Qamar.`,
          `When: ${whenPretty}`,
          `Join (Google Meet): ${link}`,
          ``,
          `${service ? `Topic: ${service}\n` : ""}The calendar invite is attached. See you then.`,
          ``,
          `— Gravixar`,
        ].join("\n"),
        attachments: icsAttachment,
      });
      await resend.emails.send({
        from: FROM_EMAIL,
        to: NOTIFY_EMAIL,
        subject: `New call booked · ${name}${service ? ` · ${service}` : ""}`,
        text: [
          `New booking:`,
          `Name:   ${name}`,
          `Email:  ${email}`,
          `When:   ${whenPretty}`,
          `Service:${service ?? "—"}`,
          `Note:   ${note ?? "—"}`,
          `Meet:   ${link}`,
        ].join("\n"),
        attachments: icsAttachment,
      });
    } catch {
      // booking is stored; email failure shouldn't fail the request
    }
  }

  return NextResponse.json({ ok: true, startUtc, meetUrl: link });
}
