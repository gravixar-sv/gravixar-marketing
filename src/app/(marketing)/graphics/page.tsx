import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PageHeader } from "@/components/site/PageHeader";
import { loadGraphics } from "@/content/loaders";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "Brand and Visual Systems, Motion and Identity",
  description:
    "Visual identity, motion, and brand work for Gravixar and clients: logos, design systems, and the visuals that ship with every build.",
  path: "/graphics",
});

export default async function GraphicsIndexPage() {
  const items = await loadGraphics();
  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="graphics"
        title="Visual identity, motion, brand work."
        lede="Pick what speaks to you. The work itself is the brief."
      />

      {items.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-8 text-center">
          <p className="text-zinc-400">Gallery coming online soon.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((g) => (
            <Link
              key={g.meta.slug}
              href={`/graphics/${g.meta.slug}`}
              className="group block overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/60 transition-colors hover:border-brand/60"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-zinc-900">
                <Image
                  src={g.meta.cover.src}
                  alt={g.meta.cover.alt}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </div>
              <div className="p-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  {g.meta.kind} · {g.meta.year}
                </p>
                <h2 className="mt-1 text-base font-medium tracking-tight text-zinc-100 group-hover:text-brand-soft">
                  {g.meta.title}
                </h2>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
