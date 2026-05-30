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

    // Repo commit failed — log and fall through to blob fallback so
    // we don't lose the draft entirely.
    console.error("[seo-agent] repo commit failed, falling back to blob:", commitResult.error);
  }

  // Legacy / fallback mode: write to Blob + email the MDX inline.
  if (!env.BLOB_READ_WRITE_TOKEN) {
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
