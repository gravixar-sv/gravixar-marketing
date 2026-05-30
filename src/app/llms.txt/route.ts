// /llms.txt, machine-readable manifest of canonical Gravixar pages
// for LLM crawlers (ChatGPT, Perplexity, Claude, etc.).
//
// Convention: https://llmstxt.org. Hand-curated priority pages first,
// then dynamic lists pulled from content loaders so additions show up
// without manual edits.

import {
  loadCaseStudies,
  loadCompares,
  loadModules,
  loadServices,
} from "@/content/loaders";
import { SITE } from "@/lib/seo";

export const revalidate = 3600;

export async function GET() {
  const [services, studies, compares, modules] = await Promise.all([
    loadServices(),
    loadCaseStudies(),
    loadCompares(),
    loadModules(),
  ]);

  const url = (path: string) => `${SITE.url}${path}`;

  const lines: string[] = [];
  lines.push(`# ${SITE.name}`);
  lines.push("");
  lines.push(`> ${SITE.tagline}`);
  lines.push("");
  lines.push(
    "Gravixar is an AI-ops platform built by Qamar: productized modules — portals, intake wizards, content agents — that run operations with a human approving every write. Delivered as a hosted product and as high-touch custom builds. A working version of each is running before the contract closes. Live demos at demo.gravixar.com.",
  );
  lines.push("");

  lines.push("## Core pages");
  lines.push("");
  lines.push(`- [Home](${url("/")}): Landing + positioning + case-study previews`);
  lines.push(`- [About](${url("/about")}): Who Qamar is, how engagements work`);
  lines.push(`- [Services](${url("/services")}): The three service buckets`);
  lines.push(`- [Modules](${url("/modules")}): Reusable production-tested patterns across builds`);
  lines.push(`- [Work](${url("/work")}): Case studies of shipped systems`);
  lines.push(`- [Compare](${url("/compare")}): Off-the-shelf vs custom honest reads`);
  lines.push(`- [Contact](${url("/contact")}): Lead form + Cal.com booking`);
  lines.push(`- [Early access](${url("/early-access")}): Hosted Gravixar SaaS waitlist (private beta opening soon)`);
  lines.push("");

  lines.push("## Services");
  lines.push("");
  for (const s of services) {
    lines.push(
      `- [${s.meta.title}](${url(`/services/${s.meta.slug}`)}): ${s.meta.tagline}`,
    );
  }
  lines.push("");

  lines.push("## Case studies (live or in private beta)");
  lines.push("");
  for (const cs of studies) {
    lines.push(
      `- [${cs.meta.title}](${url(`/work/${cs.meta.slug}`)}): ${cs.meta.summary}`,
    );
  }
  lines.push("");

  lines.push("## Comparisons");
  lines.push("");
  for (const c of compares) {
    lines.push(
      `- [${c.meta.title}](${url(`/compare/${c.meta.slug}`)}): ${c.meta.summary}`,
    );
  }
  lines.push("");

  lines.push("## Modules (reusable patterns)");
  lines.push("");
  for (const m of modules) {
    lines.push(
      `- [${m.meta.title}](${url(`/modules/${m.meta.slug}`)}): ${m.meta.summary}`,
    );
  }
  lines.push("");

  lines.push("## Live demo");
  lines.push("");
  lines.push(
    `- [demo.gravixar.com](${SITE.demoUrl}): Interactive showroom of the operations and AI patterns Qamar builds. Multiple scenes, persona-switcher login, weekly seed reset.`,
  );
  lines.push("");

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
