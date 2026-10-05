// JSON-LD structured data for SEO. Renders as a <script type="application/ld+json">
// in the page <head>. Read by Google for rich result eligibility.

import { SITE } from "@/lib/seo";

type AnyJson = Record<string, unknown>;

function ScriptLd({ data, id }: { data: AnyJson; id: string }) {
  return (
    <script
      type="application/ld+json"
      id={id}
      // dangerouslyInject is OK here, we control the data shape.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// Stable @ids so the three nodes are one graph rather than three unrelated
// assertions. A consumer that reads Person can now follow worksFor to the same
// Organization node the WebSite publishes, instead of reconciling three
// inline copies of the same name by string match.
const PERSON_ID = `${SITE.url}/about#person`;
const ORG_ID = `${SITE.url}#organization`;

// Google wants an ABSOLUTE url on `image`, and covers arrive in two shapes:
// a repo-relative path like /covers/x.png, or the dynamic card endpoint
// /api/og?title=..., which is also relative. Neither is usable as-is.
function absolute(src: string): string {
  return /^https?:\/\//.test(src) ? src : new URL(src, SITE.url).toString();
}

// EVERY entry here must link BACK to gravixar.com. An unreciprocated sameAs is
// an unverifiable assertion, which is the same defect class as an unsourced
// number, so the bar for adding one is the same: go and check.
//
// Two lists, because they are two entities. Until 2026-10-04 the Organization
// carried the PERSON's profiles (his LinkedIn, his Instagram), which told
// Google the company and the man were the same thing, while the company's own
// pages, the ones Google already shows for "gravixar" (the LinkedIn company
// Page and the Facebook Page in the image pack, the Business Profile as the
// knowledge panel), were tied to nothing on this site.
//
// The person:
//   - LinkedIn profile: the operator's, trailing slash matching Footer.tsx.
//   - GitHub: public, and github.com/gravixar-sv carries gravixar.com in its
//     profile link (checked 2026-09-01, HTTP 200 + reciprocal link). It is the
//     operator's own account under the brand name, so it sits on both lists.
//   - Instagram: the site already links it from the footer on all 60 pages,
//     so omitting it here made the machine-readable identity narrower than
//     the human-readable one. If the footer link goes, this goes with it.
const PERSON_PROFILES = [
  "https://www.linkedin.com/in/qamarabbas/",
  "https://github.com/gravixar-sv",
  "https://www.instagram.com/qabbas4/",
];

// The company (all three checked 2026-10-04):
//   - LinkedIn company Page: HTTP 200 to a logged-out fetch that day (it was
//     999 when this list was first written), and its website field is
//     gravixar.com.
//   - Facebook Page "Gravixar | Islamabad": the page links gravixar.com
//     (fetched through m.facebook.com; www refuses scripted fetches).
//   - Google Business Profile, by its CID: the knowledge panel Google shows
//     for "gravixar" (CID 4704859556706404783) lists https://gravixar.com/ as
//     its website. This is the link that ties the panel to this site.
// NOT added: X/@gravixar (no account confirmed to exist).
const ORG_PROFILES = [
  "https://www.linkedin.com/company/gravixar",
  "https://www.facebook.com/gravixar/",
  "https://www.google.com/maps?cid=4704859556706404783",
  "https://github.com/gravixar-sv",
];

// The site's own author string, for the article schemas below: only an author
// who IS the Person node gets its @id, so a future guest author cannot be
// silently merged into him.
function authorNode(author: string) {
  return author === SITE.author
    ? { "@type": "Person", "@id": PERSON_ID, name: author }
    : { "@type": "Person", name: author };
}

// The publisher of every article and the provider of every service is the one
// Organization node, by @id, so search reads one company and not N inline
// copies of a name.
const PUBLISHER = {
  "@type": "Organization",
  "@id": ORG_ID,
  name: SITE.name,
  url: SITE.url,
  logo: { "@type": "ImageObject", url: `${SITE.url}/logos/gravixar-wordmark.png` },
};

/** Person + Organization + WebSite, global, render in root layout. */
export function StructuredDataGlobal() {
  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": PERSON_ID,
    name: SITE.author,
    givenName: "Qamar",
    familyName: "Abbas",
    url: SITE.url,
    mainEntityOfPage: `${SITE.url}/about`,
    email: "gravixar@gmail.com",
    jobTitle: "AI-augmented operations consultant",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Islamabad",
      addressCountry: "PK",
    },
    knowsAbout: [
      "Operations infrastructure",
      "Client portals",
      "Workflow automation",
      "AI tooling with human approval",
      "Agency operations",
    ],
    description:
      "Builds operations infrastructure, brand work, and AI tooling for teams that want what they're buying running before the contract.",
    worksFor: { "@id": ORG_ID },
    sameAs: PERSON_PROFILES,
  };

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE.name,
    url: SITE.url,
    logo: `${SITE.url}/logos/gravixar-wordmark.png`,
    // 2013 is the founding year published on the LinkedIn company Page and in
    // the Gravixar position on the operator's profile. Not a new claim.
    foundingDate: "2013",
    founder: { "@id": PERSON_ID },
    // The office, written as Robonamix's Google Business Profile has it, the
    // same building (operator, 2026-10-04: one address for both businesses).
    // Until then this said only "Islamabad", which matched neither listing.
    // The Person above keeps Islamabad: that is where Qamar lives, not the
    // company's address.
    address: {
      "@type": "PostalAddress",
      streetAddress: "Phase 4 Civic Center, Bahria Town",
      addressLocality: "Rawalpindi",
      addressRegion: "Punjab",
      postalCode: "46220",
      addressCountry: "PK",
    },
    // The public contact details, the same on every listing (operator,
    // 2026-10-05: gravixar@gmail.com is Gravixar's public email; the number is
    // the one on the Business Profile and LinkedIn). Until then the email sat
    // only on the Person and the Organization carried no telephone.
    telephone: "+92 336 5676672",
    email: "gravixar@gmail.com",
    description: SITE.tagline,
    sameAs: ORG_PROFILES,
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE.url}#website`,
    name: SITE.name,
    url: SITE.url,
    description: SITE.tagline,
    publisher: { "@id": ORG_ID },
  };

  return (
    <>
      <ScriptLd data={person} id="ld-person" />
      <ScriptLd data={organization} id="ld-organization" />
      <ScriptLd data={website} id="ld-website" />
    </>
  );
}

/** Service-page-specific structured data. */
export function StructuredDataService({
  name,
  description,
  url,
}: {
  name: string;
  description: string;
  url: string;
}) {
  const service = {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    url,
    provider: PUBLISHER,
    areaServed: { "@type": "Place", name: "Worldwide" },
  };
  return <ScriptLd data={service} id={`ld-service-${name.replace(/\s+/g, "-").toLowerCase()}`} />;
}

/** Case-study page structured data. */
export function StructuredDataCaseStudy({
  title,
  description,
  url,
  publishedAt,
  author,
  image,
}: {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  author: string;
  image?: string;
}) {
  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url,
    // Without `image` an Article is not eligible for a rich result carrying a
    // thumbnail. Every case study already REQUIRES a cover in frontmatter, so
    // the asset existed and was simply never passed through to the schema.
    ...(image ? { image: [absolute(image)] } : {}),
    datePublished: publishedAt,
    author: authorNode(author),
    publisher: PUBLISHER,
  };
  return <ScriptLd data={article} id="ld-article" />;
}

/** Breadcrumb trail for any detail page (case-study / service / compare / blog).
 *  Items are in reading order: ancestors first, current page last. */
export function StructuredDataBreadcrumb({
  items,
}: {
  items: { name: string; url: string }[];
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
  return <ScriptLd data={data} id="ld-breadcrumb" />;
}

/** FAQPage block. Surfaces in AI Overviews + ChatGPT/Perplexity citations.
 *  Use on comparison pages, service pages, and any page with explicit Q&A. */
export function StructuredDataFAQ({
  faqs,
}: {
  faqs: { question: string; answer: string }[];
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
  return <ScriptLd data={data} id="ld-faqpage" />;
}

/** Blog post structured data. */
export function StructuredDataBlogPost({
  title,
  description,
  url,
  publishedAt,
  updatedAt,
  author,
  image,
}: {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  updatedAt?: string;
  author: string;
  image?: string;
}) {
  const post = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    url,
    // Same reason as Article above. A blog post's cover is optional in
    // frontmatter, so the call site falls back to the /api/og card, which is
    // the image the page's own OpenGraph tag already points at.
    ...(image ? { image: [absolute(image)] } : {}),
    datePublished: publishedAt,
    dateModified: updatedAt ?? publishedAt,
    author: authorNode(author),
    publisher: PUBLISHER,
  };
  return <ScriptLd data={post} id="ld-blogpost" />;
}

/** JobPosting structured data — the requirement for Google for Jobs
 *  eligibility (free indexing). `description` must be the full HTML role
 *  description. Remote roles use TELECOMMUTE + applicantLocationRequirements;
 *  on-site roles use jobLocation. `directApply: true` because the apply form
 *  lives on the same page. */
export function StructuredDataJobPosting({
  title,
  description,
  url,
  identifier,
  datePosted,
  validThrough,
  employmentType,
  remote,
  applicantRegion,
  location,
  addressLocality,
  addressRegion,
  addressCountry,
  salaryCurrency,
  salaryMin,
  salaryMax,
  salaryUnit,
}: {
  title: string;
  description: string; // HTML
  url: string;
  identifier: string;
  datePosted: string;
  validThrough?: string;
  employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACTOR" | "INTERN";
  remote: boolean;
  applicantRegion: string;
  location: string;
  // On-site structured address (remote === false). Falls back to `location`
  // for the locality if a structured one is not provided.
  addressLocality?: string;
  addressRegion?: string;
  addressCountry?: string; // ISO-3166 alpha-2
  // Optional numeric salary -> baseSalary (MonetaryAmount). Emitted only when
  // currency + min + unit are all present.
  salaryCurrency?: string; // ISO-4217
  salaryMin?: number;
  salaryMax?: number;
  salaryUnit?: "HOUR" | "DAY" | "WEEK" | "MONTH" | "YEAR";
}) {
  const posting: AnyJson = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title,
    description,
    datePosted,
    employmentType,
    url,
    directApply: true,
    identifier: {
      "@type": "PropertyValue",
      name: SITE.name,
      value: identifier,
    },
    hiringOrganization: {
      "@type": "Organization",
      name: SITE.name,
      sameAs: SITE.url,
      logo: `${SITE.url}/logos/gravixar-wordmark.png`,
    },
  };
  if (validThrough) posting.validThrough = validThrough;
  if (remote) {
    posting.jobLocationType = "TELECOMMUTE";
    posting.applicantLocationRequirements = {
      "@type": "Country",
      name: applicantRegion,
    };
  } else {
    const address: AnyJson = {
      "@type": "PostalAddress",
      addressLocality: addressLocality ?? location,
    };
    if (addressRegion) address.addressRegion = addressRegion;
    if (addressCountry) address.addressCountry = addressCountry;
    posting.jobLocation = { "@type": "Place", address };
  }
  if (salaryCurrency && salaryMin && salaryUnit) {
    const value: AnyJson = { "@type": "QuantitativeValue", unitText: salaryUnit };
    if (salaryMax && salaryMax !== salaryMin) {
      value.minValue = salaryMin;
      value.maxValue = salaryMax;
    } else {
      value.value = salaryMin;
    }
    posting.baseSalary = {
      "@type": "MonetaryAmount",
      currency: salaryCurrency,
      value,
    };
  }
  return <ScriptLd data={posting} id={`ld-job-${identifier}`} />;
}
