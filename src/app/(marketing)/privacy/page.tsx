import type { Metadata } from "next";
import { PageHeader } from "@/components/site/PageHeader";
import { MDX } from "@/content/mdx";
import { ArticleBody } from "@/components/content/ArticleBody";
import { extractToc, longDate } from "@/components/content/longform";
import { loadPage } from "@/content/loaders";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  // Read title and description from the MDX rather than restating them. The
  // hardcoded copy that used to live here had drifted from the frontmatter it
  // duplicated, so the page lede and the meta description disagreed, and the
  // meta description was still written in the first-person plural this repo
  // does not use. One source removes the whole class.
  const page = await loadPage("privacy");
  return buildMetadata({
    title: sentenceTitle(page.meta.title),
    description: page.meta.description,
    path: "/privacy",
  });
}

// The policy's first line is "Last updated: YYYY-MM-DD", written into the MDX so
// the date travels with the copy. The page lifts it into the header as a
// caption (the body still says the date is "at the top of this page", and it
// is) and renders the rest as the article. If the line is ever reworded, the
// match simply fails and the body renders untouched, date and all.
const UPDATED = /^\s*Last updated:\s*(\d{4}-\d{2}-\d{2})\s*\r?\n/;

// Headings are sentence case on this site. The frontmatter still reads
// "Privacy Policy"; until content/pages/privacy.mdx says "Privacy policy",
// this maps that one known string and passes anything else through, so it
// becomes a no-op the moment the source is fixed.
function sentenceTitle(title: string) {
  return title === "Privacy Policy" ? "Privacy policy" : title;
}

export default async function PrivacyPage() {
  const page = await loadPage("privacy");
  const match = UPDATED.exec(page.body);
  const updated = match?.[1] ?? null;
  const body = match ? page.body.slice(match[0].length) : page.body;
  const eyebrow = page.meta.eyebrow
    ? page.meta.eyebrow.charAt(0).toUpperCase() + page.meta.eyebrow.slice(1)
    : undefined;

  return (
    <article className="read-track">
      <PageHeader eyebrow={eyebrow} title={sentenceTitle(page.meta.title)} lede={page.meta.description}>
        {updated ? (
          <p className="text-caption text-ink-500">
            Last updated <time dateTime={updated}>{longDate(updated)}</time>
          </p>
        ) : null}
      </PageHeader>
      <ArticleBody toc={extractToc(body)} className="mt-12 md:mt-16">
        <MDX source={body} />
      </ArticleBody>
    </article>
  );
}
