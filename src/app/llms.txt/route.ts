// /llms.txt, machine-readable manifest of canonical Gravixar pages
// for LLM crawlers (ChatGPT, Perplexity, Claude, etc.).
//
// Convention: https://llmstxt.org. Hand-curated priority pages first,
// then dynamic lists pulled from content loaders so additions show up
// without manual edits.
//
// This file exists to be quoted verbatim by machines, so every claim in
// it has to survive a fact-check. Counts come from the loaders and from
// DEMO_SCENES, never hand-typed. Two claims that used to be wrong here
// and must not come back: the demo has no sign-in and no persona login
// (the scenes are stateless playgrounds in their own repo), and booking
// is in-house, not cal.com (retired May 2026).

import {
  loadCaseStudies,
  loadCompares,
  loadModules,
  loadServices,
} from "@/content/loaders";
import { DEMO_SCENES } from "@/lib/demos";
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
    `Gravixar is an AI-ops platform built by Qamar: productized modules (portals, intake wizards, content agents) that run operations with a human approving every write. Today it ships as high-touch custom builds, several of them carrying a client's daily operations in production, with a hosted version of the same modules opening in private beta (waitlist open now, not yet self-serve). A working version of each is running before the contract closes. ${DEMO_SCENES.length} live demo scenes at demo.gravixar.com, no sign-in.`,
  );
  lines.push("");

  lines.push("## Core pages");
  lines.push("");
  lines.push(`- [Home](${url("/")}): Landing + positioning + case-study previews`);
  lines.push(`- [About](${url("/about")}): Who Qamar is, how engagements work`);
  lines.push(`- [Services](${url("/services")}): Three build buckets (operations, AI, brand), plus two ongoing engagements: the fractional AI-ops retainer and a fixed-scope system audit`);
  lines.push(`- [Modules](${url("/modules")}): Reusable production-tested patterns across builds`);
  lines.push(`- [Work](${url("/work")}): Case studies of shipped systems`);
  lines.push(`- [Compare](${url("/compare")}): Off-the-shelf vs custom honest reads`);
  lines.push(`- [Demos](${url("/demos")}): The live demo scenes, one per buyer, with what to try in each`);
  lines.push(`- [Blog](${url("/blog")}): Field notes on agency operations, delivery process, and keeping AI in the loop`);
  lines.push(`- [Careers](${url("/careers")}): Open roles, published with structured JobPosting data`);
  lines.push(`- [Contact](${url("/contact")}): Lead form plus in-house 30-minute call booking (email-verified code, reusable Google Meet room, calendar invite)`);
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

  lines.push("## Case studies (shipped systems, live or handed off)");
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
    `- [demo.gravixar.com](${SITE.demoUrl}): ${DEMO_SCENES.length} live scenes, one per buyer, showing the operations and AI patterns Qamar builds. No sign-in, no accounts, no persona login: every scene opens straight into working software with its own brand and sample data. These are purpose-built playground scenes in their own codebase, not the client production systems they echo.`,
  );
  lines.push("");
  lines.push("Scenes:");
  lines.push("");
  for (const scene of DEMO_SCENES) {
    lines.push(
      `- ${scene.name} (${scene.brand}), for ${scene.personaLabel}: ${scene.whatItIs}. ${scene.tryLine}`,
    );
  }
  lines.push("");

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
