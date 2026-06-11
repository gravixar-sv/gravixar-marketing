// scripts/privatize-blob-jsonl.ts
//
// One-shot migration: re-put every existing PII JSONL file (leads/,
// early-access/, service-inquiries/, job-applications/, bookings/) as
// access:"private", preserving content at the same pathname. After the
// re-put, the old public URL stops serving (verified per file below).
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

import { list, get, put } from "@vercel/blob";

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

      await put(blob.pathname, text, {
        access: "private",
        addRandomSuffix: false,
        contentType: "application/x-ndjson",
        token,
        allowOverwrite: true,
      });

      // Verify: the old public URL must no longer serve the content.
      const check = await fetch(publicUrl, { cache: "no-store" });
      if (check.ok) {
        console.error(
          `  ⚠ ${blob.pathname} re-put as private but the public URL still serves (${check.status}) — investigate before trusting this migration`,
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
