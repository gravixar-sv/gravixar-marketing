// Open roles, as typed data (not MDX). Job postings are structured records
// (title, location, employment type, responsibilities) that map almost 1:1
// onto schema.org JobPosting, so a validated data file is a cleaner fit than
// freeform MDX and keeps the JobPosting JSON-LD honest. Validated at module
// load with zod, same fail-fast discipline as the MDX content validator.
//
// Editing: add/adjust entries in RAW_JOBS. Set `draft: true` to hide a role
// from /careers without deleting it. Keep copy in the site voice (first
// person, no em-dashes). Dates are ISO (YYYY-MM-DD), UTC.

import { z } from "zod";

export const employmentTypeOptions = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACTOR",
  "INTERN",
] as const;

const jobSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case"),
  title: z.string().min(3).max(100),
  team: z.string().min(1).max(60), // e.g. "Engineering", "Operations"
  // Human-readable location string shown in the UI, e.g. "Remote".
  location: z.string().min(1).max(80),
  // True for fully-remote roles (drives TELECOMMUTE in the JobPosting LD).
  remote: z.boolean().default(true),
  // Where applicants may be based, for the LD applicantLocationRequirements.
  applicantRegion: z.string().min(1).max(80).default("Worldwide"),
  employmentType: z.enum(employmentTypeOptions),
  // Honest, human compensation string. Omit rather than invent a number;
  // a numeric baseSalary only goes into the LD when set explicitly below.
  compensation: z.string().max(160).optional(),
  publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  validThrough: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  // One or two sentences, used as the listing blurb + LD description lead.
  summary: z.string().min(20).max(280),
  // A short paragraph of role/company context (first person).
  about: z.string().min(20),
  responsibilities: z.array(z.string().min(1)).min(1),
  requirements: z.array(z.string().min(1)).min(1),
  niceToHave: z.array(z.string().min(1)).default([]),
  draft: z.boolean().default(false),
  order: z.number().int().nonnegative().default(0),

  // Structured location for on-site roles. Drives the JobPosting jobLocation;
  // Google for Jobs needs at least locality + country to index an on-site
  // posting, so these are required (via the refine below) when remote is false.
  addressLocality: z.string().max(80).optional(),
  addressRegion: z.string().max(80).optional(),
  addressCountry: z.string().length(2).optional(), // ISO-3166 alpha-2, e.g. "PK"

  // Optional numeric salary -> JobPosting baseSalary (MonetaryAmount). Set
  // currency + min + unit together; max optional (omit it for a single figure).
  // This is what makes the salary show in the Google for Jobs rich result.
  salaryCurrency: z.string().length(3).optional(), // ISO-4217, e.g. "PKR"
  salaryMin: z.number().int().positive().optional(),
  salaryMax: z.number().int().positive().optional(),
  salaryUnit: z.enum(["HOUR", "DAY", "WEEK", "MONTH", "YEAR"]).optional(),
}).refine(
  (j) => j.remote || (!!j.addressLocality && !!j.addressCountry),
  {
    message:
      "on-site roles (remote: false) need addressLocality + addressCountry for Google for Jobs",
  },
);

export type Job = z.infer<typeof jobSchema>;

// STARTER CONTENT — review/edit before going live (the operator merges this
// PR, so nothing is public until then). Voice: first person, no em-dashes.
const RAW_JOBS: z.input<typeof jobSchema>[] = [
  {
    slug: "social-media-bd-associate",
    title: "Junior Social Media & Business Development Associate (AI-Enabled)",
    team: "Growth",
    location: "Bahria Town, Rawalpindi (on-site)",
    remote: false,
    applicantRegion: "Pakistan",
    addressLocality: "Rawalpindi",
    addressRegion: "Punjab",
    addressCountry: "PK",
    employmentType: "FULL_TIME",
    compensation: "PKR 45,000 to 65,000 per month, plus performance commission.",
    salaryCurrency: "PKR",
    salaryMin: 45000,
    salaryMax: 65000,
    salaryUnit: "MONTH",
    publishedAt: "2026-06-04",
    validThrough: "2026-09-04",
    summary:
      "I am looking for an organized, eager-to-learn associate to run our social content and support business development, mentored directly by me with a clear step-by-step roadmap to follow. Fresh graduates are welcome.",
    about:
      "This is not a role where you figure everything out on your own. You will be guided directly by me, the founder, with a clear step-by-step roadmap to follow. Your main job is to keep that roadmap moving, stay on top of it, flag what is needed, and execute it well. I will hand you ready-made creatives, built with AI tools like Claude Code and Higgsfield, along with the captions to go with them. You organize, schedule, and publish them, keep our content calendar tidy, and play an active part in planning. In return you get direct mentorship from me, hands-on experience with AI tools used in real client work, performance commission on any new business you help bring in (paid once the deal closes and the client has paid), and a clear path to grow into social media, marketing, or business development. If you like keeping things in order, enjoy learning new tools, and want a role where you are properly mentored, this could be a great fit.",
    responsibilities: [
      "Own the content calendar. Schedule and publish the creatives and captions I give you, consistently and on time.",
      "Keep our roadmap on track. Monitor progress, ask what is needed next, and stay organized.",
      "Take part in planning. Share ideas, spot opportunities, and help shape what we post.",
      "Support business development. Follow up with leads and help move conversations toward closing.",
      "Learn and grow into our AI-driven content and business development workflows.",
    ],
    requirements: [
      "Organized and reliable, with the attention to detail that means nothing slips through.",
      "A good listener who also speaks up with their own ideas.",
      "Coachable and curious. You can take a roadmap and run with it, and you genuinely want to learn.",
      "Proactive. You ask \"what is next?\" instead of waiting to be told.",
      "Strong written and spoken English.",
      "Comfortable with AI tools, or genuinely excited to learn them.",
      "0 to 2 years of experience. Fresh graduates are welcome to apply.",
    ],
    niceToHave: [
      "A Bachelor's degree (preferred, but not required).",
      "Early hands-on experience with social media scheduling, content, or sales and business development.",
    ],
    order: 0,
  },
  {
    slug: "founding-engineer",
    title: "Founding Engineer (AI + Ops)",
    team: "Engineering",
    location: "Remote",
    remote: true,
    applicantRegion: "Worldwide",
    employmentType: "FULL_TIME",
    compensation: "Competitive, with meaningful equity for the right person.",
    publishedAt: "2026-06-04",
    summary:
      "Help me build the AI-ops platform that runs real client operations with a human on every approval. You will own product surfaces end to end, from the data layer to the screen.",
    about:
      "Gravixar is small on purpose. I build operations infrastructure, brand work, and AI tooling for teams, and I keep the AI honest after it ships. I am looking for the first engineer to build alongside me: someone who is comfortable owning a feature from schema to UI, who treats an approval gate as a feature and not a nuisance, and who would rather ship something running than a deck about it.",
    responsibilities: [
      "Own product surfaces end to end across Next.js, Postgres, and the AI layer.",
      "Build guarded automations: every meaningful action is logged, reversible, and approvable.",
      "Turn messy client operations into typed, testable workflows.",
      "Keep the bar high on correctness, because these systems run live businesses.",
    ],
    requirements: [
      "Strong TypeScript and React, with real Next.js App Router experience.",
      "Comfort across the stack: a relational schema, server actions or APIs, and the UI on top.",
      "Judgement about when to reach for AI and when not to.",
      "A track record of shipping and maintaining things in production.",
    ],
    niceToHave: [
      "Experience with LLM tool-use, evals, or agentic workflows.",
      "Prisma, Tailwind, and Vercel familiarity.",
      "You have built something people actually use.",
    ],
    draft: true,
    order: 0,
  },
  {
    slug: "ai-automation-contractor",
    title: "AI Automation Contractor",
    team: "Delivery",
    location: "Remote",
    remote: true,
    applicantRegion: "Worldwide",
    employmentType: "CONTRACTOR",
    compensation: "Project-based or day rate, depending on scope.",
    publishedAt: "2026-06-04",
    summary:
      "Take well-scoped automation projects from brief to running system. Good fit if you like shipping focused pieces fast and want flexible, project-based work.",
    about:
      "Some client work is best done as a focused project rather than a full-time hire. I am building a small bench of contractors I can hand a clear brief to and trust to deliver a running result. You pick the projects that fit your schedule, I handle the client relationship and the approval gates.",
    responsibilities: [
      "Take a scoped brief and deliver a working automation or integration.",
      "Write clear handover notes so the system is maintainable after you ship.",
      "Flag risks early, especially anything touching live client data.",
    ],
    requirements: [
      "Proven delivery of automations, integrations, or AI tooling.",
      "Self-directed: you can run a small project without daily oversight.",
      "Clear written communication.",
    ],
    niceToHave: [
      "A portfolio or repos I can look at.",
      "Experience with the same stack I use (TypeScript, Next.js, Vercel).",
    ],
    draft: true,
    order: 1,
  },
];

// Validate every entry at load (fail fast on bad data, before render).
export const JOBS: Job[] = RAW_JOBS.map((j) => jobSchema.parse(j)).sort(
  (a, b) => a.order - b.order || a.title.localeCompare(b.title),
);

/** Public, non-draft roles for /careers, in display order. */
export function getOpenJobs(): Job[] {
  return JOBS.filter((j) => !j.draft);
}

/** A single public role by slug (draft roles are not resolvable). */
export function getJob(slug: string): Job | undefined {
  return JOBS.find((j) => j.slug === slug && !j.draft);
}

const EMPLOYMENT_LABEL: Record<(typeof employmentTypeOptions)[number], string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACTOR: "Contract",
  INTERN: "Internship",
};

export function employmentLabel(t: Job["employmentType"]): string {
  return EMPLOYMENT_LABEL[t];
}

// Escape the small set of characters that would break HTML when the role
// fields are composed into the JobPosting LD `description` (an HTML string,
// per Google's spec). Content is author-controlled, so this is belt-and-braces.
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Build the HTML description Google for Jobs expects from the role fields. */
export function jobDescriptionHtml(job: Job): string {
  const list = (items: string[]) =>
    `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
  const blocks = [
    `<p>${esc(job.about)}</p>`,
    `<h3>What you will do</h3>`,
    list(job.responsibilities),
    `<h3>What I am looking for</h3>`,
    list(job.requirements),
  ];
  if (job.niceToHave.length > 0) {
    blocks.push(`<h3>Nice to have</h3>`, list(job.niceToHave));
  }
  return blocks.join("");
}
