// Production SEO-agent cron. Runs Tue + Fri at 14:00 UTC per vercel.ts.
//
// Drafts a single post, writes it to Vercel Blob under
// `drafts/blog/{date}-{slug}.mdx`, and emails Qamar with the body inlined
// for review. Nothing is published, the file in Blob is reference only.
// Approval = paste the MDX into a new file under content/blog/ in the
// repo, edit, commit, push.

import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { env } from "@/lib/env";
import { loadBlogPosts } from "@/content/loaders";
import { draftToMdx, generateDraft } from "@/lib/ai/seo-agent";
import { FROM_EMAIL, NOTIFY_EMAIL, getResend } from "@/lib/resend";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: Request) {
  if (env.CRON_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  if (!env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "blob_token_required" },
      { status: 500 },
    );
  }

  const posts = await loadBlogPosts({ includeDrafts: true });
  const recentTitles = posts.slice(0, 10).map((p) => p.meta.title);
  const knownTags = Array.from(new Set(posts.flatMap((p) => p.meta.tags)));

  const draft = await generateDraft({ recentTitles, knownTags });
  const date = new Date().toISOString().slice(0, 10);
  const mdx = draftToMdx(draft, date);
  const key = `drafts/blog/${date}-${draft.slug}.mdx`;

  const blob = await put(key, mdx, {
    access: "public",
    addRandomSuffix: false,
    contentType: "text/markdown; charset=utf-8",
    token: env.BLOB_READ_WRITE_TOKEN,
    allowOverwrite: true,
  });

  const resend = getResend();
  if (resend) {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: NOTIFY_EMAIL,
      subject: `[gravixar] Draft: ${draft.title}`,
      text: [
        `New blog draft from the AI SEO agent.`,
        ``,
        `Title:    ${draft.title}`,
        `Slug:     ${draft.slug}`,
        `Tags:     ${draft.tags.join(", ")}`,
        `Stored:   ${blob.url}`,
        ``,
        `--- Preview (full file) ---`,
        ``,
        mdx,
        ``,
        `--- End ---`,
        ``,
        `To publish: paste the MDX above into content/blog/${date}-${draft.slug}.mdx,`,
        `set draft: false in the frontmatter, edit as you see fit, commit, push.`,
      ].join("\n"),
    });
  }

  return NextResponse.json({
    ok: true,
    slug: draft.slug,
    title: draft.title,
    blob: blob.url,
  });
}
