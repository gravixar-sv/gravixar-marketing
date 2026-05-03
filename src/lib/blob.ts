// Append-only lead log on Vercel Blob. One JSON file per month — the
// log is small, write-light, and easy to read later. When the volume
// outgrows this, move to Neon Postgres via the Marketplace.

import { put, list } from "@vercel/blob";
import { env } from "./env";
import type { LeadRecord } from "./lead";

const LEAD_LOG_PREFIX = "leads/";

function monthKey(d = new Date()) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function appendLead(record: LeadRecord): Promise<{ url: string } | null> {
  if (!env.BLOB_READ_WRITE_TOKEN) return null;
  const key = `${LEAD_LOG_PREFIX}${monthKey()}.jsonl`;

  // Read existing month-file (if any) and append a line. Vercel Blob is
  // immutable per-write, so we PUT the full document each call.
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
