// Append-only lead log on Vercel Blob. One JSON file per month, the
// log is small, write-light, and easy to read later. When the volume
// outgrows this, move to Neon Postgres via the Marketplace.

import { put, list } from "@vercel/blob";
import { env } from "./env";
import type { LeadRecord } from "./lead";
import type { EarlyAccessRecord } from "./early-access";
import type { ServiceInquiryRecord } from "./service-inquiry";
import type { JobApplicationRecord } from "./job-application";
import type { BookingRecord } from "./booking";
import type { ChatMissRecord } from "./chat/scrub";

const LEAD_LOG_PREFIX = "leads/";
const EARLY_ACCESS_PREFIX = "early-access/";
const SERVICE_INQUIRY_PREFIX = "service-inquiries/";
const JOB_APPLICATION_PREFIX = "job-applications/";
const BOOKING_PREFIX = "bookings/";
// Bosun's miss log. NOT a transcript: one row per conversation carrying only
// the questions it could not answer, scrubbed of emails, phone numbers, URLs
// and long digit runs before the write. See src/lib/chat/scrub.ts for what is
// deliberately absent, and privacy.mdx for the published promise about it.
const CHAT_MISS_PREFIX = "chat-misses/";

function monthKey(d = new Date()) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Generic JSONL append. Reads the current month's file (if any), appends
// the record as a new line, PUTs the full document back. Vercel Blob is
// immutable per write, so we re-PUT each call. Cheap until volume grows.
async function appendJsonl<T>(
  prefix: string,
  record: T,
): Promise<{ url: string } | null> {
  if (!env.BLOB_READ_WRITE_TOKEN) return null;
  const key = `${prefix}${monthKey()}.jsonl`;

  let existing = "";
  try {
    const found = await list({ prefix: key, token: env.BLOB_READ_WRITE_TOKEN });
    const match = found.blobs.find((b) => b.pathname === key);
    if (match) {
      const res = await fetch(match.url);
      if (res.ok) existing = await res.text();
    }
  } catch {
    // first write of the month
  }

  const next = `${existing}${existing && !existing.endsWith("\n") ? "\n" : ""}${JSON.stringify(record)}\n`;
  const blob = await put(key, next, {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/x-ndjson",
    token: env.BLOB_READ_WRITE_TOKEN,
    allowOverwrite: true,
  });
  return { url: blob.url };
}

export const appendLead = (record: LeadRecord) =>
  appendJsonl(LEAD_LOG_PREFIX, record);

export const appendEarlyAccess = (record: EarlyAccessRecord) =>
  appendJsonl(EARLY_ACCESS_PREFIX, record);

export const appendServiceInquiry = (record: ServiceInquiryRecord) =>
  appendJsonl(SERVICE_INQUIRY_PREFIX, record);

export const appendJobApplication = (record: JobApplicationRecord) =>
  appendJsonl(JOB_APPLICATION_PREFIX, record);

export const appendChatMiss = (record: ChatMissRecord) =>
  appendJsonl(CHAT_MISS_PREFIX, record);

// ---- Read helpers (admin dashboard) -------------------------------

// Generic JSONL read for a single month. Returns parsed records or [].
async function readJsonl<T>(prefix: string, month: string): Promise<T[]> {
  if (!env.BLOB_READ_WRITE_TOKEN) return [];
  const key = `${prefix}${month}.jsonl`;
  try {
    const found = await list({ prefix: key, token: env.BLOB_READ_WRITE_TOKEN });
    const match = found.blobs.find((b) => b.pathname === key);
    if (!match) return [];
    const res = await fetch(match.url, { cache: "no-store" });
    if (!res.ok) return [];
    const text = await res.text();
    return text
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as T);
  } catch {
    return [];
  }
}

// List all months for a prefix, newest first.
async function listMonths(prefix: string): Promise<string[]> {
  if (!env.BLOB_READ_WRITE_TOKEN) return [];
  try {
    const found = await list({ prefix, token: env.BLOB_READ_WRITE_TOKEN });
    return found.blobs
      .map((b) => b.pathname.slice(prefix.length).replace(".jsonl", ""))
      .filter((m) => /^\d{4}-\d{2}$/.test(m))
      .sort((a, b) => b.localeCompare(a));
  } catch {
    return [];
  }
}

export const readLeads = (month: string) =>
  readJsonl<LeadRecord>(LEAD_LOG_PREFIX, month);

export const readEarlyAccess = (month: string) =>
  readJsonl<EarlyAccessRecord>(EARLY_ACCESS_PREFIX, month);

export const listLeadMonths = () => listMonths(LEAD_LOG_PREFIX);

export const listEarlyAccessMonths = () => listMonths(EARLY_ACCESS_PREFIX);

export function currentMonthKey() {
  return monthKey();
}

// ---- Bookings -----------------------------------------------------

export const appendBooking = (record: BookingRecord) =>
  appendJsonl(BOOKING_PREFIX, record);

// One blob per slot, and the SLOT is the unit of storage. This is the whole
// concurrency story for booking, and it replaces a read-then-write that had
// two failure modes rather than one.
//
// The old shape: confirm/route.ts called readTakenSlots(), checked the array,
// then called appendBooking(). Nothing held anything between those two awaits.
//   1. Two confirms for the same slot could interleave between the check and
//      the write, so both passed and both persisted. Two strangers, one Meet
//      room, same minute.
//   2. WORSE, and the reason this needed changing rather than locking: the
//      write underneath is appendJsonl, which reads the whole month document
//      and PUTs it back. Two concurrent confirms that both read the same
//      `existing` text produce a last-writer-wins overwrite, so the loser's
//      booking is erased from the file. That also removes it from
//      readTakenSlots(), which re-opens the slot, leaving a visitor who was
//      told they were booked on no record anywhere.
//
// The fix is not a lock, because there is nothing here to lock with. It is to
// make the collision impossible to express: `allowOverwrite` is left OFF, so
// the store itself rejects the second write to the same key. Timing stops
// mattering. The claim carries the full record, so a slot that is taken and a
// booking that exists are the same fact rather than two facts that can drift.
//
// The month JSONL is still written, because HQ and the operator read it, but
// it is now a SECONDARY copy. If it loses a line the slot stays claimed.
const SLOT_PREFIX = "bookings/slots/";

const slotKey = (startUtc: string) =>
  `${SLOT_PREFIX}${startUtc.replace(/[:.]/g, "-")}.json`;

/**
 * Atomically claim a slot. Resolves the stored record on success, or null if
 * the slot was already claimed by someone else.
 */
export async function claimSlot(
  record: BookingRecord,
): Promise<BookingRecord | null> {
  if (!env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    await put(slotKey(record.startUtc), JSON.stringify(record), {
      access: "public",
      addRandomSuffix: false,
      // NOT set to true, deliberately. This is the entire mechanism: a second
      // write to an existing key throws, and that throw IS the collision
      // being detected by the store instead of by us.
      allowOverwrite: false,
      contentType: "application/json",
      token: env.BLOB_READ_WRITE_TOKEN,
    });
    return record;
  } catch {
    // Already claimed. Deliberately not distinguished from a transport fault:
    // the caller's only correct response to either is to refuse the booking
    // and refresh the grid, and guessing which one happened would be the
    // fail-open that the availability check must never do.
    return null;
  }
}

// Taken slot start-times across this month + next (the booking horizon
// can cross a month boundary). Used to filter the available slots.
export async function readTakenSlots(): Promise<string[]> {
  if (!env.BLOB_READ_WRITE_TOKEN) return [];

  // Claim markers are authoritative, because they are what a confirm actually
  // competes for. Reading them also drops the month-boundary special case the
  // JSONL version needed: one prefix covers the whole horizon.
  const claims = await list({
    prefix: SLOT_PREFIX,
    token: env.BLOB_READ_WRITE_TOKEN,
  });

  const rows = await Promise.all(
    claims.blobs.map(async (b) => {
      try {
        const res = await fetch(b.url, { cache: "no-store" });
        if (!res.ok) return null;
        return (await res.json()) as BookingRecord;
      } catch {
        return null;
      }
    }),
  );

  return rows
    .filter((r): r is BookingRecord => r !== null)
    // An absent status means active; only an explicit "cancelled" frees the
    // slot. Nothing writes that value yet, so this is inert today and the
    // behaviour is unchanged, but a cancel flow will not need to touch this
    // function to work.
    .filter((r) => r.status !== "cancelled")
    .map((r) => r.startUtc);
}
