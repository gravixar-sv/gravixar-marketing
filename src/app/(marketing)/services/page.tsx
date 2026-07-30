import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/site/PageHeader";
import { ContactCTA } from "@/components/home/ContactCTA";
import { loadServices } from "@/content/loaders";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "Operations infrastructure, AI tooling, audits, brand work",
  description:
    "Operations infrastructure, AI tooling, brand work, a system audit where findings survive a refutation pass, and a retainer that keeps AI honest after it ships.",
  path: "/services",
});

// The two tracks, in render order, each label one clause of the h1 so the
// heading works as this page's table of contents. A service's `track` decides
// which row it lands in, so nothing here has to know how many services exist,
// and an empty track renders nothing. The homepage leaves its equivalent bands
// unlabelled and lets spacing carry the split; the index labels them because
// /modules labels its groups, and because on the page where someone is
// choosing, "is this a project or a commitment" is the question to answer
// before the click.
const TRACKS = [
  { id: "build", label: "what i build" },
  { id: "ongoing", label: "what i keep honest" },
] as const;

// A track's cards each span 12 / (services in that track), so every row fills
// completely and no count leaves an orphan. 12 divides by 1, 2, 3, 4, 6 and
// 12, which covers any realistic service count. This is a lookup rather than
// `md:col-span-${12 / count}` because Tailwind only generates classes it can
// read as literal strings in the source; an interpolated one compiles to
// nothing and the card silently loses its span. A count 12 cannot divide
// (5, 7, 8...) falls back to thirds and wraps, which is ugly but not broken.
const TRACK_SPAN: Record<number, string> = {
  1: "md:col-span-12",
  2: "md:col-span-6",
  3: "md:col-span-4",
  4: "md:col-span-3",
  6: "md:col-span-2",
  12: "md:col-span-1",
};

export default async function ServicesIndexPage() {
  const services = await loadServices();

  return (
    <div className="space-y-16">
      <PageHeader
        eyebrow="services"
        title="What I build, and what I keep honest after it ships."
        lede="Pick the one that maps to your problem. Each page links to the proof: a case study, a live demo, or a system running in production."
      />

      {TRACKS.map(({ id, label }) => {
        const inTrack = services.filter((s) => s.meta.track === id);
        if (inTrack.length === 0) return null;
        const span = TRACK_SPAN[inTrack.length] ?? "md:col-span-4";

        return (
          <section key={id}>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">
              {label}
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-12">
              {inTrack.map((s) => (
                <Link
                  key={s.meta.slug}
                  href={`/services/${s.meta.slug}`}
                  className={`card-surface card-hover-glow group flex flex-col rounded-xl p-6 ${span}`}
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 group-hover:text-brand">
                    {s.meta.bucket}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.015em] text-zinc-100">
                    {s.meta.title}
                  </h2>
                  {/* Measured, not free. A third of the row is ~34 characters a
                      line and a half is ~55, both fine, but a lone service in
                      its own track spans all 12 and an uncapped tagline would
                      cross 110 characters, which is a line nobody tracks back
                      from. The cap costs the halves about four characters and
                      makes any span readable. */}
                  <p className="mt-3 max-w-[54ch] text-sm leading-relaxed text-zinc-400">
                    {s.meta.tagline}
                  </p>
                  {s.meta.proof.length > 0 ? (
                    // mt-auto, because a row's cards stretch to the tallest
                    // card and the proof count is the row's shared baseline.
                    <p className="mt-auto pt-5 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600 group-hover:text-brand">
                      {s.meta.proof.length} proof{s.meta.proof.length > 1 ? "s" : ""}
                      <span className="ml-1 inline-block transition-transform group-hover:translate-x-0.5">→</span>
                    </p>
                  ) : null}
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <ContactCTA />
    </div>
  );
}
