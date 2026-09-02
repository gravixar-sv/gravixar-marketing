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
import {
  GALLERY_SIZES,
  Lightbox,
  type LightboxFrame,
} from "@/components/site/Lightbox";
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
    description: g.meta.metaDescription ?? g.meta.summary,
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

  // How each gallery frame is presented, resolved once on the server and used by
  // both the grid below and the lightbox. Two decisions per frame:
  //  - fit: contain vs cover, see fitsInsideCell.
  //  - onLight: a mark drawn for light backgrounds is black art, and black art
  //    on the gallery's near-black cell is an empty box. Those assets get the
  //    surface they were designed for, which is also the more honest
  //    presentation: showing each variant on its intended background is itself
  //    the thing being demonstrated.
  // Resolved here rather than inside the lightbox so the enlarged frame can
  // never disagree with the cell the reader clicked.
  const frames: LightboxFrame[] = g.meta.gallery.map((img) => ({
    ...img,
    fit: fitsInsideCell(img),
    onLight: img.src.includes("-dark"),
  }));

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
      <header className="border-b border-line-soft pb-10">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="font-mono text-eyebrow uppercase text-brand">
            {KIND_LABELS[g.meta.kind]} · {g.meta.year}
          </p>
          <OriginChip origin={g.meta.origin} />
        </div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-page">
          {g.meta.title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-400">
          {g.meta.summary}
        </p>
      </header>

      {/* Lead media is the fold, so it is deliberately outside a <Reveal>: the
          cover is the LCP element here and must not wait on an observer.
          The scroll cinematic uses the video branch, because the motion IS the
          work there and the index card was the only surface showing it: click
          the one moving card and the detail page answered with a still. Its
          poster is the same file the cover uses, so the fold still paints that
          image immediately and the LCP element does not change.
          Any src here must sit under public/: next.config.ts declares no
          media-src, so the CSP falls back to default-src 'self' and a
          cross-origin source would be blocked at runtime after shipping green.
          See the note on the video field in src/content/schema.ts. */}
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

      {/* The gallery grid is server-rendered and stays that way. Each cell is a
          real link to the image file, so with scripting off the reader can still
          see every frame here and still open any of them full size. <Lightbox>
          takes the finished grid as children and only intercepts the click once
          it is running; it never renders a frame itself, which is what keeps the
          enhancement from becoming the only route to the image. */}
      {frames.length > 0 ? (
        <Reveal>
          <Lightbox title={g.meta.title} frames={frames}>
            <div className="reveal-stagger grid gap-5 md:grid-cols-2">
              {frames.map((img, i) => (
                <a
                  key={img.src}
                  href={img.src}
                  data-lightbox-index={i}
                  className={`relative block aspect-[4/3] overflow-hidden rounded-xl border border-line transition-[border-color,translate] duration-200 ease-[var(--ease-out)] hover:border-brand/40 hover:-translate-y-0.5 ${
                    img.onLight ? "bg-zinc-200" : "bg-zinc-950"
                  }`}
                >
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    sizes={GALLERY_SIZES}
                    className={
                      img.fit ? "object-contain p-8 md:p-12" : "object-cover"
                    }
                  />
                </a>
              ))}
            </div>
          </Lightbox>
        </Reveal>
      ) : null}

      {g.meta.tools.length > 0 || g.meta.processNote ? (
        <Reveal className="reveal-quiet">
          <aside className="grid gap-8 border-t border-line-soft pt-10 md:grid-cols-3">
            {g.meta.tools.length > 0 ? (
              <div>
                <p className="font-mono text-label uppercase text-brand">
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
                <p className="font-mono text-label uppercase text-brand">
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
          className="font-mono text-label-sm uppercase text-zinc-400 transition-colors hover:text-brand"
        >
          ← Back to the showcase
        </Link>
      </div>

      <ContactCTA />
    </div>
  );
}
