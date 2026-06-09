import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/site/PageHeader";
import { getCareersRoles, employmentLabel } from "@/lib/careers";
import { buildMetadata } from "@/lib/seo";

// Read HQ's published snapshot; re-fetch every 5 min so role changes show.
export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: "Careers at Gravixar, Build Systems That Run",
  description:
    "Open roles at Gravixar. Small team, real systems running in production, a human on every approval. If you would rather ship something running than talk about it, read on.",
  path: "/careers",
});

export default async function CareersIndexPage() {
  const jobs = await getCareersRoles();

  return (
    <div className="space-y-16">
      <PageHeader
        eyebrow="careers"
        title="Build the AI-ops platform with me."
        lede="Small team on purpose. Real systems running live businesses, with a human on every approval. If a role fits, the apply form lands straight in my inbox."
      />

      {jobs.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-8 text-center">
          <p className="text-zinc-300">No open roles right now.</p>
          <p className="mt-2 text-sm text-zinc-500">
            If you think you should be working with me anyway,{" "}
            <Link
              href="/contact"
              className="text-brand-soft underline underline-offset-4 hover:text-brand"
            >
              get in touch
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((job) => (
            <Link
              key={job.slug}
              href={`/careers/${job.slug}`}
              className="card-surface card-hover-glow group rounded-xl p-6"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 group-hover:text-brand">
                {job.team} · {employmentLabel(job.employmentType)} ·{" "}
                {job.location}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.015em] text-zinc-100">
                {job.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                {job.summary}
              </p>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600 group-hover:text-brand">
                View role + apply
                <span className="ml-1 inline-block transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
