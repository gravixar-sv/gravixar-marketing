import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/site/PageHeader";
import { Reveal } from "@/components/site/Reveal";
import { PageLight } from "@/components/conversion/PageLight";
import { Arrow } from "@/components/ui/Button";
import { getCareersRoles, employmentLabel } from "@/lib/careers";
import { buildMetadata } from "@/lib/seo";

// Read HQ's published snapshot; re-fetch every 5 min so role changes show.
export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: "Careers at Gravixar, build systems that run",
  description:
    "Careers at Gravixar. Small on purpose: the systems I build run real businesses, and a person signs off on every AI action. For people who would rather ship something running than talk about it.",
  path: "/careers",
});

const LEDE = "Small on purpose. The systems I build run real businesses, and a person signs off on every AI action.";

export default async function CareersIndexPage() {
  const jobs = await getCareersRoles();
  const empty = jobs.length === 0;

  return (
    <div className="relative isolate">
      <PageLight />
      <PageHeader
        eyebrow="Careers"
        title="Build the AI-ops platform with me."
        // The apply-form sentence only makes sense when there is a form to
        // reach; with no roles open it promised something the page could not
        // deliver.
        lede={empty ? LEDE : `${LEDE} If a role fits, your application comes straight to me.`}
      />

      {empty ? (
        // An empty state that reads as a decision, not a missing section:
        // left-aligned on the page's own grid, no box around it.
        <section aria-labelledby="no-roles" className="mt-14 max-w-[40rem] md:mt-20">
          <h2 id="no-roles" className="text-section font-semibold text-ink-50">
            No open roles right now.
          </h2>
          <p className="mt-4 text-lead text-ink-300">
            If you would rather ship something running than talk about it,{" "}
            <Link href="/contact" className="link-quiet">
              get in touch anyway
            </Link>
            .
          </p>
          <p className="mt-8 text-caption text-ink-400">
            Or find me on{" "}
            <a href="https://www.linkedin.com/in/qamarabbas/" rel="noreferrer" className="link-quiet">
              LinkedIn
            </a>
            .
          </p>
        </section>
      ) : (
        <Reveal className="reveal-quiet mt-12 md:mt-16">
          <ul className="reveal-stagger border-t border-line">
            {jobs.map((job) => (
              <li key={job.slug} className="border-b border-line">
                <Link
                  href={`/careers/${job.slug}`}
                  className="group grid gap-3 py-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:gap-12 md:py-10"
                >
                  <div className="min-w-0">
                    <p className="text-caption text-ink-400">
                      {job.team} · {employmentLabel(job.employmentType)} · {job.location}
                    </p>
                    <h2 className="mt-2 text-subsection font-semibold text-ink-50">{job.title}</h2>
                    <p className="mt-3 max-w-[60ch] text-ink-400">{job.summary}</p>
                  </div>
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-ink-200 transition-colors group-hover:text-ink-50">
                    <span className="link-draw">View the role and apply</span>
                    <Arrow />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>
      )}
    </div>
  );
}
