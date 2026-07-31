// Minimal in-house "book a 30-min call" — no cal.com, no database, no
// Google API. Slots are generated from config; email verification is a
// stateless HMAC code (no token storage); a confirmed booking is
// appended to Vercel Blob and both parties get a Resend email with the
// Meet link + an .ics invite.
//
// Operator env:
//   BOOKING_HMAC_SECRET  — signs the verification codes (any long random string)
//   BOOKING_MEET_URL     — a reusable Google Meet room link
//   (Resend + Blob already configured for leads.)

import crypto from "node:crypto";
import { z } from "zod";
import { env } from "@/lib/env";
import { SERVICE_OPTIONS } from "@/lib/services";

export { SERVICE_OPTIONS };

export const BOOKING = {
  durationMin: 30,
  tz: "Asia/Karachi", // PKT, UTC+5, no DST
  tzOffsetHours: 5,
  // Slot start times in PKT, on business days (Mon–Fri).
  pktHours: [15, 17, 19],
  horizonDays: 14,
  maxSlots: 15,
  leadHours: 12, // earliest bookable slot from now
} as const;

export type Slot = {
  /** Slot start, ISO UTC — the stable identifier. */
  startUtc: string;
  /** Server-rendered PKT label as a fallback; client reformats to local TZ. */
  pktLabel: string;
};

// ── Slot generation ────────────────────────────────────────────────

export function generateSlots(takenUtc: string[] = []): Slot[] {
  const taken = new Set(takenUtc);
  const now = Date.now();
  const earliest = now + BOOKING.leadHours * 3600_000;
  const slots: Slot[] = [];

  for (let d = 0; d < BOOKING.horizonDays && slots.length < BOOKING.maxSlots; d++) {
    const day = new Date(now + d * 86_400_000);
    // Determine the PKT weekday: shift to PKT then read UTC day.
    const pkt = new Date(day.getTime() + BOOKING.tzOffsetHours * 3600_000);
    const weekday = pkt.getUTCDay(); // 0 Sun … 6 Sat
    if (weekday === 0 || weekday === 6) continue;

    for (const h of BOOKING.pktHours) {
      // PKT hour h on this PKT date → UTC = h - offset.
      const startUtcMs = Date.UTC(
        pkt.getUTCFullYear(),
        pkt.getUTCMonth(),
        pkt.getUTCDate(),
        h - BOOKING.tzOffsetHours,
        0,
        0,
      );
      if (startUtcMs < earliest) continue;
      const iso = new Date(startUtcMs).toISOString();
      if (taken.has(iso)) continue;
      slots.push({ startUtc: iso, pktLabel: pktLabelFor(startUtcMs) });
      if (slots.length >= BOOKING.maxSlots) break;
    }
  }
  return slots;
}

function pktLabelFor(utcMs: number): string {
  const p = new Date(utcMs + BOOKING.tzOffsetHours * 3600_000);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let h = p.getUTCHours();
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${days[p.getUTCDay()]} ${p.getUTCDate()} ${mon[p.getUTCMonth()]} · ${h}:00${ampm} PKT`;
}

export function isValidSlot(startUtc: string): boolean {
  return generateSlots().some((s) => s.startUtc === startUtc);
}

// ── Stateless email verification code ──────────────────────────────

/** Whether the booking flow can safely sign codes. The routes check this and
 *  return 503 rather than running unauthenticated, matching how an unset
 *  RESEND key already yields `email_unavailable`. */
export function isBookingConfigured(): boolean {
  return Boolean(env.BOOKING_HMAC_SECRET);
}

function hmacSecret(): string {
  const secret = env.BOOKING_HMAC_SECRET;
  if (!secret) {
    // Fail closed. This used to fall back to a constant written in this file,
    // which meant an unset env var still produced signatures that anyone who
    // could read the source could reproduce: forge a token for any address and
    // the emailed 6-digit code stops being proof of anything. An unset secret
    // also deploys green, because every secret in env.ts is optional, so the
    // insecure path was the silent one. Callers gate on isBookingConfigured()
    // and return 503; this throw is the backstop for a future caller that does
    // not. Note verifyCode() swallows throws and returns false, so the failure
    // is closed there too.
    throw new Error("BOOKING_HMAC_SECRET is not set, so booking is disabled.");
  }
  return secret;
}

export type IssuedCode = { code: string; token: string };

/** Issue a 6-digit code + a signed token that proves we issued it for
 *  this email (carries the expiry + HMAC; the code itself is emailed). */
export function issueCode(email: string): IssuedCode {
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const exp = Date.now() + 10 * 60_000;
  const sig = sign(`${email.toLowerCase()}|${code}|${exp}`);
  const token = Buffer.from(JSON.stringify({ exp, sig })).toString("base64url");
  return { code, token };
}

export function verifyCode(email: string, code: string, token: string): boolean {
  try {
    const { exp, sig } = JSON.parse(Buffer.from(token, "base64url").toString()) as {
      exp: number;
      sig: string;
    };
    if (typeof exp !== "number" || Date.now() > exp) return false;
    const expected = sign(`${email.toLowerCase()}|${code}|${exp}`);
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", hmacSecret()).update(payload).digest("base64url");
}

// ── .ics builder ───────────────────────────────────────────────────

export function buildIcs(opts: {
  startUtc: string;
  name: string;
  email: string;
  meetUrl: string;
  summary: string;
  description: string;
}): string {
  const start = new Date(opts.startUtc);
  const end = new Date(start.getTime() + BOOKING.durationMin * 60_000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const uid = `${crypto.randomUUID()}@gravixar.com`;
  const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Gravixar//Booking//EN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(opts.summary)}`,
    `DESCRIPTION:${esc(opts.description)}`,
    `LOCATION:${esc(opts.meetUrl)}`,
    "ORGANIZER;CN=Gravixar:mailto:gravixar@gmail.com",
    `ATTENDEE;CN=${esc(opts.name)};RSVP=TRUE:mailto:${opts.email}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function meetUrl(): string {
  return env.BOOKING_MEET_URL ?? "https://meet.google.com/landing";
}

// ── Confirm payload schema ─────────────────────────────────────────

export const confirmSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(160),
  code: z.string().regex(/^\d{6}$/),
  token: z.string().min(10).max(500),
  startUtc: z.string().datetime(),
  service: z.enum(SERVICE_OPTIONS).optional(),
  note: z.string().max(2000).optional(),
  website: z.string().max(0).optional(), // honeypot
});

export type ConfirmInput = z.infer<typeof confirmSchema>;

export type BookingRecord = {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  startUtc: string;
  service?: string;
  note?: string;
  ip?: string;
};
