import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/site/PageHeader";
import { Reveal } from "@/components/site/Reveal";
import { ContactCTA } from "@/components/home/ContactCTA";
import { CommonQuestions } from "@/components/content/CommonQuestions";
import { ServiceRow } from "@/components/services/ServiceRow";
import { StructuredDataBreadcrumb } from "@/components/site/StructuredData";
import { loadBuyerPages, loadServices } from "@/content/loaders";
import { MDX } from "@/content/mdx";
import { buildMetadata, SITE } from "@/lib/seo";

export const revalidate = 3600;

export async function generateStaticParams() {
  const pages = await loadBuyerPages();
  return pages.map((p) => ({ slug: p.meta.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const pages = await loadBuyerPages();
  const p = pages.find((x) => x.meta.slug === slug);
  if (!p) return { title: "Not found" };
  return buildMetadata({
    title: p.meta.seoTitle ?? p.meta.title,
    description: p.meta.metaDescription ?? p.meta.lede,
    path: `/for/${slug}`,
  });
}

// A page for one kind of buyer, in reading order: the answer (who it is for,
// where, what it costs, one named client), then the buyer's problems and what
// I build for them, then the services themselves as the same rows /services
// shows (so each price is read from its own service page, never retyped
// here), then the buyer's questions, then the ask.
//
// The back link goes to /services: there is no /for index, because two pages
// do not need one, and a page listing buyer pages would be a doorway.
export default async function BuyerPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const [pages, services] = await Promise.all([loadBuyerPages(), loadServices()]);
  const p = pages.find((x) => x.meta.slug === slug);
  if (!p) notFound();

  // Fails the build, not the reader: a renamed service would otherwise drop
  // its row from this page with nothing to say it went.
  const linked = p.meta.services.map((s) => {
    const found = services.find((x) => x.meta.slug === s);
    if (!found) {
      throw new Error(
        `content/buyers/${slug}.mdx lists service "${s}", and no service has that slug. Fix the slug or remove it.`,
      );
    }
    return found;
  });

  const url = `${SITE.url}/for/${slug}`;

  return (
    <div>
      <StructuredDataBreadcrumb
        items={[
          { name: "Home", url: SITE.url },
          { name: "Services", url: `${SITE.url}/services` },
          { name: `For ${p.meta.buyer}`, url },
        ]}
      />

      <PageHeader
        eyebrow={
          <>
            <span className="sr-only">All services, </span>
            For {p.meta.buyer}
          </>
        }
        eyebrowHref="/services"
        title={p.meta.title}
        lede={p.meta.lede}
      />

      <article className="mt-14 max-w-[68ch] md:mt-20">
        <MDX source={p.body} />
      </article>

      <section aria-labelledby="buyer-services" className="mt-20 md:mt-28">
        {/* A label-sized h2, like the track labels on /services. */}
        <h2
          id="buyer-services"
          className="text-caption font-medium tracking-normal text-ink-400 [font-stretch:100%]"
        >
          The services, with their prices
        </h2>
        <Reveal className="reveal-quiet">
          <div className="mt-3 border-t border-line">
            <div className="reveal-stagger divide-y divide-line-soft">
              {linked.map((s) => (
                <div key={s.meta.slug}>
                  <ServiceRow meta={s.meta} />
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      <CommonQuestions faqs={p.meta.faqs} className="mt-20 max-w-[68ch] md:mt-28" />

      <div className="mt-24 md:mt-32">
        <ContactCTA />
      </div>
    </div>
  );
}
