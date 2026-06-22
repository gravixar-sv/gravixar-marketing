// Job-indexing cron. Pings Google's Indexing API for the open JobPosting URLs
// so roles surface in (and drop out of) Google for Jobs fast, instead of
// waiting on the normal crawl. Runs daily per vercel.ts.
//
// Each run: read the current open roles (HQ Blob snapshot, static jobs.ts
// fallback) -> URL_UPDATED for every open /careers/<slug> -> URL_DELETED for
// any slug that has closed since the last run. The last run's open slugs are
// stored in Blob (seo/indexed-jobs.json) so closures de-index promptly.
//
// Fail-open: missing credentials or any error returns 200 so the cron platform
// does not retry and burn the Indexing API quota (200 URLs/day). Indexing is
// never in the critical path.

import { NextResponse } from "next/server";
import { list, put } from "@vercel/blob";
import { env } from "@/lib/env";
import { SITE } from "@/lib/seo";
import { getCareersRoles } from "@/lib/careers";
import {
  publishUrls,
  isIndexingConfigured,
  type UrlNotification,
} from "@/lib/indexing";

export const runtime = "nodejs";
export const maxDuration = 60;

const STATE_KEY = "seo/indexed-jobs.json";

function jobUrl(slug: string): string {
  return `${SITE.url.replace(/\/$/, "")}/careers/${slug}`;
}

async function readLastSlugs(): Promise<string[]> {
  if (!env.BLOB_READ_WRITE_TOKEN) return [];
  try {
    const found = await list({
      prefix: STATE_KEY,
      token: env.BLOB_READ_WRITE_TOKEN,
    });
    const match = found.blobs.find((b) => b.pathname === STATE_KEY);
    if (!match) return [];
    const res = await fetch(match.url, { cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as { slugs?: string[] };
    return Array.isArray(data.slugs) ? data.slugs : [];
  } catch {
    return [];
  }
}

async function writeLastSlugs(slugs: string[]): Promise<void> {
  if (!env.BLOB_READ_WRITE_TOKEN) return;
  try {
    await put(
      STATE_KEY,
      JSON.stringify({ slugs, updatedAt: new Date().toISOString() }, null, 2),
      {
        access: "public",
        addRandomSuffix: false,
        contentType: "application/json; charset=utf-8",
        token: env.BLOB_READ_WRITE_TOKEN,
        allowOverwrite: true,
      },
    );
  } catch (err) {
    console.warn("[index-jobs] state write failed:", err);
  }
}

export async function GET(req: Request) {
  // Auth: Vercel's CRON_SECRET on scheduled runs. If unset (local dev), allow,
  // matching the seo-agent / trend-radar posture.
  if (env.CRON_SECRET) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  if (!isIndexingConfigured()) {
    console.warn(
      "[index-jobs] skipped: indexing_not_configured (GOOGLE_INDEXING_CREDENTIALS unset or not valid base64 JSON)",
    );
    return NextResponse.json(
      { ok: false, reason: "indexing_not_configured" },
      { status: 200 },
    );
  }

  let currentSlugs: string[];
  try {
    const roles = await getCareersRoles();
    currentSlugs = roles.map((r) => r.slug);
  } catch (err) {
    console.error("[index-jobs] failed to read roles:", err);
    return NextResponse.json(
      { ok: false, reason: "roles_unavailable", error: String(err) },
      { status: 200 },
    );
  }

  const lastSlugs = await readLastSlugs();
  const closedSlugs = lastSlugs.filter((s) => !currentSlugs.includes(s));

  const notifications: UrlNotification[] = [
    ...currentSlugs.map(
      (slug) => ({ url: jobUrl(slug), type: "URL_UPDATED" }) as const,
    ),
    ...closedSlugs.map(
      (slug) => ({ url: jobUrl(slug), type: "URL_DELETED" }) as const,
    ),
  ];

  const results = await publishUrls(notifications);
  const pinged = results.filter((r) => r.ok).length;

  // Advance the stored baseline only when something succeeded (or there was
  // nothing to do), so a transient token failure doesn't silently drop the
  // closure-tracking set. A failed URL_DELETED isn't retried, but the closed
  // role's page already 404s, so Google de-indexes it on the next crawl too.
  if (pinged > 0 || notifications.length === 0) {
    await writeLastSlugs(currentSlugs);
  }

  // Always log a one-line summary so each run (scheduled or manual) is
  // observable — a successful ping is otherwise a silent 200, indistinguishable
  // from a no-op skip.
  console.log(
    `[index-jobs] done: updated=${currentSlugs.length} deleted=${closedSlugs.length} pinged=${pinged}/${notifications.length}`,
  );

  return NextResponse.json({
    ok: true,
    updated: currentSlugs.length,
    deleted: closedSlugs.length,
    pinged,
    total: notifications.length,
  });
}
