// scripts/privatize-blob-jsonl.ts
//
// One-shot migration: convert every existing PII JSONL file (leads/,
// early-access/, service-inquiries/, job-applications/, bookings/) to
// access:"private", preserving content at the same pathname.
//
// CRITICAL (verified 2026-06-11): a plain re-put as private does NOT stop
// the old public URL from serving. Vercel Blob's public URLs are CDN-cached
// with `cache-control: public, max-age=2592000` (30 days) and keyed by
// pathname only (query params don't bypass it), so an overwrite leaves the
// pre-flip PII snapshot publicly fetchable for up to a month. The fix is
// del-then-put: del() purges the CDN cache for that URL, then we re-put the
// content private. Content is read into memory BEFORE the del, so there's
// no data-loss window (only a sub-second gap where the path 404s — fine for
// an append log read by a 15-min cron).
//
// DRY BY DEFAULT — the dry run does an AUTHENTICATED list() so it proves
// the token works before anyone trusts its report (a dry run that can't
// validate credentials gives false confidence). Pass --apply to execute.
//
// Run:  npx tsx scripts/privatize-blob-jsonl.ts            (dry)
//       npx tsx scripts/privatize-blob-jsonl.ts --apply    (real)
//
// Needs BLOB_READ_WRITE_TOKEN in the environment (the store's RW token —
// the project env var is marked sensitive in Vercel, so source it from
// the store's own page or run this where the env exists).

import { list, get, put, del } from "@vercel/blob";

const PREFIXES = [
  "leads/",
  "early-access/",
  "service-inquiries/",
  "job-applications/",
  "bookings/",
];

const apply = process.argv.includes("--apply");
const token = process.env.BLOB_READ_WRITE_TOKEN;

async function main(): Promise<void> {
  if (!token) {
    console.error("BLOB_READ_WRITE_TOKEN is not set — aborting.");
    process.exit(1);
  }

  let converted = 0;
  let failed = 0;

  for (const prefix of PREFIXES) {
    // Authenticated even in dry mode — proves the token before reporting.
    const found = await list({ prefix, token });
    const jsonls = found.blobs.filter((b) => b.pathname.endsWith(".jsonl"));
    if (jsonls.length === 0) {
      console.log(`${prefix} — no files`);
      continue;
    }

    for (const blob of jsonls) {
      const publicUrl = blob.url;
      if (!apply) {
        console.log(`[dry] would privatize ${blob.pathname} (${blob.size}b)`);
        continue;
      }

      // Read content: pre-migration files are public (plain fetch); on a
      // re-run, already-private files need the authorized get() instead.
      let text: string | null = null;
      const pub = await fetch(blob.url, { cache: "no-store" });
      if (pub.ok) {
        text = await pub.text();
      } else {
        const result = await get(blob.pathname, { access: "private", token });
        if (result && result.statusCode === 200) {
          text = await new Response(result.stream).text();
        }
      }
      if (text === null) {
        console.error(`  ✗ ${blob.pathname} — could not read content, skipping`);
        failed++;
        continue;
      }

      // del() FIRST — purges the CDN cache for the public URL (a re-put
      // alone leaves the 30-day-cached public copy serving). Content is
      // already in `text`, so this is safe.
      await del(publicUrl, { token });

      await put(blob.pathname, text, {
        access: "private",
        addRandomSuffix: false,
        contentType: "application/x-ndjson",
        token,
        allowOverwrite: true,
      });

      // Verify the old public URL no longer serves. After a del-purge the
      // edge should MISS and origin should refuse (404) for the now-private
      // object. A lingering 200 means the purge didn't take — fail loud.
      const check = await fetch(`${publicUrl}?_v=${Date.now()}`, { cache: "no-store" });
      if (check.ok) {
        console.error(
          `  ⚠ ${blob.pathname} re-put private but public URL still serves (${check.status}) — purge did not take; investigate`,
        );
        failed++;
      } else {
        console.log(`  ✓ ${blob.pathname} private (public URL now ${check.status})`);
        converted++;
      }
    }
  }

  console.log(
    apply
      ? `\ndone — ${converted} privatized, ${failed} failed/suspect.`
      : `\ndry run complete — re-run with --apply to execute.`,
  );
  if (failed > 0) process.exit(1);
}

main();
