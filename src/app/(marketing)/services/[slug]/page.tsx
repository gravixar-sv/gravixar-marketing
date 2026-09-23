import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/site/PageHeader";
import { Reveal } from "@/components/site/Reveal";
import { MDX } from "@/content/mdx";
import { Arrow, buttonClass } from "@/components/ui/Button";
import {
  StructuredDataBreadcrumb,
  StructuredDataService,
} from "@/components/site/StructuredData";
import { extractPairings, splitAtMarkers } from "@/components/services/body";
import { DemoFigure, hasDemoFigure } from "@/components/services/DemoFigure";
import { FactsLedger, ledgerFor } from "@/components/services/FactsLedger";
import { primaryCta, termsFor, TRACK_LABEL } from "@/components/services/model";
import { ServiceAside } from "@/components/services/ServiceAside";
import { ServiceClosing } from "@/components/services/ServiceClosing";
import { TermsStrip } from "@/components/services/TermsStrip";
import { loadServices } from "@/content/loaders";
import { cn } from "@/lib/cn";
import { buildMetadata, SITE } from "@/lib/seo";

export const revalidate = 3600;

export async function generateStaticParams() {
  const services = await loadServices();
  return services.map((s) => ({ slug: s.meta.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const services = await loadServices();
  const s = services.find((x) => x.meta.slug === slug);
  if (!s) return { title: "Not found" };
  return buildMetadata({
    title: s.meta.title,
    description: s.meta.metaDescription ?? s.meta.tagline,
    path: `/services/${slug}`,
  });
}

// The detail template is built around the decision, in reading order:
//   1. the headline, the one-line promise, and the deal (price, scope,
//      timeline) with the primary action, all above the fold on any screen;
//   2. the article in a reading column, with a spec aside beside it: what you
//      get (md up), the proof, what it pairs with, then a small sticky deal
//      card. MDX comment markers place a facts ledger or a real demo
//      screenshot between runs of prose (see splitAtMarkers);
//   3. the closing panel (#start), where the header's button lands.
// Before this, the $3,500 front door showed its price at the bottom of the
// aside on desktop and after the whole article on a phone.
export default async function ServicePage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const services = await loadServices();
  const s = services.find((x) => x.meta.slug === slug);
  if (!s) notFound();

  const { body, pairings } = extractPairings(s.body);
  const ledger = ledgerFor(slug, body);
  // Only markers this page can fill are split out; any other comment stays in
  // the MDX, where it renders nothing.
  const markers = [...(ledger ? ["facts-ledger"] : []), ...(hasDemoFigure(slug) ? ["demo-shot"] : [])];
  const parts = splitAtMarkers(body, markers);
  const terms = termsFor(s.meta);
  // The back link names where the page sits on /services. The two
  // existing-clients offers are not in a menu group there, only in the
  // sentence under it, so they say that instead of a group the index never
  // shows. The hidden prefix makes the link's name say where it goes.
  const group =
    s.meta.audience === "existing-clients" ? "For existing clients" : TRACK_LABEL[s.meta.track];

  return (
    <div>
      <StructuredDataService
        name={s.meta.title}
        description={s.meta.tagline}
        url={`${SITE.url}/services/${slug}`}
      />
      <StructuredDataBreadcrumb
        items={[
          { name: "Home", url: SITE.url },
          { name: "Services", url: `${SITE.url}/services` },
          { name: s.meta.title, url: `${SITE.url}/services/${slug}` },
        ]}
      />

      <PageHeader
        eyebrow={
          <>
            <span className="sr-only">All services, </span>
            {group}
          </>
        }
        eyebrowHref="/services"
        title={s.meta.title}
        titleTransition={`svc-${slug}`}
        lede={s.meta.tagline}
      >
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-14">
          <TermsStrip terms={terms} className="lg:max-w-[46rem] lg:flex-1" />
          <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
            <a href="#start" className={cn(buttonClass(), "group w-full sm:w-auto")}>
              {primaryCta(s.meta)}
              <Arrow />
            </a>
            {/* From md the navbar carries "Book a call" directly above this
                row, so the page's own copy is for phones, where the navbar
                folds into the menu. Class order matters: md:hidden goes after
                buttonClass's inline-flex. */}
            <Link
              href="/contact"
              className={cn(buttonClass({ variant: "ghost" }), "w-full sm:w-auto md:hidden")}
            >
              Book a call
            </Link>
          </div>
        </div>
      </PageHeader>

      <div className="mt-14 grid gap-16 md:mt-20 md:grid-cols-12 md:gap-x-10 lg:gap-x-16">
        <article className="min-w-0 max-w-[68ch] md:col-span-7">
          {parts.map((part, i) => {
            if (part.kind === "mdx") return <MDX key={i} source={part.source} />;
            if (part.name === "facts-ledger" && ledger) {
              return (
                <Reveal key={i} className="reveal-quiet">
                  <FactsLedger caption={ledger.caption} groups={ledger.groups} />
                </Reveal>
              );
            }
            if (part.name === "demo-shot") {
              return (
                <Reveal key={i}>
                  <DemoFigure slug={slug} />
                </Reveal>
              );
            }
            return null;
          })}
        </article>

        <ServiceAside
          meta={s.meta}
          pairings={pairings}
          className="md:col-span-5 lg:col-span-4 lg:col-start-9"
        />
      </div>

      <div className="mt-24 md:mt-32">
        <ServiceClosing meta={s.meta} sourcePage={`/services/${slug}`} />
      </div>
    </div>
  );
}
