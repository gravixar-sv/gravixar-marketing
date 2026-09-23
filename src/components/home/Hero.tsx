import Link from "next/link";
import type { HomeBlock } from "@/content/schema";
import { loadServices } from "@/content/loaders";
import { SetInType } from "@/components/site/SetInType";
import { Arrow, buttonClass } from "@/components/ui/Button";
import { HeroStage } from "./hero/HeroStage";
import styles from "./hero/Hero.module.css";

// The fold. One claim, one sentence, one decision, and the mechanism shown
// rather than described: the 3D approval loop on the right, with the card that
// runs it breaking out of the stage's lower-left edge.
//
// What left the fold on 2026-09-23, and why:
//   - the mono service strip (it wrapped with dangling separators and repeated
//     the services menu and the nav);
//   - the browser-chrome panel and its green LIVE pill, which sat 200px above
//     the caption "not a live system";
//   - the four-stat "system signal" grid, a hero-metric template with 9px
//     labels. The figures are not gone: content/data/system-stats.json still
//     feeds them, with their sources and staleness gate, as one muted ledger
//     line lower on the page.
//
// Copy lives in content/home/hero.mdx: the title (split at its comma into the
// sans claim and the serif tail, the page's one human-voice phrase) and the
// lead as the body's first paragraph. No eyebrow since 2026-09-23: "The AI-ops
// platform" told a buyer this was software to sign up for, one line above "I
// build...", and the hosted version has no date. The slot still renders if a
// plain fact is ever put back in the frontmatter. The body is printed as plain
// text, not MDX, because MDX paragraphs carry long-form prose styles and the
// lead is a different rank.
//
// The price line uses the audit's own pricing words ("a call to walk you
// through it"), not a term of art like "readout call" that appears nowhere
// else on the site.

function splitTitle(title: string) {
  const i = title.indexOf(", ");
  if (i < 0) return { text: title, accent: undefined };
  return { text: title.slice(0, i + 1), accent: title.slice(i + 2) };
}

function firstParagraph(body: string) {
  const [first = ""] = body
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return first;
}

// The audit's price, read from its own frontmatter at build time so the fold
// can never print a different number from the service page.
async function auditPrice() {
  const services = await loadServices();
  const pricing = services.find((s) => s.meta.slug === "ops-leak-audit")?.meta.pricing;
  return pricing?.match(/\$[\d,]+/)?.[0];
}

export async function Hero({ meta, body }: { meta: HomeBlock; body: string }) {
  const { text, accent } = splitTitle(meta.title);
  const lead = firstParagraph(body);
  const price = await auditPrice();

  return (
    <section className="relative isolate pb-10 lg:pb-20">
      {/* Light from above the fold. The layer's top edge is the header's
          bottom rule (main pads the section 48px, 64px at md, below the
          64px header), and its mask ramps the light up from zero there, so
          it never starts on the header's edge whether the header is clear
          (scroll-top, motion allowed) or its 80% veil (reduced motion,
          engines without scroll timelines). See Hero.module.css. Contained
          by `isolate`, which also keeps it above the body's own background. */}
      <div
        aria-hidden
        className={`${styles.light} ember-horizon pointer-events-none absolute -inset-x-6 -top-12 -z-10 h-[52rem] md:-top-16`}
      />

      <div className="grid gap-y-4 sm:gap-y-10 lg:grid-cols-12 lg:items-start lg:gap-x-12">
        <div className="relative z-10 lg:col-span-6">
          {meta.eyebrow ? (
            <p className="hero-enter text-caption font-medium text-ink-400">{meta.eyebrow}</p>
          ) : null}
          <SetInType
            as="h1"
            text={text}
            accent={accent}
            delay={60}
            className={`${styles.title} ${meta.eyebrow ? "mt-5" : ""} text-display font-semibold text-ink-50`}
          />
          {lead ? (
            <p className="hero-enter mt-6 max-w-[34ch] text-lead text-ink-300 [animation-delay:260ms]">
              {lead}
            </p>
          ) : null}

          {/* The fill sits on the diagnostic: a published price is a smaller
              first step for a stranger than a call. Booking stays one click
              away in the header. Full width and stacked on phones, so the two
              never wrap into ragged widths. */}
          <div className="hero-enter mt-9 flex flex-col gap-3 [animation-delay:340ms] sm:flex-row">
            <Link
              href="/services/ops-leak-audit"
              className={`${buttonClass()} w-full sm:w-auto`}
            >
              Start with the Ops Leak Audit
            </Link>
            <Link href="/work" className={`group ${buttonClass({ variant: "ghost" })} w-full sm:w-auto`}>
              See the work
              <Arrow />
            </Link>
          </div>
          <p className="hero-enter mt-4 text-sm text-ink-400 [animation-delay:400ms]">
            {price ? `Fixed price, ${price}.` : "Fixed price."} A written report and a call to walk you
            through it.
          </p>
        </div>

        <div className="lg:col-span-6">
          <HeroStage />
        </div>
      </div>
    </section>
  );
}
