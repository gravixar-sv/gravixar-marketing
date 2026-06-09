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

/** Person + Organization + WebSite, global, render in root layout. */
export function StructuredDataGlobal() {
  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: SITE.author,
    url: SITE.url,
    email: "gravixar@gmail.com",
    jobTitle: "AI-augmented operations consultant",
    description:
      "Builds operations infrastructure, brand work, and AI tooling for teams that want what they're buying running before the contract.",
    worksFor: {
      "@type": "Organization",
      name: SITE.name,
      url: SITE.url,
    },
    sameAs: ["https://www.linkedin.com/in/qamarabbas"],
  };

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: SITE.url,
    logo: `${SITE.url}/logos/gravixar-wordmark.png`,
    founder: { "@type": "Person", name: SITE.author },
    description: SITE.tagline,
    sameAs: [
      "https://www.linkedin.com/in/qamarabbas",
      // Add more as they go live: company LinkedIn page, GitHub, X/Twitter.
      // "https://twitter.com/gravixar",
      // "https://github.com/gravixar-sv",
    ],
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.url,
    description: SITE.tagline,
    publisher: { "@type": "Organization", name: SITE.name },
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
    provider: {
      "@type": "Organization",
      name: SITE.name,
      url: SITE.url,
    },
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
}: {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  author: string;
}) {
  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url,
    datePublished: publishedAt,
    author: { "@type": "Person", name: author },
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      logo: { "@type": "ImageObject", url: `${SITE.url}/logos/gravixar-wordmark.png` },
    },
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
}: {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  updatedAt?: string;
  author: string;
}) {
  const post = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    url,
    datePublished: publishedAt,
    dateModified: updatedAt ?? publishedAt,
    author: { "@type": "Person", name: author },
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      logo: { "@type": "ImageObject", url: `${SITE.url}/logos/gravixar-wordmark.png` },
    },
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
