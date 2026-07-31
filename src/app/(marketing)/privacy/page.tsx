import type { Metadata } from "next";
import { PageHeader } from "@/components/site/PageHeader";
import { MDX } from "@/content/mdx";
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
    title: page.meta.title,
    description: page.meta.description,
    path: "/privacy",
  });
}

export default async function PrivacyPage() {
  const page = await loadPage("privacy");
  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow={page.meta.eyebrow}
        title={page.meta.title}
        lede={page.meta.description}
      />
      <article className="prose-invert max-w-3xl">
        <MDX source={page.body} />
      </article>
    </div>
  );
}
