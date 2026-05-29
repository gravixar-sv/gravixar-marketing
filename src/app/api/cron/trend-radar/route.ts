// Trend Radar biweekly cron. Runs on the 1st and 15th of each month
// at 10:00 UTC per vercel.ts.
//
// Generates a ranked Trend Brief (3-5 signals) via Vercel AI Gateway,
// writes it to Vercel Blob at drafts/trends/{date}-brief.md, and emails
// Qamar with the brief inlined for triage.
//
// Triage actions:
//   content-angle  -> becomes a Fajar content task
//   offer-pricing  -> becomes a brain decision to evaluate
//   watch          -> stays in the running log, revisited next run
//
// Nothing auto-acts. AI is never in the critical path. Fail-open:
// any error returns 200 with { ok: false, reason } so the cron
// platform does not retry aggressively.

import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { env } from "@/lib/env";
import { generateBrief, briefToMarkdown } from "@/lib/ai/trend-radar";
import { FROM_EMAIL, NOTIFY_EMAIL, getResend } from "@/lib/resend";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: Request) {
  // Auth: accept either Vercel's auto-generated CRON_SECRET (scheduled
  // runs) or TREND_RADAR_TRIGGER_SECRET (manual trigger from HQ). If
  // neither is set the endpoint is unauthenticated — fine for local dev.
  const auth = req.headers.get("authorization");
  const cronOk = env.CRON_SECRET ? auth === `Bearer ${env.CRON_SECRET}` : true;
  const triggerOk = env.TREND_RADAR_TRIGGER_SECRET
    ? auth === `Bearer ${env.TREND_RADAR_TRIGGER_SECRET}`
    : false;
  if (env.CRON_SECRET && !cronOk && !triggerOk) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "blob_token_required", ok: false },
      { status: 500 },
    );
  }

  const runDate = new Date().toISOString().slice(0, 10);

  // Fail-open: any generation error returns 200 so Vercel doesn't
  // retry and burn quota. Error is logged for manual inspection.
  let brief;
  try {
    brief = await generateBrief({ runDate });
  } catch (err) {
    console.error("[trend-radar] generation failed:", err);
    return NextResponse.json(
      { ok: false, reason: "generation_failed", error: String(err) },
      { status: 200 },
    );
  }

  const markdown = briefToMarkdown(brief, runDate);
  const blobKey = `drafts/trends/${runDate}-brief.md`;

  let blobUrl: string;
  try {
    const blob = await put(blobKey, markdown, {
      access: "public",
      addRandomSuffix: false,
      contentType: "text/markdown; charset=utf-8",
      token: env.BLOB_READ_WRITE_TOKEN,
      allowOverwrite: true,
    });
    blobUrl = blob.url;
  } catch (err) {
    console.error("[trend-radar] blob write failed:", err);
    return NextResponse.json(
      { ok: false, reason: "blob_write_failed", error: String(err) },
      { status: 200 },
    );
  }

  // Email notification — optional, fail-open.
  const resend = getResend();
  if (resend) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: NOTIFY_EMAIL,
        subject: `[gravixar] Trend Brief — ${runDate}`,
        text: [
          `Trend Radar run complete. ${brief.signals.length} signals for ${runDate}.`,
          ``,
          `Summary: ${brief.summary}`,
          ``,
          `Stored: ${blobUrl}`,
          ``,
          `--- Full Brief ---`,
          ``,
          markdown,
          ``,
          `--- End ---`,
          ``,
          `Triage: content-angle -> Fajar task | offer-pricing -> brain decision | watch -> monitor`,
        ].join("\n"),
      });
    } catch (err) {
      // Email failure does not fail the run.
      console.warn("[trend-radar] email failed:", err);
    }
  }

  return NextResponse.json({
    ok: true,
    runDate,
    signalCount: brief.signals.length,
    blob: blobUrl,
  });
}
