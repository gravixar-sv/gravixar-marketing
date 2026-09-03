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
import { appendBooking, claimSlot } from "@/lib/blob";
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
  // 3. Build the record, then CLAIM the slot with it. The check-and-write
  // that used to live here (readTakenSlots, inspect the array, append) held
  // nothing between the two awaits, so two confirms could interleave and both
  // succeed, and because the append rewrites the whole month document the
  // loser's row could be erased entirely, re-opening the slot and leaving a
  // confirmed visitor on no record. claimSlot() cannot express that: the
  // store rejects a second write to the same key, so the collision is
  // resolved by the store rather than by timing.
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
  // NOT best-effort. This used to be `.catch(() => null)` followed by an
  // unconditional `ok: true`, so if Blob was unset or having a bad minute the
  // visitor was told their call was booked while the record existed in no
  // system, on no calendar, and in no inbox. Nobody would find out until the
  // meeting did not happen. Storage is the booking; if it did not land, say so
  // and let them try again or use the contact form.
  const claimed = await claimSlot(record);
  if (!claimed) {
    // Either someone got there first or the store refused the write. Both
    // resolve the same way from here, and deliberately so: the caller
    // refreshes the grid and picks again. Guessing "probably free" would be
    // the fail-open an availability check must never do.
    console.warn(`[book/confirm] slot not claimed: ${startUtc}`);
    return NextResponse.json({ error: "slot_taken" }, { status: 409 });
  }

  // The month JSONL is the operator's and HQ's copy, and it is now SECONDARY:
  // the claim above already holds the slot and carries the whole record, so
  // losing a line here cannot re-open a booked slot. Still surfaced, because
  // a booking missing from the inbox is a real problem, just no longer a
  // correctness one.
  try {
    const stored = await appendBooking(record);
    if (!stored) throw new Error("blob unavailable");
  } catch (err) {
    console.error("[book/confirm] claimed but not appended to the month log:", err);
  }

  // 4. Notify both parties (best-effort) with the Meet link + .ics.
  const link = meetUrl();
  const when = new Date(startUtc);
  const whenPretty = `${when.toUTCString()} (UTC) · ${BOOKING.durationMin} min`;
  const ics = buildIcs({
    startUtc,
    name,
    email,
    meetUrl: link,
    summary: "Gravixar: project call with Qamar",
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
          `Gravixar`,
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
          `Service:${service ?? "not specified"}`,
          `Note:   ${note ?? "none"}`,
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
