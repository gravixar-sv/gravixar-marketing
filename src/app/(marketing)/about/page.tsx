import type { Metadata } from "next";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import { PageHeader } from "@/components/site/PageHeader";
import { Portrait } from "@/components/site/Portrait";
import { Reveal } from "@/components/site/Reveal";
import { headingId, mdxComponents } from "@/content/mdx";
import { Capabilities } from "@/components/home/Capabilities";
import { ContactCTA } from "@/components/home/ContactCTA";
import { PageLight } from "@/components/conversion/PageLight";
import { Fact, Ledger, LedgerGroup, WorkItem, WorkList } from "@/components/conversion/AboutMdx";
import { loadPage } from "@/content/loaders";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "About Gravixar, the operator behind the platform",
    // No year here on purpose. It used to say "since 2013" while the page
    // says operations since 2009 (two true facts about different things,
    // read side by side as a contradiction).
    description:
      "Qamar, founder of Gravixar, the AI-ops platform where a person approves every AI action. Four live client projects, and hands-on in every build.",
    path: "/about",
  });
}

// The h1's serif tail: the one phrase on this page set in the human voice.
// Split off the frontmatter title only when the title still ends with it, so
// an edited title simply renders plain instead of breaking.
const ACCENT = "the person you talk to.";
function splitTitle(title: string): { text: string; accent?: string } {
  if (title.endsWith(` ${ACCENT}`)) {
    return { text: title.slice(0, -ACCENT.length - 1), accent: ACCENT };
  }
  return { text: title };
}

const aboutComponents = { ...mdxComponents, Ledger, LedgerGroup, Fact, WorkList, WorkItem };

// The body's own h2s, read from the MDX source, for the "On this page" rail.
// Ids come from the same headingId() the MDX H2 uses, so the anchors match.
function sectionsOf(body: string): { id: string; title: string }[] {
  return [...body.matchAll(/^## (.+)$/gm)].flatMap((m) => {
    const title = m[1]?.trim();
    return title ? [{ id: headingId(title), title }] : [];
  });
}

export default async function AboutPage() {
  const page = await loadPage("about");
  const { text, accent } = splitTitle(page.meta.title);
  const sections = sectionsOf(page.body);

  return (
    <div className="relative isolate">
      <PageLight />

      {/* The opening. A statement h1 (it used to be the word "About") with
          the portrait beside it on desktop and directly under it on phones,
          so the person is on screen before any of the prose. */}
      <div className="rule-draw grid gap-10 pb-12 md:pb-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-center lg:gap-16 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <PageHeader
          eyebrow={page.meta.eyebrow}
          title={text}
          accent={accent}
          lede={page.meta.description}
          rule={false}
          // The serif tail starts its own line: two clauses, two lines.
          className="pb-0 md:pb-0"
          accentBreak
        />
        <Portrait className="mx-auto w-full max-w-[34rem] lg:max-w-none" />
      </div>

      {/* Long form at a reading measure. On wide screens the space the
          measure leaves is used for a quiet index of the page's sections,
          held in view while the reader moves through it. */}
      <div className="mt-12 grid gap-12 md:mt-16 lg:grid-cols-[minmax(0,68ch)_minmax(0,1fr)] lg:gap-16">
        <article className="min-w-0 max-w-[68ch]">
          <MDXRemote source={page.body} components={aboutComponents} />
        </article>
        {sections.length > 1 ? (
          <nav aria-label="On this page" className="hidden lg:block">
            <div className="sticky top-28 ml-auto max-w-[13rem]">
              <p className="text-caption text-ink-500">On this page</p>
              <ul className="mt-3 border-l border-line">
                {sections.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="-ml-px block border-l border-transparent py-1.5 pl-4 text-sm text-ink-400 transition-colors hover:border-ink-400 hover:text-ink-50"
                    >
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        ) : null}
      </div>

      {/* The tool list is reference detail on a page whose job is the person.
          On a phone it was about 1,400px of pills between the prose and the
          closing ask, so phones get one line pointing at the module pages,
          where every module names what it is built with. */}
      <div className="mt-24 hidden md:mt-32 md:block">
        <Reveal className="reveal-quiet">
          <Capabilities />
        </Reveal>
      </div>
      <p className="mt-16 border-t border-line pt-6 text-ink-400 md:hidden">
        Every module page names the tools it is built with.{" "}
        <Link href="/modules" className="link-quiet">
          See the modules
        </Link>
        .
      </p>

      {/* The portrait already leads this page and the h1 carries its serif
          phrase, so the closing panel shows neither. Without the portrait the
          panel's words fill about 580px, so the panel is capped to fit them:
          at full width the right half of the lit panel sat empty. */}
      <div className="mt-24 md:mt-32 md:max-w-3xl">
        <ContactCTA voice={false} person={false} />
      </div>
    </div>
  );
}
