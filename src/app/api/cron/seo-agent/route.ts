// SEO-agent cron. Runs Tue + Fri at 14:00 UTC per vercel.ts.
//
// Phase 6.B4: when MARKETING_GH_TOKEN is set, the agent commits the
// draft directly to `content/blog/_drafts/<date>-<slug>.mdx` on the
// default branch of gravixar-sv/gravixar-marketing. HQ's /content
// bridge picks it up automatically (Phase 6.A1) and the operator can
// click Promote → PR (Phase 6.A2) to ship it out of _drafts/.
//
// Legacy mode (when MARKETING_GH_TOKEN is unset): falls back to the
// original Blob + email-with-inline-MDX flow. Removes the need for a
// manual paste-into-repo step once the token is configured, but keeps
// the agent working in environments without write access.
//
// OBSERVABILITY, added 2026-09-02 after this cron produced NOTHING for two
// months without anyone noticing. The last autonomous draft commit was
// 2026-07-03; the schedule is Tue and Fri, so roughly seventeen runs went by
// in silence. The reason was structural: this handler had no try/catch at
// all, so anything generateDraft() threw (a missing or rejected
// ANTHROPIC_API_KEY, a rate limit, a provider timeout, or simply exceeding
// the 120s maxDuration) killed the request before the only email in the file
// could be sent. Success emailed. Failure said nothing, to anyone.
//
// Two changes fix that, and the second is the one that matters:
//   1. every run logs one result line, so success and failure are
//      distinguishable in the Vercel log without opening a body;
//   2. failure EMAILS, on the same address success uses, and returns 500 so
//      the invocation is marked failed in the cron dashboard rather than
//      counting as a green run that happened to do nothing.
//
// Fail-open still holds: this route breaking never affects a visitor. It is
// the operator who was being failed openly, which is a different thing.

import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { env } from "@/lib/env";
import { loadBlogPosts } from "@/content/loaders";
import { commitFileToMain } from "@/lib/ai/repo-commit";
import { draftToMdx, generateDraft } from "@/lib/ai/seo-agent";
import { FROM_EMAIL, NOTIFY_EMAIL, getResend } from "@/lib/resend";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: Request) {
  // Accept either secret: Vercel's auto-generated CRON_SECRET (scheduled
  // runs) or the shared TREND_RADAR_TRIGGER_SECRET (manual "Draft now"
  // from HQ /content). Same dual-secret posture as the trend-radar route,
  // so HQ can trigger on-demand drafts with no extra env var. If neither
  // is configured, allow the request (matches the local-dev posture).
  const accepted = [env.CRON_SECRET, env.TREND_RADAR_TRIGGER_SECRET].filter(
    (s): s is string => typeof s === "string" && s.length > 0,
  );
  if (accepted.length > 0) {
    const auth = req.headers.get("authorization") ?? "";
    const authorized = accepted.some((s) => auth === `Bearer ${s}`);
    if (!authorized) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    return await run(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[seo-agent] done: FAILED ${message}`);
    await sendFailureNotification(message).catch((notifyErr) => {
      // A failure to report a failure is the worst case, so it gets its own
      // line rather than being swallowed into the same catch.
      console.error("[seo-agent] could not send failure email:", notifyErr);
    });
    return NextResponse.json({ ok: false, error: "draft_failed", message }, { status: 500 });
  }
}

async function run(req: Request) {
  // Optional topic seed for manual runs: hq sends ?topic=... so the
  // operator can draft a specific angle (e.g. a Trend Brief content
  // signal) instead of letting the agent pick. Scheduled runs omit it.
  const topicSeed =
    new URL(req.url).searchParams.get("topic")?.trim() || undefined;

  const posts = await loadBlogPosts({ includeDrafts: true });
  const recentTitles = posts.slice(0, 10).map((p) => p.meta.title);
  const knownTags = Array.from(new Set(posts.flatMap((p) => p.meta.tags)));

  const draft = await generateDraft({ topicSeed, recentTitles, knownTags });
  const date = new Date().toISOString().slice(0, 10);
  const mdx = draftToMdx(draft, date);

  // Repo mode: commit straight to _drafts/. Requires MARKETING_GH_TOKEN.
  if (env.MARKETING_GH_TOKEN) {
    const draftPath = `content/blog/_drafts/${date}-${draft.slug}.mdx`;
    const commitResult = await commitFileToMain({
      token: env.MARKETING_GH_TOKEN,
      path: draftPath,
      content: mdx,
      message: `draft(blog): ${draft.title}`,
    });

    if (commitResult.ok) {
      await sendNotification({
        mode: "repo",
        title: draft.title,
        slug: draft.slug,
        tags: draft.tags,
        location: commitResult.url,
        date,
        mdx,
      });
      console.log(`[seo-agent] done: mode=repo slug=${draft.slug} sha=${commitResult.commitSha}`);
      return NextResponse.json({
        ok: true,
        mode: "repo",
        slug: draft.slug,
        title: draft.title,
        path: draftPath,
        commitSha: commitResult.commitSha,
        url: commitResult.url,
      });
    }

    // Repo commit failed, so log it and fall through to blob fallback so
    // we don't lose the draft entirely.
    console.error("[seo-agent] repo commit failed, falling back to blob:", commitResult.error);
  }

  // Legacy / fallback mode: write to Blob + email the MDX inline.
  if (!env.BLOB_READ_WRITE_TOKEN) {
    console.error("[seo-agent] done: FAILED no write target configured");
    return NextResponse.json(
      { error: "no_write_target", message: "Neither MARKETING_GH_TOKEN nor BLOB_READ_WRITE_TOKEN is set." },
      { status: 500 },
    );
  }

  const key = `drafts/blog/${date}-${draft.slug}.mdx`;
  const blob = await put(key, mdx, {
    access: "public",
    addRandomSuffix: false,
    contentType: "text/markdown; charset=utf-8",
    token: env.BLOB_READ_WRITE_TOKEN,
    allowOverwrite: true,
  });

  await sendNotification({
    mode: "blob",
    title: draft.title,
    slug: draft.slug,
    tags: draft.tags,
    location: blob.url,
    date,
    mdx,
  });

  console.log(`[seo-agent] done: mode=blob slug=${draft.slug} key=${key}`);
  return NextResponse.json({
    ok: true,
    mode: "blob",
    slug: draft.slug,
    title: draft.title,
    blob: blob.url,
  });
}

interface NotificationArgs {
  mode: "repo" | "blob";
  title: string;
  slug: string;
  tags: string[];
  location: string;
  date: string;
  mdx: string;
}

async function sendNotification(args: NotificationArgs): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const isRepo = args.mode === "repo";
  const subject = isRepo
    ? `[gravixar] Draft ready to promote: ${args.title}`
    : `[gravixar] Draft (blob fallback): ${args.title}`;

  const lines = isRepo
    ? [
        "New blog draft from the AI SEO agent.",
        "",
        `Title:    ${args.title}`,
        `Slug:     ${args.slug}`,
        `Tags:     ${args.tags.join(", ")}`,
        `Repo:     ${args.location}`,
        `HQ:       https://hq.gravixar.com/content?status=draft`,
        "",
        "Next step:",
        "  1. Skim the file at the Repo link above (or in HQ /content)",
        "  2. If it's good as-is: click Promote → PR in HQ /content",
        "  3. If edits needed: edit in GitHub or the marketing repo first,",
        "     then click Promote → PR.",
        "",
        "--- Preview ---",
        "",
        args.mdx,
      ]
    : [
        "New blog draft from the AI SEO agent (BLOB FALLBACK MODE).",
        "MARKETING_GH_TOKEN is not configured, so the agent couldn't commit",
        "the draft directly to the repo. Falling back to the legacy flow:",
        "",
        `Title:    ${args.title}`,
        `Slug:     ${args.slug}`,
        `Tags:     ${args.tags.join(", ")}`,
        `Stored:   ${args.location}`,
        "",
        "--- Preview (full file) ---",
        "",
        args.mdx,
        "",
        "--- End ---",
        "",
        "To publish (manual): paste the MDX above into",
        `content/blog/_drafts/${args.date}-${args.slug}.mdx,`,
        "edit as needed, commit, push. Then click Promote in HQ /content.",
      ];

  await resend.emails.send({
    from: FROM_EMAIL,
    to: NOTIFY_EMAIL,
    subject,
    text: lines.join("\n"),
  });
}

// Sent on the same address as a success, on purpose. A separate "alerts"
// channel is one more thing to remember to read; this lands in the inbox that
// already expects a message from this cron twice a week, so its ABSENCE is
// what should look wrong, not its arrival.
async function sendFailureNotification(message: string): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: NOTIFY_EMAIL,
    subject: "[gravixar] SEO agent FAILED to produce a draft",
    text: [
      "The SEO agent cron ran and did not produce a draft.",
      "",
      `Error: ${message}`,
      "",
      "Most likely causes, in the order worth checking:",
      "  1. ANTHROPIC_API_KEY missing, rejected, or out of quota.",
      "  2. The run exceeded maxDuration (120s) and was killed mid-generation.",
      "  3. MARKETING_GH_TOKEN expired, which drops the run to the blob",
      "     fallback rather than failing, so check the mode on recent runs too.",
      "",
      "Vercel logs: filter for `[seo-agent] done:`. Every run emits exactly",
      "one of those lines now, so a missing line means the function never",
      "reached the end at all.",
    ].join("\n"),
  });
}
