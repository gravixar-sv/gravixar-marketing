import type { Metadata } from "next";
import { PageHeader } from "@/components/site/PageHeader";
import { Portrait } from "@/components/site/Portrait";
import { MDX } from "@/content/mdx";
import { ContactCTA } from "@/components/home/ContactCTA";
import { loadPage } from "@/content/loaders";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const page = await loadPage("about");
  return buildMetadata({
    title: "About Gravixar, the operator behind the platform",
    description:
      "Qamar, founder of Gravixar, the AI-ops platform that runs operations with a human on every approval. Hands-on and close to every build since 2013.",
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
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] lg:gap-16">
        <article className="prose-invert min-w-0">
          <MDX source={page.body} />
        </article>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Portrait />
        </aside>
      </div>
      <ContactCTA />
    </div>
  );
}
