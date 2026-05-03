import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadGraphics } from "@/content/loaders";
import { buildMetadata } from "@/lib/seo";

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
    title: g.meta.title,
    description: `${g.meta.kind} · ${g.meta.year}`,
    path: `/graphics/${slug}`,
    ogImage: g.meta.cover.src,
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
    <div className="space-y-12">
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-brand">
          {g.meta.kind} · {g.meta.year}
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
          {g.meta.title}
        </h1>
      </header>

      {g.meta.video ? (
        <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
          <video
            src={g.meta.video.src}
            poster={g.meta.video.poster}
            controls
            playsInline
            className="aspect-video w-full"
          />
        </div>
      ) : (
        <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
          <Image
            src={g.meta.cover.src}
            alt={g.meta.cover.alt}
            fill
            sizes="100vw"
            priority
            className="object-cover"
          />
        </div>
      )}

      {g.meta.gallery.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {g.meta.gallery.map((img) => (
            <div
              key={img.src}
              className="relative aspect-[4/3] overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950"
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      ) : null}

      <aside className="grid gap-8 md:grid-cols-3">
        {g.meta.tools.length > 0 ? (
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-brand">
              Tools
            </p>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {g.meta.tools.map((t) => (
                <li
                  key={t}
                  className="rounded-sm border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-[10px] text-zinc-300"
                >
                  {t}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {g.meta.processNote ? (
          <div className="md:col-span-2">
            <p className="font-mono text-[11px] uppercase tracking-widest text-brand">
              Process
            </p>
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">
              {g.meta.processNote}
            </p>
          </div>
        ) : null}
      </aside>

      <footer className="border-t border-zinc-900 pt-6">
        <Link href="/graphics" className="text-sm text-brand-soft hover:underline">
          ← Back to gallery
        </Link>
      </footer>
    </div>
  );
}
