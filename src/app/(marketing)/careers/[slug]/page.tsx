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
  getJob,
  getOpenJobs,
  employmentLabel,
  jobDescriptionHtml,
} from "@/content/jobs";
import { buildMetadata, SITE } from "@/lib/seo";

export const revalidate = 3600;

export async function generateStaticParams() {
  return getOpenJobs().map((j) => ({ slug: j.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const job = getJob(slug);
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
  const job = getJob(slug);
  if (!job) notFound();

  const url = `${SITE.url}/careers/${slug}`;

  return (
    <div className="space-y-16">
      <StructuredDataJobPosting
        title={job.title}
        description={jobDescriptionHtml(job)}
        url={url}
        identifier={job.slug}
        datePosted={job.publishedAt}
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

      <PageHeader eyebrow={job.team} title={job.title} lede={job.summary} />

      <div className="grid gap-12 md:grid-cols-3">
        <article className="prose-invert space-y-10 md:col-span-2">
          <p className="text-zinc-300">{job.about}</p>

          <Section title="What you will do" items={job.responsibilities} />
          <Section title="What I am looking for" items={job.requirements} />
          {job.niceToHave.length > 0 ? (
            <Section title="Nice to have" items={job.niceToHave} />
          ) : null}
        </article>

        <aside className="space-y-8">
          <dl className="space-y-4">
            <Meta label="employment" value={employmentLabel(job.employmentType)} />
            <Meta label="location" value={job.location} />
            {job.compensation ? (
              <Meta label="compensation" value={job.compensation} />
            ) : null}
          </dl>
          <p className="text-sm text-zinc-500">
            Not quite the right role but think you should be working with me?{" "}
            <Link
              href="/contact"
              className="text-brand-soft underline underline-offset-4 hover:text-brand"
            >
              Get in touch
            </Link>
            .
          </p>
        </aside>
      </div>

      <section className="live-panel relative overflow-hidden rounded-2xl p-8 md:p-12">
        <div
          aria-hidden
          className="bg-brand-glow pointer-events-none absolute inset-0 -z-0 opacity-60"
        />
        <div className="relative z-10 grid gap-10 md:grid-cols-2 md:items-start">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">
              apply
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.015em] md:text-4xl">
              Apply for {job.title}.
            </h2>
            <p className="mt-4 text-zinc-400">
              Lands in my HQ inbox tagged with this role, so when I reply I
              already know what you applied for. I read every application
              myself.
            </p>
          </div>
          <JobApplicationForm
            sourcePage={`/careers/${slug}`}
            roleTitle={job.title}
          />
        </div>
      </section>
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h2 className="font-mono text-[11px] uppercase tracking-widest text-brand">
        {title}
      </h2>
      <ul className="mt-3 space-y-2 text-sm text-zinc-300">
        {items.map((it) => (
          <li key={it} className="flex gap-2">
            <span className="text-brand-deep">→</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[11px] uppercase tracking-widest text-brand">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-zinc-300">{value}</dd>
    </div>
  );
}
