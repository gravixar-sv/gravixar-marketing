// /llms.txt, machine-readable manifest of canonical Gravixar pages
// for LLM crawlers (ChatGPT, Perplexity, Claude, etc.).
//
// Convention: https://llmstxt.org. Hand-curated priority pages first,
// then dynamic lists pulled from content loaders so additions show up
// without manual edits.
//
// This file exists to be quoted verbatim by machines, so every claim in it
// has to survive a fact-check. Counts come from the loaders and from
// DEMO_SCENES, never hand-typed, and that now includes the /services line:
// the tracks and their members are grouped out of the loaded frontmatter, so
// a sixth service cannot leave a sentence here describing five. Claims that
// used to be wrong and must not come back: the demo has no sign-in and no
// persona login (the scenes are stateless playgrounds in their own repo),
// booking is in-house, not cal.com (retired May 2026), and the homepage
// carries no case-study previews (its acts are hero plus approval loop,
// then clients, demos and capabilities, then the services menu, then the ask).
//
// /graphics WAS absent while content/graphics had no entries, on the grounds
// that pointing a crawler at an empty gallery is a worse claim than making
// none. Work sits behind it now, so it is listed. /privacy stays a deliberate
// omission: this manifest is the priority set, not the sitemap.

import {
  loadBuyerPages,
  loadCaseStudies,
  loadCompares,
  loadGraphics,
  loadModules,
  loadServices,
} from "@/content/loaders";
import type { Service } from "@/content/schema";
import { leadFigure } from "@/components/services/model";
import { DEMO_SCENES } from "@/lib/demos";
import { SITE } from "@/lib/seo";

export const revalidate = 3600;

// One clause per service track, so /services can be described without a
// hand-typed count of anything. Typed against Service["track"], which means
// adding a value to the schema enum fails the build here until this map names
// it: the failure mode to avoid is a new track rendering on the site while
// this manifest still tells a crawler there are only two.
const TRACK_CLAUSE: Record<Service["track"], string> = {
  start: "A fixed-price diagnostic to start with",
  build: "Projects with an end",
  ongoing: "Ongoing engagements, kept honest after a build ships",
  maintain: "Managed retainers, kept running month to month",
};

// A crawler quoting this file should not present an existing-clients offer as
// one a stranger can buy, so the title carries the qualifier wherever it is
// listed. The page itself is still live and still in the sitemap.
const listedTitle = (s: Service) =>
  s.audience === "existing-clients" ? `${s.title} (for existing clients)` : s.title;

// Named clients and what was built for each, added 2026-10-05 (HQ brain
// decision gravixar-names-clients-and-what-was-built: Qamar, "we can name what
// we built for which client"). Two limits travel with it. A client appears
// here only if it is on the home page's logo wall, and a line says only what
// its case study already says, with the date where the case study dates it.
// The case studies themselves still describe their clients generically; the
// pairing of name and study is what this list adds. Each line is dropped if
// its case study is not loaded, so a renamed or drafted study cannot leave a
// line pointing at a 404.
const NAMED_WORK: { slug: string; line: string }[] = [
  {
    slug: "bs-hub",
    line: "Broomstick Creative, a creative agency working across the UAE and Pakistan: Broomstick Hub, the agency portal Gravixar built for it. A new client goes from first inquiry to an active project in about 10 minutes, down from two to three days of email, and AI drafts briefs but never approves anything.",
  },
  {
    slug: "monday-rollout-agency",
    line: "Broomstick Creative: a monday.com rollout in four phases, the Islamabad delivery teams first and the Dubai project and account managers third. The team grew from 10 people to more than 50 on one delivery system. Running since September 2021.",
  },
  {
    slug: "lucidlink-wasabi",
    line: "Broomstick Creative: Dropbox and local disks replaced with LucidLink streaming storage and a Wasabi archive, so editors open live projects from any machine. More than 80% of event delivery runs this way.",
  },
  {
    slug: "beeline",
    line: "Beeline, a healthcare credentialing and billing company: its credentialing platform, live on its own domain since June 2026 and holding 250 clients and 2,042 insurer applications by the end of July 2026. Patient data stays out of it by design.",
  },
];

export async function GET() {
  const [services, studies, compares, modules, graphics, buyers] = await Promise.all([
    loadServices(),
    loadCaseStudies(),
    loadCompares(),
    loadModules(),
    loadGraphics(),
    loadBuyerPages(),
  ]);

  const url = (path: string) => `${SITE.url}${path}`;

  // Group services by track in load order (loadServices sorts by `order`, so
  // build, then ongoing, then maintain) without this file knowing a single
  // track name. Same grouping ServicesPreview does, for the same reason: the
  // shape of the offer comes from what each service IS. A track with no
  // content contributes nothing.
  const trackOrder: Service["track"][] = [];
  const byTrack = new Map<Service["track"], string[]>();
  for (const s of services) {
    const titles = byTrack.get(s.meta.track);
    if (titles) titles.push(listedTitle(s.meta));
    else {
      byTrack.set(s.meta.track, [listedTitle(s.meta)]);
      trackOrder.push(s.meta.track);
    }
  }
  const trackSummary = trackOrder
    .map((t) => `${TRACK_CLAUSE[t]}: ${(byTrack.get(t) ?? []).join(", ")}.`)
    .join(" ");

  const lines: string[] = [];
  lines.push(`# ${SITE.name}`);
  lines.push("");
  lines.push(`> ${SITE.tagline}`);
  lines.push("");
  lines.push(
    `Gravixar is an AI-ops platform built by Qamar: productized modules (portals, intake wizards, content agents) that run operations with a human approving every write. Today it ships as high-touch custom builds, several of them carrying a client's daily operations in production, plus ongoing retainers that keep shipped systems running. A hosted version of the same modules, rented by the month, does not exist yet and carries no announced date; there is a waitlist. Every module has a working version live somewhere: on this site, at demo.gravixar.com, or in a client's production stack, open to use before pricing comes up. ${DEMO_SCENES.length} live demo scenes at demo.gravixar.com, no sign-in.`,
  );
  lines.push("");
  // Who it is for and where, in the words a buyer asks in. The UK and the UAE
  // are served remotely; the only address is the Rawalpindi office. The front
  // door's name and price are read from its frontmatter, like every other
  // figure in this file, so a price change cannot leave this line behind.
  const frontDoor = services.find((s) => s.meta.track === "start" && s.meta.audience === "everyone");
  const frontFigure = frontDoor ? leadFigure(frontDoor.meta) : null;
  const firstStep =
    frontDoor && frontFigure
      ? ` The first step is the ${frontDoor.meta.title} at ${frontFigure.figure}${frontFigure.qualifier ? ` ${frontFigure.qualifier}` : ""}, and each service page says how that service is priced.`
      : "";
  lines.push(
    `${SITE.name} serves agencies and accounting and law practices in the United Kingdom and the United Arab Emirates, remotely, from its office in Rawalpindi, Pakistan.${firstStep}`,
  );
  lines.push("");

  lines.push("## Core pages");
  lines.push("");
  lines.push(`- [Home](${url("/")}): The positioning, the approval loop every module runs on, the live demo scenes, the integration surface behind them, and the services menu`);
  lines.push(`- [About](${url("/about")}): Who Qamar is, how engagements run, and the numbers behind the operations stack he works from`);
  lines.push(`- [Services](${url("/services")}): ${services.length} services on ${trackOrder.length} tracks. ${trackSummary}`);
  lines.push(`- [Modules](${url("/modules")}): The reusable production-tested patterns behind the builds, grouped by category, each naming where it runs today`);
  lines.push(`- [Work](${url("/work")}): Case studies of shipped systems: the problem, the approach, the outcome, and the parts that broke`);
  lines.push(`- [Compare](${url("/compare")}): Off-the-shelf vs custom honest reads, each naming who should pick the SaaS, who should go custom, and an FAQ block`);
  lines.push(`- [Demos](${url("/demos")}): The live demo scenes, one per buyer, with what to try in each`);
  lines.push(`- [Graphics](${url("/graphics")}): ${graphics.length} visual ${graphics.length === 1 ? "piece" : "pieces"}, each carrying a required origin label (client work, my own brand, or concept) so provenance is stated rather than implied`);
  lines.push(`- [Blog](${url("/blog")}): Field notes on agency operations, delivery process, and keeping AI in the loop. Some posts are drafted by the SEO agent running on this site, flagged as such on the post, and published only when a human promotes the file`);
  lines.push(`- [Careers](${url("/careers")}): Current openings, published from the same hiring system Qamar runs internally, each role page carrying JobPosting structured data and its own apply form`);
  lines.push(`- [Contact](${url("/contact")}): Lead form plus in-house 30-minute call booking (email-verified code, reusable Google Meet room, calendar invite)`);
  lines.push(`- [Early access](${url("/early-access")}): Waitlist for the module library. The modules are real and running in production inside builds; a hosted account where you rent one by the month does not exist yet, and the page prints no date`);
  lines.push("");

  lines.push("## Services");
  lines.push("");
  for (const s of services) {
    lines.push(
      `- [${listedTitle(s.meta)}](${url(`/services/${s.meta.slug}`)}): ${s.meta.tagline}`,
    );
  }
  lines.push("");

  if (buyers.length > 0) {
    lines.push("## Who it is for");
    lines.push("");
    // The meta description, not the lede: the lede is written to sit under
    // the H1 and leaves the buyer and the place to it, while the description
    // has to stand alone in a result row, which is what a line here is.
    for (const b of buyers) {
      lines.push(
        `- [For ${b.meta.buyer}](${url(`/for/${b.meta.slug}`)}): ${b.meta.metaDescription ?? b.meta.lede}`,
      );
    }
    lines.push("");
  }

  const loadedStudies = new Set(studies.map((cs) => cs.meta.slug));
  const named = NAMED_WORK.filter((w) => loadedStudies.has(w.slug));
  if (named.length > 0) {
    lines.push("## Named clients and what was built");
    lines.push("");
    for (const w of named) {
      lines.push(`- ${w.line} [Case study](${url(`/work/${w.slug}`)})`);
    }
    lines.push("");
  }

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
