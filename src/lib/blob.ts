// Lead logs on Vercel Blob. One JSON file per month and kind, append-only,
// written to the PRIVATE store (./pii-blob.ts) and pulled into HQ's inbox by
// its sync-leads cron every 15 minutes.
//
// These files used to live on the public store, where fixed paths made every
// submission readable by anyone with the store's address. HQ reads both
// stores while the move completes (HQ task lead-pii-private-blob-store), so a
// lead lands in the inbox whichever store it was written to.

import { BlobNotFoundError, head, list } from "@vercel/blob";
import { env } from "./env";
import { appendPrivateLine, createPrivateOnce, listPrivate, readPrivateJson } from "./pii-blob";
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
// Private too: a question typed into a chat box can still name a person.
const CHAT_MISS_PREFIX = "chat-misses/";

function monthKey(d = new Date()) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Append one record to this month's file for its kind.
//
// Throws when the private store cannot be reached (PII_BLOB_STORE_ID unset, or
// no OIDC token). Every caller runs this beside the notification email and
// logs a rejection, so a failed append is loud in the runtime logs while the
// visitor still gets their confirmation. It never falls back to the public
// store: a lead that cannot be written privately is not written at all.
function appendJsonl<T>(prefix: string, record: T): Promise<{ url: string }> {
  return appendPrivateLine(`${prefix}${monthKey()}.jsonl`, JSON.stringify(record));
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
//      write underneath read the whole month document and PUT it back. Two
//      concurrent confirms that both read the same text produced a
//      last-writer-wins overwrite, so the loser's booking was erased from the
//      file. That also removed it from readTakenSlots(), which re-opened the
//      slot, leaving a visitor who was told they were booked on no record.
//
// The fix is not a lock, because there is nothing here to lock with. It is to
// make the collision impossible to express: the claim is a create-only write,
// so the store itself rejects the second write to the same key. Timing stops
// mattering. The claim carries the full record, so a slot that is taken and a
// booking that exists are the same fact rather than two facts that can drift.
//
// The month JSONL is still written, because HQ and the operator read it, but
// it is a SECONDARY copy. If it loses a line the slot stays claimed.
const SLOT_PREFIX = "bookings/slots/";

const slotKey = (startUtc: string) =>
  `${SLOT_PREFIX}${startUtc.replace(/[:.]/g, "-")}.json`;

// A slot claimed on the PUBLIC store before the move is still taken. Read-only,
// and only until the public copies are deleted, after which it finds nothing
// and costs one lookup. Anything other than a clean "not there" refuses the
// booking, like every other doubt in this flow.
async function publicClaimExists(key: string): Promise<boolean> {
  if (!env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN unset");
  try {
    await head(key, { token: env.BLOB_READ_WRITE_TOKEN });
    return true;
  } catch (err) {
    if (err instanceof BlobNotFoundError) return false;
    throw err;
  }
}

/**
 * Atomically claim a slot. Resolves the stored record on success, or null if
 * the slot was already claimed by someone else.
 */
export async function claimSlot(
  record: BookingRecord,
): Promise<BookingRecord | null> {
  const key = slotKey(record.startUtc);
  try {
    if (await publicClaimExists(key)) return null;
    return (await createPrivateOnce(key, JSON.stringify(record))) ? record : null;
  } catch (err) {
    // Refused, and deliberately not distinguished from "already claimed": the
    // caller's only correct response to either is to refuse the booking and
    // refresh the grid, and guessing which one happened would be the
    // fail-open that the availability check must never do.
    console.error("[book] slot not claimed, the stores could not be checked:", err);
    return null;
  }
}

// Slot claims on the private store. Claim markers are authoritative, because
// they are what a confirm actually competes for.
async function readPrivateClaims(): Promise<BookingRecord[]> {
  const blobs = await listPrivate(SLOT_PREFIX);
  const rows = await Promise.all(
    blobs.map(async (b) => {
      try {
        return await readPrivateJson<BookingRecord>(b.pathname);
      } catch {
        return null;
      }
    }),
  );
  return rows.filter((r): r is BookingRecord => r !== null);
}

// Slot claims still on the public store, read until its copies are deleted.
async function readPublicClaims(): Promise<BookingRecord[]> {
  if (!env.BLOB_READ_WRITE_TOKEN) return [];
  const claims = await list({ prefix: SLOT_PREFIX, token: env.BLOB_READ_WRITE_TOKEN });
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
  return rows.filter((r): r is BookingRecord => r !== null);
}

// Taken slot start-times across both stores. One prefix covers the whole
// booking horizon, so there is no month-boundary special case.
export async function readTakenSlots(): Promise<string[]> {
  const [privateClaims, publicClaims] = await Promise.all([
    readPrivateClaims(),
    readPublicClaims(),
  ]);
  const taken = new Set<string>();
  for (const r of [...privateClaims, ...publicClaims]) {
    // An absent status means active; only an explicit "cancelled" frees the
    // slot. Nothing writes that value yet, so this is inert today, but a
    // cancel flow will not need to touch this function to work.
    if (r.status !== "cancelled") taken.add(r.startUtc);
  }
  return [...taken];
}
