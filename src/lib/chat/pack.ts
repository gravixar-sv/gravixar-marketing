// The answer bank. Assembled at runtime from the same MDX the site renders,
// filtered through the allowlist, and cached for the life of the process.
//
// WHY NOT A GENERATED FILE. A committed pack.generated.ts is one more artifact
// that can be stale in a way nobody notices, and the whole point of this
// surface is that it cannot say anything the site does not already say. Built
// from the loaders, it is structurally impossible for the pack to drift from
// the pages: they read the same files. prebuild runs the same assembly and
// fails the build on an unclassified key, so the allowlist is still a
// build-time gate rather than a runtime hope.
//
// WHY NO RETRIEVAL. Measured, the whole published corpus is roughly 24k
// tokens, and the part Bosun answers from is a fraction of that. A vector
// store on a site with no database would be infrastructure bought to solve a
// problem that does not exist. Everything is in memory, matching is lexical,
// and the answer is a published string returned verbatim.
//
// PHASE 1 CONTRACT: every answer here already exists on a page. Bosun composes
// nothing. That is what makes hallucination structurally impossible rather
// than merely unlikely, and it is the property the model tier in Phase 2 has
// to be measured against before it is allowed to replace any of this.

import {
  loadCaseStudies,
  loadCompares,
  loadModules,
  loadPage,
  loadServices,
} from "@/content/loaders";
import { assertClassified, type PackKind } from "./pack-allowlist";

export type PackEntry = {
  /** Stable and traceable. Every answer Bosun gives carries one. */
  id: string;
  kind: PackKind;
  /** The canonical phrasing, used for matching. */
  question: string;
  /** Extra phrasings that should hit the same answer. */
  aliases: string[];
  /** VERBATIM published text. Never assembled prose. */
  answer: string;
  /** Where a visitor reads the same thing in context. */
  href: string;
};

export type Pack = {
  entries: PackEntry[];
  /** Vocabulary that counts as "about Gravixar". Drives the in-domain check. */
  terms: Set<string>;
  /** Every figure that appears in published copy, for the numeric guard. */
  numbers: Set<string>;
};

/** Words too common to signal anything. Kept small on purpose. */
const STOPWORDS = new Set(
  "a an and are as at be but by can do does for from has have how i if in is it its of on or that the this to was what when where which who why with you your".split(
    " ",
  ),
);

export function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^a-z0-9\s.$-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/**
 * MANDATE CLAUSE 5's mechanism. Registering published figures and checking
 * outgoing ones MUST use the same extractor, or the guard rejects the site's
 * own copy. That is not hypothetical: an earlier version had two regexes that
 * disagreed on where a digit run starts inside "2,042", and the first thing it
 * did was refuse three published case studies.
 *
 * Every match is registered twice, raw and separator-stripped, so "2,042" and
 * "2042" both count as published.
 */
export function extractFigures(text: string): string[] {
  const raw = [
    ...(text.match(/[$£€]\s?\d[\d,.]*\s?(?:k|m|bn)?/gi) ?? []),
    ...(text.match(/\d[\d,.]*/g) ?? []),
  ];
  const out = new Set<string>();
  for (const m of raw) {
    const norm = m.replace(/\s+/g, "").toLowerCase();
    out.add(norm);
    out.add(norm.replace(/[,.]/g, ""));
    // Also register each bare digit run, since the outgoing check scans for
    // those independently of any surrounding punctuation.
    for (const run of m.match(/\d+/g) ?? []) out.add(run);
  }
  return [...out];
}

let cached: Pack | null = null;

export async function getPack(): Promise<Pack> {
  if (cached) return cached;

  const entries: PackEntry[] = [];
  const add = (e: PackEntry) => entries.push(e);

  // ---- Services. The spine of every sales question. ------------------
  const services = await loadServices();
  for (const s of services) {
    assertClassified("service", s.meta as unknown as Record<string, unknown>, s.filepath);
    const href = `/services/${s.meta.slug}`;
    const title = s.meta.title;

    add({
      id: `service:${s.meta.slug}:what`,
      kind: "service",
      question: `What is ${title}?`,
      aliases: [`tell me about ${title}`, `do you do ${title}`, `${title}`],
      answer: s.meta.tagline,
      href,
    });

    add({
      id: `service:${s.meta.slug}:includes`,
      kind: "service",
      question: `What does ${title} include?`,
      aliases: [
        `what do I get with ${title}`,
        `${title} deliverables`,
        `what is included in ${title}`,
      ],
      // Joined verbatim, one published line each. No connective prose.
      answer: s.meta.deliverables.map((d) => `- ${d}`).join("\n"),
      href,
    });

    if (s.meta.pricing) {
      add({
        id: `service:${s.meta.slug}:cost`,
        kind: "service",
        question: `What does ${title} cost?`,
        aliases: [
          `how much is ${title}`,
          `${title} price`,
          `${title} pricing`,
          `how much does ${title} cost`,
        ],
        answer: s.meta.pricing,
        href,
      });
    }
  }

  // ---- Compare pages. The only schema-enforced FAQs on the site. ------
  const compares = await loadCompares();
  for (const c of compares) {
    assertClassified("compare", c.meta as unknown as Record<string, unknown>, c.filepath);
    const href = `/compare/${c.meta.slug}`;

    c.meta.faqs.forEach((faq, i) => {
      add({
        id: `compare:${c.meta.slug}:faq:${i}`,
        kind: "compare",
        question: faq.question,
        aliases: [],
        answer: faq.answer,
        href,
      });
    });

    add({
      id: `compare:${c.meta.slug}:who`,
      kind: "compare",
      question: `Should I use ${c.meta.competitor} or build something custom?`,
      aliases: [
        `${c.meta.competitor} vs custom`,
        `is ${c.meta.competitor} good enough`,
        `should I move off ${c.meta.competitor}`,
      ],
      answer: `Stay with ${c.meta.competitor} when: ${c.meta.whoForCompetitor}\n\nGo custom when: ${c.meta.whoForCustom}`,
      href,
    });
  }

  // ---- Modules. "Do you already have something that does X". ----------
  const modules = await loadModules();
  for (const m of modules) {
    assertClassified("module", m.meta as unknown as Record<string, unknown>, m.filepath);
    add({
      id: `module:${m.meta.slug}`,
      kind: "module",
      question: `Do you have a module for ${m.meta.title}?`,
      aliases: [m.meta.title, `${m.meta.category} module`, `${m.meta.title} module`],
      answer: m.meta.summary,
      href: `/modules/${m.meta.slug}`,
    });
  }

  // ---- Case studies. Frontmatter only, never the body. ----------------
  const cases = await loadCaseStudies();
  for (const cs of cases) {
    assertClassified("caseStudy", cs.meta as unknown as Record<string, unknown>, cs.filepath);
    const href = `/work/${cs.meta.slug}`;

    add({
      id: `case:${cs.meta.slug}:summary`,
      kind: "caseStudy",
      question: `What was built for ${cs.meta.client}?`,
      aliases: [cs.meta.title, `${cs.meta.client} case study`],
      answer: cs.meta.summary,
      href,
    });

    add({
      id: `case:${cs.meta.slug}:outcome`,
      kind: "caseStudy",
      question: `What was the outcome of ${cs.meta.title}?`,
      aliases: [`did ${cs.meta.title} work`, `results of ${cs.meta.title}`],
      answer: cs.meta.outcome,
      href,
    });
  }

  // ---- About. The canonical "who is this". -----------------------------
  const about = await loadPage("about");
  assertClassified("page", about.meta as unknown as Record<string, unknown>, about.filepath);
  add({
    id: "page:about",
    kind: "page",
    question: "Who is behind Gravixar?",
    aliases: ["who are you", "who is qamar", "what is gravixar", "about gravixar"],
    answer: about.meta.description,
    href: "/about",
  });

  // ---- Derived indexes -------------------------------------------------
  const terms = new Set<string>();
  const numbers = new Set<string>();
  for (const e of entries) {
    for (const t of tokenize(`${e.question} ${e.aliases.join(" ")} ${e.answer}`)) {
      terms.add(t);
    }
    for (const n of extractFigures(e.answer)) numbers.add(n);
  }

  cached = { entries, terms, numbers };
  return cached;
}

/** prebuild calls this: assembling at all is the test. */
export async function validatePack(): Promise<{ entries: number; terms: number }> {
  cached = null;
  const pack = await getPack();

  const ids = new Set<string>();
  for (const e of pack.entries) {
    if (ids.has(e.id)) throw new Error(`[chat-pack] duplicate entry id: ${e.id}`);
    ids.add(e.id);
    if (!e.answer.trim()) throw new Error(`[chat-pack] empty answer: ${e.id}`);
    // An answer nobody can go and read is an answer nobody can check.
    if (!e.href.startsWith("/")) throw new Error(`[chat-pack] bad href on ${e.id}: ${e.href}`);
    if (/[—–]/.test(e.answer)) {
      throw new Error(
        `[chat-pack] em or en dash in ${e.id}. Published copy should not carry them, and Bosun repeats copy verbatim.`,
      );
    }
  }

  return { entries: pack.entries.length, terms: pack.terms.size };
}
