import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { MDX } from "@/content/mdx";
import { PageHeader } from "@/components/site/PageHeader";
import { ContactCTA } from "@/components/home/ContactCTA";
import { Reveal } from "@/components/site/Reveal";
import {
  fitsInsideCell,
  kindLabel,
  OriginChip,
} from "@/components/site/GraphicsMeta";
import {
  GALLERY_SIZES,
  Lightbox,
  type LightboxFrame,
} from "@/components/site/Lightbox";
import { StructuredDataBreadcrumb } from "@/components/site/StructuredData";
import { ArticleBody } from "@/components/content/ArticleBody";
import { CinematicVideo } from "@/components/content/CinematicVideo";
import { extractToc } from "@/components/content/longform";
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

// A gallery cell widened to close an odd last row spans the whole container,
// so it asks for a larger candidate than a half-width cell.
const WIDE_SIZES = "(min-width: 768px) 1104px, 100vw";

export default async function GraphicsItemPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const items = await loadGraphics();
  const g = items.find((i) => i.meta.slug === slug);
  if (!g) notFound();

  // How each gallery frame is presented, resolved once on the server and used by
  // both the grid below and the lightbox. Three decisions per frame:
  //  - fit: contain vs cover, see fitsInsideCell.
  //  - onLight: a mark drawn for light backgrounds is black art, and black art
  //    on the gallery's near-black cell is an empty box. Those assets get the
  //    surface they were designed for, which is also the more honest
  //    presentation: showing each variant on its intended background is itself
  //    the thing being demonstrated.
  //  - wide: an odd count leaves the last frame alone in a half row, so it
  //    takes the full row as the closing frame instead (21/9 at md). Its
  //    `sizes` travels with it so the lightbox opens on the cached candidate.
  // Resolved here rather than inside the lightbox so the enlarged frame can
  // never disagree with the cell the reader clicked.
  const n = g.meta.gallery.length;
  const frames: (LightboxFrame & { wide: boolean })[] = g.meta.gallery.map((img, i) => {
    const wide = n > 1 && n % 2 === 1 && i === n - 1;
    return {
      ...img,
      fit: fitsInsideCell(img),
      onLight: img.src.includes("-dark"),
      wide,
      sizes: wide ? WIDE_SIZES : undefined,
    };
  });
  const hasBody = g.body.trim().length > 0;
  const hasProcess = g.meta.tools.length > 0 || Boolean(g.meta.processNote);
  // The rail lists the sections below the article too, so a reader can jump
  // straight to the frames or the process note from the top of the page.
  const toc = [
    ...extractToc(g.body),
    ...(frames.length > 0 ? [{ id: "frames", text: "Frames" }] : []),
    ...(hasProcess ? [{ id: "how-made", text: "How it was made" }] : []),
  ];

  return (
    <div>
      <StructuredDataBreadcrumb
        items={[
          { name: "Home", url: SITE.url },
          { name: "Graphics", url: `${SITE.url}/graphics` },
          { name: g.meta.title, url: `${SITE.url}/graphics/${slug}` },
        ]}
      />

      {/* No .read-track: a graphics page is looked at more than read (lead
          media, a short note, then frames), and the header draws no progress
          line on /graphics, so the class would do nothing here. */}
      <article>
        <PageHeader
          eyebrow="Graphics"
          eyebrowHref="/graphics"
          title={g.meta.title}
          lede={g.meta.summary}
        >
          {/* Provenance is the header's second fact, so it sits in the
              opening rather than as a footnote. */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="text-caption text-ink-500">
              {kindLabel(g.meta.kind)} · {g.meta.year}
            </p>
            <OriginChip origin={g.meta.origin} />
          </div>
        </PageHeader>

        {/* Lead media is the fold, so it is deliberately outside a <Reveal>:
            the cover is the LCP element here and must not wait on an observer.
            It carries the same shared-element name as its index card, so the
            card's frame grows into this one on navigation.
            The scroll cinematic uses the video branch, because the motion IS
            the work there. It is press to play for everyone: the poster is the
            same file the cover uses, so the fold paints that still at once,
            and the clip is only fetched when the reader asks for it. The file
            has no audio track, so one play/pause control replaces native
            chrome.
            Any src here must sit under public/: next.config.ts declares no
            media-src, so the CSP falls back to default-src 'self' and a
            cross-origin source would be blocked at runtime after shipping
            green. See the note on the video field in src/content/schema.ts. */}
        <div className="mt-10 md:mt-14">
          <ViewTransition name={`gfx-${g.meta.slug}`} share="morph-media" default="none">
            {g.meta.video ? (
              <div className="frame-lit relative aspect-video overflow-hidden rounded-2xl">
                <CinematicVideo
                  src={g.meta.video.src}
                  poster={g.meta.video.poster ?? g.meta.cover.src}
                  label={g.meta.cover.alt}
                  className="absolute inset-0"
                />
              </div>
            ) : (
              // A mark is contained rather than cropped, and a mark filling a
              // 16/10 band reads as a poster of a logo. It gets the short 21/9
              // band its index card uses, so the shared-element morph also
              // keeps its proportions.
              <div
                className={`frame-lit relative overflow-hidden rounded-2xl ${
                  fitsInsideCell(g.meta.cover) ? "aspect-[4/3] md:aspect-[21/9]" : "aspect-[16/10]"
                }`}
              >
                <Image
                  src={g.meta.cover.src}
                  alt={g.meta.cover.alt}
                  fill
                  sizes="(min-width: 1152px) 1104px, 100vw"
                  priority
                  className={
                    fitsInsideCell(g.meta.cover)
                      ? "object-contain p-12 md:p-20"
                      : "object-cover"
                  }
                />
              </div>
            )}
          </ViewTransition>
        </div>

        {/* The MDX body, between the lead media and the gallery, because it is
            the piece's own narrative: the reader has seen the thing, reads what
            it is, then walks the supporting frames. */}
        {hasBody ? (
          <ArticleBody toc={toc} className="mt-16 md:mt-24">
            <MDX source={g.body} />
          </ArticleBody>
        ) : null}
      </article>

      {/* The gallery grid is server-rendered and stays that way. Each cell is a
          real link to the image file, so with scripting off the reader can still
          see every frame here and still open any of them full size. <Lightbox>
          takes the finished grid as children and only intercepts the click once
          it is running; it never renders a frame itself, which is what keeps the
          enhancement from becoming the only route to the image. */}
      {frames.length > 0 ? (
        <section aria-labelledby="frames" className="mt-20 md:mt-28">
          <h2 id="frames" className="scroll-mt-28 text-subsection font-semibold text-ink-50">
            Frames
          </h2>
          <p className="mt-2 text-caption text-ink-500">
            {frames.length} {frames.length === 1 ? "image" : "images"}. Open any of them full size.
          </p>
          <Reveal className="mt-8">
            <Lightbox title={g.meta.title} frames={frames}>
              <div className="reveal-stagger grid gap-5 md:grid-cols-2">
                {frames.map((img, i) => (
                  <a
                    key={img.src}
                    href={img.src}
                    data-lightbox-index={i}
                    className={`frame-lit group relative block overflow-hidden rounded-2xl ${
                      img.wide ? "aspect-[4/3] md:col-span-2 md:aspect-[21/9]" : "aspect-[4/3]"
                    }`}
                  >
                    {/* Art drawn for a light background gets that background
                        inside the frame, inset so the lit edge stays. */}
                    {img.onLight ? (
                      <span aria-hidden className="absolute inset-0 bg-ink-200" />
                    ) : null}
                    <Image
                      src={img.src}
                      alt={img.alt}
                      fill
                      sizes={img.sizes ?? GALLERY_SIZES}
                      className={`transition-transform duration-700 ease-out-expo group-hover:scale-[1.02] ${
                        img.fit ? "object-contain p-8 md:p-12" : "object-cover"
                      }`}
                    />
                  </a>
                ))}
              </div>
            </Lightbox>
          </Reveal>
        </section>
      ) : null}

      {hasProcess ? (
        <Reveal className="reveal-quiet mt-20 md:mt-28">
          <section
            aria-labelledby="how-made"
            className="grid gap-x-16 gap-y-8 border-t border-line pt-10 lg:grid-cols-[minmax(0,1fr)_13.5rem]"
          >
            <div className="min-w-0 max-w-[68ch]">
              <h2 id="how-made" className="scroll-mt-28 text-subsection font-semibold text-ink-50">
                How it was made
              </h2>
              {g.meta.processNote ? (
                <p className="mt-5 text-prose text-ink-300">{g.meta.processNote}</p>
              ) : null}
            </div>
            {g.meta.tools.length > 0 ? (
              <div>
                <p className="text-caption font-medium text-ink-500">Tools</p>
                <ul className="mt-3 space-y-2 text-[0.9375rem] leading-snug text-ink-300">
                  {g.meta.tools.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        </Reveal>
      ) : null}

      <div className="mt-20 md:mt-28">
        <ContactCTA />
      </div>
    </div>
  );
}
