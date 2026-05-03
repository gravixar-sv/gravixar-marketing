import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/site/PageHeader";
import { ContactCTA } from "@/components/home/ContactCTA";
import { loadServices } from "@/content/loaders";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "Services",
  description:
    "Three buckets, operations infrastructure, people ops, AI-augmented work, plus a separate graphics offering. Each linked to live proof.",
  path: "/services",
});

export default async function ServicesIndexPage() {
  const services = await loadServices();
  return (
    <div className="space-y-16">
      <PageHeader
        eyebrow="services"
        title="Three buckets, plus design, all backed by something running."
        lede="Pick the one that maps to your problem. Each page links to a case study and (where applicable) a live demo you can poke."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {services.map((s) => (
          <Link
            key={s.meta.slug}
            href={`/services/${s.meta.slug}`}
            className="group rounded-lg border border-zinc-800 bg-zinc-950/60 p-6 transition-colors hover:border-brand/60"
          >
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 group-hover:text-brand">
              {s.meta.bucket}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">
              {s.meta.title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              {s.meta.tagline}
            </p>
            {s.meta.proof.length > 0 ? (
              <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                {s.meta.proof.length} proof{s.meta.proof.length > 1 ? "s" : ""} →
              </p>
            ) : null}
          </Link>
        ))}
      </div>
      <ContactCTA />
    </div>
  );
}
