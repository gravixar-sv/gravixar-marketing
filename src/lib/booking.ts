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
  //
  // WHY FIVE HOURS AND WHY THESE. PKT is UTC+5, so the old [15,17,19] rendered
  // as 06:00 / 08:00 / 10:00 in New York and 03:00 / 05:00 / 07:00 in San
  // Francisco. A US buyer was offered exactly one civil time and the west coast
  // none at all, on a site that sells to agencies and founders. 13:00 opens the
  // UK morning and 21:00 is the only hour that reaches New York midday and San
  // Francisco at 09:00. The call ends at 21:30, which is the limit worth
  // trading. Mornings before 13:00 stay unbookable on purpose.
  pktHours: [13, 15, 17, 19, 21],
  horizonDays: 14,
  // Per DAY, not per request. maxSlots alone silently truncated the fourteen
  // day horizon to five business days (3 x 5 = 15), so the horizon was fiction.
  // A five hour pool would have made it three days.
  maxPerDay: 3,
  maxSlots: 45,
  // 12 hours is asymmetric: a New York visitor booking at 14:00 ET took the
  // next PKT slot using twelve hours that were entirely the operator's night.
  // 24 guarantees a full overnight before anything lands.
  leadHours: 24,
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

    // Everything still open on this PKT day, in order.
    const openToday: number[] = [];
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
      if (taken.has(new Date(startUtcMs).toISOString())) continue;
      openToday.push(startUtcMs);
    }

    // SPREAD, do not take the first N. Capping a five hour pool at three by
    // slicing would offer 13:00, 15:00 and 17:00 every day, which is 04:00,
    // 06:00 and 08:00 in New York: exactly the problem the later hours were
    // added to fix. Picking evenly across what is open puts the earliest, a
    // middle and the latest in front of every visitor, so the UK and the US
    // each see something civil on the same day, and the unused hours become
    // the backfill when one is taken.
    for (const startUtcMs of pickSpread(openToday, BOOKING.maxPerDay)) {
      slots.push({
        startUtc: new Date(startUtcMs).toISOString(),
        pktLabel: pktLabelFor(startUtcMs),
      });
      if (slots.length >= BOOKING.maxSlots) break;
    }
  }
  return slots;
}

/** Up to `k` items spread evenly across `items`, always including both ends. */
function pickSpread<T>(items: T[], k: number): T[] {
  if (items.length <= k) return items;
  if (k <= 1) return items.slice(0, k);
  const out: T[] = [];
  for (let i = 0; i < k; i++) {
    out.push(items[Math.round((i * (items.length - 1)) / (k - 1))]!);
  }
  return out;
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

/** Whether the booking flow can run end to end. The routes check this and
 *  return 503 rather than running unauthenticated, matching how an unset
 *  RESEND key already yields `email_unavailable`.
 *
 *  BOOKING_MEET_URL is required here, not just at confirm, even though only
 *  confirm needs it. Checking it late would mean emailing someone a code,
 *  taking their name and their chosen slot, and only then discovering the
 *  meeting has nowhere to happen. Do not start a flow that cannot finish. */
export function isBookingConfigured(): boolean {
  return Boolean(env.BOOKING_HMAC_SECRET) && Boolean(env.BOOKING_MEET_URL);
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

/**
 * The join link. Throws rather than substituting a placeholder.
 *
 * This used to fall back to https://meet.google.com/landing, which is Google's
 * marketing page and not a room. With BOOKING_MEET_URL unset, that dead link
 * shipped in the confirmation email AND baked into the .ics LOCATION, so the
 * visitor arrived at the appointed minute, clicked, and landed nowhere. Every
 * secret in env.ts is optional, so nothing failed and nothing was logged.
 * Callers gate on isBookingConfigured() and refuse before taking any details.
 */
export function meetUrl(): string {
  const url = env.BOOKING_MEET_URL;
  if (!url) {
    throw new Error("BOOKING_MEET_URL is not set, so booking is disabled.");
  }
  return url;
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
