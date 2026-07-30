import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDX } from "@/content/mdx";
import { ContactCTA } from "@/components/home/ContactCTA";
import { Reveal } from "@/components/site/Reveal";
import {
  fitsInsideCell,
  KIND_LABELS,
  OriginChip,
} from "@/components/site/GraphicsMeta";
import { StructuredDataBreadcrumb } from "@/components/site/StructuredData";
import { loadGraphics } from "@/content/loaders";
import { buildMetadata, SITE } from "@/lib/seo";

export const revalidate = 3600;

export async function generateStaticParams() {
  const items = await loadGraphics();
  return items.map((i) => ({ slug: i.meta.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const items = await loadGraphics();
  const g = items.find((i) => i.meta.slug === slug);
  if (!g) return { title: "Not found" };
  return buildMetadata({
    // summary, not "kind · year": the description is what a search result and a
    // share card read out, and a taxonomy pair says nothing about the piece.
    title: g.meta.title,
    description: g.meta.summary,
    path: `/graphics/${slug}`,
    // No ogImage: fall through to the branded /api/og card, as every case
    // study does. A real cover is the wrong share image here. One is WebP,
    // which unfurls unreliably on LinkedIn and some Slack paths, and the other
    // is 1:1 under a summary_large_image card that wants roughly 1.91:1.
  });
}

export default async function GraphicsItemPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const items = await loadGraphics();
  const g = items.find((i) => i.meta.slug === slug);
  if (!g) notFound();

  return (
    <div className="space-y-16">
      <StructuredDataBreadcrumb
        items={[
          { name: "Home", url: SITE.url },
          { name: "Graphics", url: `${SITE.url}/graphics` },
          { name: g.meta.title, url: `${SITE.url}/graphics/${slug}` },
        ]}
      />

      {/* Written out rather than using <PageHeader>, for the same reason
          /blog/[slug] writes its own: the meta row holds an element, the origin
          chip, beside the mono line. PageHeader takes an eyebrow string only,
          and flattening provenance into that string would render it as a
          footnote. It is the header's second fact, so it sits on the same row as
          kind and year. Weights match PageHeader exactly. */}
      <header className="border-b border-zinc-900 pb-10">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="font-mono text-xs uppercase tracking-widest text-brand">
            {KIND_LABELS[g.meta.kind]} · {g.meta.year}
          </p>
          <OriginChip origin={g.meta.origin} />
        </div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
          {g.meta.title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-400">
          {g.meta.summary}
        </p>
      </header>

      {/* Lead media is the fold, so it is deliberately outside a <Reveal>: the
          cover is the LCP element here and must not wait on an observer.
          The video branch stays wired but no entry uses it: next.config.ts
          declares no media-src, so the CSP falls back to default-src 'self' and
          a cross-origin source would be blocked at runtime after shipping
          green. See the note on the video field in src/content/schema.ts. */}
      {g.meta.video ? (
        <div className="overflow-hidden rounded-xl border border-line bg-zinc-950">
          <video
            src={g.meta.video.src}
            poster={g.meta.video.poster}
            controls
            playsInline
            className="aspect-video w-full"
          />
        </div>
      ) : (
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-line bg-zinc-950">
          <Image
            src={g.meta.cover.src}
            alt={g.meta.cover.alt}
            fill
            sizes="100vw"
            priority
            className={
              fitsInsideCell(g.meta.cover)
                ? "object-contain p-10 md:p-16"
                : "object-cover"
            }
          />
        </div>
      )}

      {/* The MDX body. It sits between the lead media and the gallery because it
          is the piece's own narrative: the reader has seen the thing, reads what
          it is, then walks the supporting frames. processNote stays in the aside
          as reference, so prose written under the frontmatter no longer has to
          squeeze into a single field. */}
      {g.body.trim().length > 0 ? (
        <Reveal className="reveal-quiet">
          <article className="prose-invert max-w-3xl">
            <MDX source={g.body} />
          </article>
        </Reveal>
      ) : null}

      {g.meta.gallery.length > 0 ? (
        <Reveal>
          <div className="reveal-stagger grid gap-5 md:grid-cols-2">
            {g.meta.gallery.map((img) => {
              const fit = fitsInsideCell(img);
              // A mark drawn for light backgrounds is black art, and black art
              // on the gallery's near-black cell is an empty box. Those assets
              // get the surface they were designed for, which is also the more
              // honest presentation: showing each variant on its intended
              // background is itself the thing being demonstrated.
              const onLight = img.src.includes("-dark");
              return (
                <div
                  key={img.src}
                  className={`relative aspect-[4/3] overflow-hidden rounded-xl border border-line ${
                    onLight ? "bg-zinc-200" : "bg-zinc-950"
                  }`}
                >
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className={fit ? "object-contain p-8 md:p-12" : "object-cover"}
                  />
                </div>
              );
            })}
          </div>
        </Reveal>
      ) : null}

      {g.meta.tools.length > 0 || g.meta.processNote ? (
        <Reveal className="reveal-quiet">
          <aside className="grid gap-8 border-t border-line-soft pt-10 md:grid-cols-3">
            {g.meta.tools.length > 0 ? (
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">
                  tools
                </p>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {g.meta.tools.map((t) => (
                    <li
                      key={t}
                      className="rounded-sm border border-line-soft bg-zinc-900/60 px-2 py-1 font-mono text-[10px] text-zinc-300"
                    >
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {g.meta.processNote ? (
              <div className="md:col-span-2">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">
                  process
                </p>
                <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                  {g.meta.processNote}
                </p>
              </div>
            ) : null}
          </aside>
        </Reveal>
      ) : null}

      <div>
        <Link
          href="/graphics"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400 transition-colors hover:text-brand"
        >
          ← Back to the showcase
        </Link>
      </div>

      <ContactCTA />
    </div>
  );
}
