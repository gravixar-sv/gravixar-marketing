import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/site/PageHeader";
import { MDX } from "@/content/mdx";
import { ContactCTA } from "@/components/home/ContactCTA";
import { StructuredDataService } from "@/components/site/StructuredData";
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
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-brand">
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
              <h2 className="font-mono text-[11px] uppercase tracking-widest text-brand">
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
                      <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
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
              <h2 className="font-mono text-[11px] uppercase tracking-widest text-brand">
                pricing
              </h2>
              <p className="mt-3 text-sm text-zinc-300">{s.meta.pricing}</p>
            </div>
          ) : null}
        </aside>
      </div>

      <ContactCTA />
    </div>
  );
}
