// Careers roles reader. HQ (hq.gravixar.com) is the source of truth: it
// publishes the OPEN roles to careers/postings.json on the shared Vercel Blob.
// This reads that snapshot. If the snapshot is missing/empty (or the token is
// unset), it falls back to the static src/content/jobs.ts so /careers never
// goes blank. The public posting shape mirrors HQ's PublicJobPosting
// (src/lib/jobPostings/publish.ts) — keep the two in sync.

import { list } from "@vercel/blob";
import { env } from "./env";
import { JOBS as STATIC_JOBS, type Job } from "@/content/jobs";

const SNAPSHOT_KEY = "careers/postings.json";

export type EmploymentType =
  | "FULL_TIME"
  | "PART_TIME"
  | "CONTRACTOR"
  | "INTERN";

export interface ScreeningQuestion {
  id: string;
  label: string;
  type: "text" | "textarea" | "yesno" | "select";
  required: boolean;
  options?: string[];
}

export interface PublicJobPosting {
  slug: string;
  title: string;
  team: string;
  location: string;
  remote: boolean;
  applicantRegion: string;
  addressLocality?: string;
  addressRegion?: string;
  addressCountry?: string;
  employmentType: EmploymentType;
  compensation?: string;
  salaryCurrency?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryUnit?: "HOUR" | "DAY" | "WEEK" | "MONTH" | "YEAR";
  validThrough?: string;
  publishedAt?: string; // YYYY-MM-DD; HQ snapshot may omit (falls back below)
  summary: string;
  about: string;
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
  screeningQuestions: ScreeningQuestion[];
  order: number;
}

interface Snapshot {
  generatedAt?: string;
  postings?: PublicJobPosting[];
}

async function fetchSnapshot(): Promise<PublicJobPosting[] | null> {
  if (!env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const found = await list({
      prefix: SNAPSHOT_KEY,
      token: env.BLOB_READ_WRITE_TOKEN,
    });
    const match = found.blobs.find((b) => b.pathname === SNAPSHOT_KEY);
    if (!match) return null;
    // `next: { revalidate }` rather than `cache: "no-store"`, and the
    // difference is not a preference, it is the difference between a 404 and
    // a 500 on every unknown careers slug.
    //
    // /careers/[slug] declares `revalidate = 3600`, so Next renders it as a
    // static or ISR page. A `no-store` fetch inside that render is an opt out
    // of caching entirely, which Next reports as "Page changed from static to
    // dynamic at runtime" and serves as a 500. It never fired before
    // 2026-09-02 only because generateStaticParams listed every live slug, so
    // every real page was built ahead of time and no request ever took the
    // runtime path. An unknown slug already 500'd instead of 404ing; nobody
    // had asked for one. Gating expired roles out of generateStaticParams
    // moved two real, indexed URLs onto that same broken path.
    //
    // 300s keeps the HQ-publishes-a-role story intact: a new posting still
    // appears within five minutes without a deploy, which is what the
    // no-store was reaching for, and the page stays statically renderable.
    const res = await fetch(match.url, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const data = (await res.json()) as Snapshot;
    return Array.isArray(data.postings) ? data.postings : null;
  } catch {
    return null;
  }
}

// Static jobs.ts fallback → the public shape (no screening questions).
function staticToPublic(j: Job): PublicJobPosting {
  return {
    slug: j.slug,
    title: j.title,
    team: j.team,
    location: j.location,
    remote: j.remote,
    applicantRegion: j.applicantRegion,
    addressLocality: j.addressLocality,
    addressRegion: j.addressRegion,
    addressCountry: j.addressCountry,
    employmentType: j.employmentType,
    compensation: j.compensation,
    salaryCurrency: j.salaryCurrency,
    salaryMin: j.salaryMin,
    salaryMax: j.salaryMax,
    salaryUnit: j.salaryUnit,
    validThrough: j.validThrough,
    publishedAt: j.publishedAt,
    summary: j.summary,
    about: j.about,
    responsibilities: j.responsibilities,
    requirements: j.requirements,
    niceToHave: j.niceToHave,
    screeningQuestions: [],
    order: j.order,
  };
}

function sortRoles(roles: PublicJobPosting[]): PublicJobPosting[] {
  return [...roles].sort(
    (a, b) => a.order - b.order || a.title.localeCompare(b.title),
  );
}

// A role is live until the END of its validThrough day, so the comparison is
// strictly-less-than against today in UTC. Dates are YYYY-MM-DD on both sides,
// which sorts lexicographically, so no parsing is needed.
//
// WHY THIS EXISTS. On 2026-09-01 both published roles carried
// validThrough 2026-07-15 and were still being served with live JobPosting
// JSON-LD, still listed on /careers, still in sitemap.xml, and still taking
// applications, 48 days after their own stated expiry. Nothing anywhere in
// the code looked at validThrough. HQ owns the data and remains the place to
// close a role properly, but a snapshot that goes stale upstream should not be
// able to publish an expired JobPosting here: an expired posting served as
// live structured data is a Google policy problem, and a role that quietly
// keeps accepting applications is worse than one that is visibly closed.
//
// This is the ONE chokepoint, so /careers, /careers/[slug] and sitemap.ts all
// drop an expired role together. A role with no validThrough is untouched:
// absent is not expired, and HQ does not require the field.
function isOpen(role: PublicJobPosting, todayIso: string): boolean {
  return !role.validThrough || role.validThrough >= todayIso;
}

/** Public roles for /careers — from HQ's Blob snapshot, else static fallback. */
export async function getCareersRoles(): Promise<PublicJobPosting[]> {
  const todayIso = new Date().toISOString().slice(0, 10);
  const snap = await fetchSnapshot();
  // Source selection is unchanged, and the expiry filter runs AFTER it, so an
  // all-expired snapshot renders /careers' "No open roles right now." rather
  // than falling through to the static list and resurrecting a closed role.
  const source =
    snap && snap.length > 0
      ? snap
      : STATIC_JOBS.filter((j) => !j.draft).map(staticToPublic);
  return sortRoles(source.filter((r) => isOpen(r, todayIso)));
}

export async function getCareersRole(
  slug: string,
): Promise<PublicJobPosting | undefined> {
  return (await getCareersRoles()).find((r) => r.slug === slug);
}

const EMPLOYMENT_LABEL: Record<EmploymentType, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACTOR: "Contract",
  INTERN: "Internship",
};

export function employmentLabel(t: EmploymentType): string {
  return EMPLOYMENT_LABEL[t];
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Build the HTML description Google for Jobs expects from the role fields. */
export function jobDescriptionHtml(
  job: Pick<
    PublicJobPosting,
    "about" | "responsibilities" | "requirements" | "niceToHave"
  >,
): string {
  const ul = (items: string[]) =>
    `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
  const blocks = [
    `<p>${esc(job.about)}</p>`,
    `<h3>What you will do</h3>`,
    ul(job.responsibilities),
    `<h3>What I am looking for</h3>`,
    ul(job.requirements),
  ];
  if (job.niceToHave.length > 0) {
    blocks.push(`<h3>Nice to have</h3>`, ul(job.niceToHave));
  }
  return blocks.join("");
}
