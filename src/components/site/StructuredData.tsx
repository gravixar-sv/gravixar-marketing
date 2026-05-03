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
      // Add real profiles here as they go live
      // "https://twitter.com/gravixar",
      // "https://github.com/gravixar-sv",
      // "https://linkedin.com/in/...",
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
