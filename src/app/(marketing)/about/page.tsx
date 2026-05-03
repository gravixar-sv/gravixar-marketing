import type { Metadata } from "next";
import { PageHeader } from "@/components/site/PageHeader";
import { MDX } from "@/content/mdx";
import { ContactCTA } from "@/components/home/ContactCTA";
import { loadPage } from "@/content/loaders";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const page = await loadPage("about");
  return buildMetadata({
    title: page.meta.title,
    description: page.meta.description ?? "About Qamar and how he works.",
    path: "/about",
  });
}

export default async function AboutPage() {
  const page = await loadPage("about");
  return (
    <div className="space-y-16">
      <PageHeader
        eyebrow={page.meta.eyebrow}
        title={page.meta.title}
        lede={page.meta.description}
      />
      <article className="prose-invert max-w-3xl">
        <MDX source={page.body} />
      </article>
      <ContactCTA />
    </div>
  );
}
