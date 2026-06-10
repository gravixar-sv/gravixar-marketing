import type { Metadata } from "next";
import { PageHeader } from "@/components/site/PageHeader";
import { MDX } from "@/content/mdx";
import { loadPage } from "@/content/loaders";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Privacy Policy",
    description:
      "How Gravixar collects, uses, and protects your data when you contact us, book a call, join the waitlist, or apply for a role.",
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
