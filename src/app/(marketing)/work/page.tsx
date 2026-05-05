import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/site/PageHeader";
import { ContactCTA } from "@/components/home/ContactCTA";
import { loadCaseStudies } from "@/content/loaders";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "Work",
  description: "Case studies of systems Qamar has built and shipped.",
  path: "/work",
});

export default async function WorkIndexPage() {
  const studies = await loadCaseStudies();
  return (
    <div className="space-y-16">
      <PageHeader
        eyebrow="work"
        title="Case studies, what shipped, what worked, what didn't."
        lede="Each entry is a real client engagement or a real product I built. The honest sections about what broke are the ones worth reading."
      />

      {studies.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-8 text-center">
          <p className="text-zinc-400">No case studies published yet.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {studies.map((cs) => (
            <Link
              key={cs.meta.slug}
              href={`/work/${cs.meta.slug}`}
              className="card-surface card-hover-glow group rounded-xl p-6"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 group-hover:text-brand">
                  {cs.meta.client}
                </p>
                <p className="font-mono text-[10px] text-zinc-600">{cs.meta.period}</p>
              </div>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.015em] text-zinc-100">
                {cs.meta.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                {cs.meta.summary}
              </p>
              {cs.meta.stack.length > 0 ? (
                <ul className="mt-5 flex flex-wrap gap-1.5">
                  {cs.meta.stack.slice(0, 5).map((s) => (
                    <li
                      key={s}
                      className="rounded-sm border border-zinc-800/80 bg-zinc-900/60 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              ) : null}
            </Link>
          ))}
        </div>
      )}

      <ContactCTA />
    </div>
  );
}
