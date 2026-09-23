import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/site/PageHeader";
import { JobApplicationForm } from "@/components/lead/JobApplicationForm";
import {
  StructuredDataBreadcrumb,
  StructuredDataJobPosting,
} from "@/components/site/StructuredData";
import {
  getCareersRole,
  getCareersRoles,
  employmentLabel,
  jobDescriptionHtml,
} from "@/lib/careers";
import { buildMetadata, SITE } from "@/lib/seo";
import { buttonClass } from "@/components/ui/Button";
import { PageLight } from "@/components/conversion/PageLight";
import { cn } from "@/lib/cn";

// Read HQ's published snapshot; re-fetch every 5 min. New roles not pre-built
// at deploy time render on demand (dynamicParams defaults to true).
export const revalidate = 300;

export async function generateStaticParams() {
  return (await getCareersRoles()).map((j) => ({ slug: j.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const job = await getCareersRole(slug);
  if (!job) return { title: "Not found" };
  return buildMetadata({
    title: `${job.title} · Careers`,
    description: job.summary,
    path: `/careers/${slug}`,
  });
}

export default async function CareerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const job = await getCareersRole(slug);
  if (!job) notFound();

  const url = `${SITE.url}/careers/${slug}`;
  const datePosted = job.publishedAt ?? new Date().toISOString().slice(0, 10);

  return (
    <div className="relative isolate">
      <PageLight />
      <StructuredDataJobPosting
        title={job.title}
        description={jobDescriptionHtml(job)}
        url={url}
        identifier={job.slug}
        datePosted={datePosted}
        validThrough={job.validThrough}
        employmentType={job.employmentType}
        remote={job.remote}
        applicantRegion={job.applicantRegion}
        location={job.location}
        addressLocality={job.addressLocality}
        addressRegion={job.addressRegion}
        addressCountry={job.addressCountry}
        salaryCurrency={job.salaryCurrency}
        salaryMin={job.salaryMin}
        salaryMax={job.salaryMax}
        salaryUnit={job.salaryUnit}
      />
      <StructuredDataBreadcrumb
        items={[
          { name: "Home", url: SITE.url },
          { name: "Careers", url: `${SITE.url}/careers` },
          { name: job.title, url },
        ]}
      />

      <PageHeader eyebrow="All roles" eyebrowHref="/careers" title={job.title} lede={job.summary}>
        <a href="#apply" className={cn("group", buttonClass())}>
          Apply for this role
          <span aria-hidden className="inline-block transition-transform duration-300 ease-out-expo group-hover:translate-y-0.5">
            ↓
          </span>
        </a>
      </PageHeader>

      <div className="mt-12 grid gap-14 md:mt-16 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-20">
        <article className="min-w-0 max-w-[68ch] space-y-12">
          <p className="text-prose text-ink-300">{job.about}</p>
          <Section title="What you will do" items={job.responsibilities} />
          <Section title="What I am looking for" items={job.requirements} />
          {job.niceToHave.length > 0 ? (
            <Section title="Nice to have" items={job.niceToHave} />
          ) : null}
        </article>

        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <dl className="divide-y divide-line-soft border-y border-line">
            <Meta label="Team" value={job.team} />
            <Meta label="Employment" value={employmentLabel(job.employmentType)} />
            <Meta label="Location" value={job.location} />
            {job.compensation ? <Meta label="Pay" value={job.compensation} /> : null}
          </dl>
          <p className="mt-6 text-caption text-ink-400">
            Not quite the right role, but think you should be working with me?{" "}
            <Link href="/contact" className="link-quiet">
              Get in touch
            </Link>
            .
          </p>
        </aside>
      </div>

      {/* The apply panel. "I read every application myself" is said once,
          here; the form below no longer repeats it in its own intro, and the
          confirmation does not either. */}
      <section
        id="apply"
        aria-labelledby="apply-title"
        className="panel-lit relative isolate mt-24 scroll-mt-24 overflow-hidden rounded-3xl px-5 py-9 sm:p-10 md:mt-32 md:p-14"
      >
        <div aria-hidden className="ember-rise pointer-events-none absolute inset-0 -z-10 opacity-70" />
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-16">
          <div>
            <h2 id="apply-title" className="max-w-[18ch] text-section font-semibold text-ink-50">
              Apply for {job.title}.
            </h2>
            <p className="mt-4 max-w-[44ch] text-ink-300">
              It comes straight to me, marked with this role, so I know what you applied for
              before I reply. I read every application myself.
            </p>
          </div>
          <JobApplicationForm
            sourcePage={`/careers/${slug}`}
            roleTitle={job.title}
            screeningQuestions={job.screeningQuestions}
          />
        </div>
      </section>
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h2 className="text-reference font-semibold text-ink-50">{title}</h2>
      <ul className="mt-4 list-disc space-y-2.5 pl-5 text-prose text-ink-300 marker:text-ink-600">
        {items.map((it) => (
          <li key={it} className="pl-1.5">
            {it}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 py-3.5">
      <dt className="text-caption text-ink-500">{label}</dt>
      <dd className="text-sm text-ink-200">{value}</dd>
    </div>
  );
}
