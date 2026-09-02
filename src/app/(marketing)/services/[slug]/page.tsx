import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/site/PageHeader";
import { MDX } from "@/content/mdx";
import { ServiceInquiryForm } from "@/components/lead/ServiceInquiryForm";
import {
  StructuredDataBreadcrumb,
  StructuredDataService,
} from "@/components/site/StructuredData";
import { loadServices } from "@/content/loaders";
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
    description: s.meta.tagline,
    path: `/services/${slug}`,
  });
}

export default async function ServicePage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const services = await loadServices();
  const s = services.find((x) => x.meta.slug === slug);
  if (!s) notFound();

  return (
    <div className="space-y-16">
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
        eyebrow={s.meta.bucket}
        title={s.meta.title}
        lede={s.meta.tagline}
      />

      <div className="grid gap-12 md:grid-cols-3">
        <article className="prose-invert md:col-span-2">
          <MDX source={s.body} />
        </article>

        <aside className="space-y-8">
          <div>
            <h2 className="font-mono text-label uppercase text-brand">
              what you get
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-zinc-300">
              {s.meta.deliverables.map((d) => (
                <li key={d} className="flex gap-2">
                  <span className="text-brand-deep">→</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>

          {s.meta.proof.length > 0 ? (
            <div>
              <h2 className="font-mono text-label uppercase text-brand">
                proof
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {s.meta.proof.map((p) => {
                  const isExternal = p.kind === "external" || p.href.startsWith("http");
                  return (
                    <li key={p.href}>
                      {isExternal ? (
                        <a
                          href={p.href}
                          rel="noreferrer"
                          className="text-brand-soft underline-offset-4 hover:underline"
                        >
                          {p.label} ↗
                        </a>
                      ) : (
                        <Link
                          href={p.href}
                          className="text-brand-soft underline-offset-4 hover:underline"
                        >
                          {p.label} →
                        </Link>
                      )}
                      <span className="ml-2 font-mono text-label-sm uppercase text-muted">
                        {p.kind}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {s.meta.pricing ? (
            <div>
              <h2 className="font-mono text-label uppercase text-brand">
                pricing
              </h2>
              <p className="mt-3 text-sm text-zinc-300">{s.meta.pricing}</p>
            </div>
          ) : null}
        </aside>
      </div>

      <section className="live-panel relative overflow-hidden rounded-2xl p-8 md:p-12">
        <div
          aria-hidden
          className="bg-brand-glow pointer-events-none absolute inset-0 -z-0 opacity-60"
        />
        <div className="relative z-10 grid gap-10 md:grid-cols-2 md:items-start">
          <div>
            <p className="font-mono text-label uppercase text-brand">
              next step
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.015em] md:text-4xl">
              Tell me about your {s.meta.title.toLowerCase()} problem.
            </h2>
            <p className="mt-4 text-zinc-400">
              Lands in my HQ inbox tagged with this page, so when I reply I
              already know which service we&apos;re talking about. Replies
              within 24 hours.
            </p>
            <p className="mt-6 text-sm text-muted">
              Prefer a call?{" "}
              <Link
                href="/contact"
                className="text-brand-soft underline underline-offset-4 hover:text-brand"
              >
                Book 30 minutes
              </Link>
              .
            </p>
          </div>
          <ServiceInquiryForm
            sourcePage={`/services/${slug}`}
            serviceTitle={s.meta.title}
          />
        </div>
      </section>
    </div>
  );
}
