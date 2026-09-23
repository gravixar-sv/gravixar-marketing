import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/site/PageHeader";
import { Reveal } from "@/components/site/Reveal";
import { SpotlightGrid } from "@/components/site/SpotlightGrid";
import { ContactCTA } from "@/components/home/ContactCTA";
import { FrontDoor } from "@/components/services/FrontDoor";
import { TRACK_LABEL, type Track } from "@/components/services/model";
import { ServiceRow } from "@/components/services/ServiceRow";
import { loadServices } from "@/content/loaders";
import { separatorBefore } from "@/lib/prose";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 3600;

// Describes the tracks, not the services inside them, because the list of
// services keeps growing and a description that enumerates them goes stale on
// the next one. Tracks change when the shape of the business changes, and it
// changed on 2026-09-14: a fixed-price audit became the first step.
export const metadata: Metadata = buildMetadata({
  title: "Ops leak audit, operations infrastructure, AI tooling, code review",
  description:
    "Start with a fixed-price audit of where your team's hours go. Then I build the fix, and check that it holds after launch.",
  path: "/services",
});

// The menu tracks after the front door, in ascending commitment: a project
// that ends, a system I keep checking after it ships, a site I keep running.
// A service's `track` decides which group it lands in, so nothing here has to
// know how many services exist, and an empty track renders nothing.
//
// "maintain" stays in the list with nothing in it today (managed services moved
// to the existing-clients line), so a future maintain offer for everyone
// renders without anyone remembering to put the group back.
//
// THIS LIST IS THE WHOLE FILTER, and it fails quiet. A service whose track is
// not named here (or "start", which renders as the front door) matches no
// group, so it renders nowhere and raises nothing. Widening
// serviceSchema.track means adding it here in the same commit.
const MENU_TRACKS: Track[] = ["build", "ongoing", "maintain"];

export default async function ServicesIndexPage() {
  const all = await loadServices();
  // The menu is for a stranger. Existing-clients offers keep their pages and
  // get one sentence under the menu instead of a row in it.
  const services = all.filter((s) => s.meta.audience === "everyone");
  const forExistingClients = all.filter((s) => s.meta.audience === "existing-clients");
  const frontDoor = services.filter((s) => s.meta.track === "start");

  return (
    <div>
      <PageHeader
        eyebrow="Services"
        title="Start with the numbers. Then decide what to build."
        lede="Not sure what you need? The audit below is the first step, at a fixed price. Every service links to proof you can check: a case study, a live demo, or a system running today."
      />

      {frontDoor.length > 0 ? (
        <div className="mt-12 space-y-6 md:mt-16">
          {frontDoor.map((s) => (
            <FrontDoor key={s.meta.slug} meta={s.meta} />
          ))}
        </div>
      ) : null}

      {MENU_TRACKS.map((track) => {
        const inTrack = services.filter((s) => s.meta.track === track);
        if (inTrack.length === 0) return null;
        return (
          <section key={track} aria-labelledby={`track-${track}`} className="mt-20 md:mt-28">
            {/* A label-sized h2: it opts out of the global display width and
                tracking, which only suit headings at display sizes. */}
            <h2
              id={`track-${track}`}
              className="text-caption font-medium tracking-normal text-ink-400 [font-stretch:100%]"
            >
              {TRACK_LABEL[track]}
            </h2>
            <Reveal className="reveal-quiet">
              <SpotlightGrid className="mt-3 border-t border-line">
                <div className="reveal-stagger divide-y divide-line-soft">
                  {inTrack.map((s) => (
                    <div key={s.meta.slug}>
                      <ServiceRow meta={s.meta} />
                    </div>
                  ))}
                </div>
              </SpotlightGrid>
            </Reveal>
          </section>
        );
      })}

      {forExistingClients.length > 0 ? (
        <p className="mt-16 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-400 md:mt-20">
          Clients I already work with can also add{" "}
          {forExistingClients.map((s, i) => (
            <span key={s.meta.slug}>
              {separatorBefore(i, forExistingClients.length)}
              <Link href={`/services/${s.meta.slug}`} className="link-quiet">
                {s.meta.title}
              </Link>
            </span>
          ))}
          .
        </p>
      ) : null}

      <div className="mt-24 md:mt-32">
        <ContactCTA />
      </div>
    </div>
  );
}
