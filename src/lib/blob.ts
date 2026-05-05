// Append-only lead log on Vercel Blob. One JSON file per month, the
// log is small, write-light, and easy to read later. When the volume
// outgrows this, move to Neon Postgres via the Marketplace.

import { put, list } from "@vercel/blob";
import { env } from "./env";
import type { LeadRecord } from "./lead";
import type { EarlyAccessRecord } from "./early-access";

const LEAD_LOG_PREFIX = "leads/";
const EARLY_ACCESS_PREFIX = "early-access/";

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
