import Link from "next/link";
import { ViewTransition } from "react";
import type { Service } from "@/content/schema";
import { Arrow, buttonClass } from "@/components/ui/Button";
import { SpotlightGrid } from "@/components/site/SpotlightGrid";
import { leadFigure, TRACK_LABEL } from "@/components/services/model";
import { cn } from "@/lib/cn";
import { separatorBefore } from "@/lib/prose";

// THE OFFER, AS A FRONT DOOR AND A LIST.
//
// The audit is the one service a stranger can buy without a call, so it is not
// a card among cards: it is a lit panel with the section's only primary button.
// The other services a visitor can start are LIST ROWS under it, grouped by
// track, with the track named once on the first row of its band.
//
// ONE OFFER, ONE VOCABULARY. The front door here has the same anatomy as the
// one on /services (src/components/services/FrontDoor.tsx): the promise and
// the button on the left; across a hairline, the price as a number and what it
// covers. The track names, the price figure and the button label come from the
// same place (services/model.ts), and the rows use the same hover language as
// ServiceRow (a pointer-lit edge inside a SpotlightGrid and a faint wash, no
// sweep), so a visitor meets one offer, not two drafts of it. The one
// difference is deliberate: this panel lists the deliverables, because the
// homepage has nowhere else that says what the audit hands over.
//
// THE LADDER. The section h2 is a statement (the homepage act-opener rank), the
// panel title is a subsection, the row titles are text-xl. Three sizes, three
// jobs, so the panel never reads as a second headline under the first.
//
// BANDS, NOT INDEX ARITHMETIC. Every service carries a track, loadServices
// sorts by the frontmatter `order`, and rows are grouped by track in order of
// first appearance, so a mis-ordered file can shuffle the bands but never split
// one. The front door is whichever "everyone" service carries track "start";
// if there were none, every service would simply render as a row.
//
// Services for existing clients only (brand work, managed services) stay a
// single sentence under the list, not rows.
//
// Every title carries the view-transition name `svc-${slug}`, the same name
// the service page gives its h1, so the title morphs into the heading on
// navigation. One name per page: each service appears once in this section and
// nowhere else on the homepage.

// One line per row: the first sentence of the tagline. The full tagline stays
// on the service page, where there is room for the second and third.
function firstSentence(text: string) {
  return text.match(/^.*?[.?](?=\s|$)/)?.[0] ?? text;
}

// The panel lists the first three deliverables (the report, the hours, the
// priced fix: the core of what the audit hands over) and then says how many
// more there are, with a link to the page that lists them, so the list never
// pretends to be complete. Three, at every width: five full sentences made the
// panel's right half twice the height of its left and put about 80 words on
// one screen.
const SHOWN_DELIVERABLES = 3;
const COUNT_WORDS = ["", "one", "two", "three", "four", "five", "six"] as const;

function Title({ service, className }: { service: Service; className: string }) {
  return (
    <ViewTransition name={`svc-${service.slug}`} share="morph-title" default="none">
      <h3 className={className}>{service.title}</h3>
    </ViewTransition>
  );
}

function FrontDoor({ service }: { service: Service }) {
  const href = `/services/${service.slug}`;
  const lead = leadFigure(service);
  const shown = service.deliverables.slice(0, SHOWN_DELIVERABLES);
  const more = service.deliverables.length - shown.length;
  return (
    <div className="panel-lit relative overflow-hidden rounded-2xl">
      <div aria-hidden className="ember-horizon pointer-events-none absolute inset-0" />
      <div className="relative grid gap-10 p-6 py-8 sm:p-8 md:grid-cols-12 md:gap-0 md:p-12">
        <div className="md:col-span-6 md:pr-12">
          <p className="text-caption text-ink-400">{TRACK_LABEL[service.track]}</p>
          <Title service={service} className="mt-3 w-fit text-subsection font-semibold text-ink-50" />
          <p className="mt-4 max-w-[44ch] text-lead text-ink-300">{service.tagline}</p>
          <Link href={href} className={cn(buttonClass(), "group mt-8 w-full sm:w-auto")}>
            Start with the audit
            <Arrow />
          </Link>
        </div>

        <div className="md:col-span-6 md:border-l md:border-line md:pl-12">
          {lead ? (
            <p className="flex items-baseline gap-2.5">
              <span className="text-[2.75rem] font-semibold leading-none tracking-[-0.03em] text-ink-50 [font-stretch:94%] md:text-[3.25rem]">
                {lead.figure}
              </span>
              {lead.qualifier ? <span className="text-[0.9375rem] text-ink-300">{lead.qualifier}</span> : null}
            </p>
          ) : null}
          {service.deliverables.length > 0 ? (
            <>
              <p className={cn("text-caption text-ink-400", lead ? "mt-8" : null)}>What you get</p>
              <ol className="mt-3 border-t border-line">
                {shown.map((d, i) => (
                  <li
                    key={d}
                    className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-baseline gap-2 border-b border-line-soft py-3 text-[0.9375rem] leading-relaxed text-ink-200"
                  >
                    {/* Sans, set exactly like the step numbers on the hero's
                        approval card: this is a list a buyer reads, not
                        machine output. No tabular-nums: Mona Sans's tabular
                        zero is slashed, which reads as code. Decorative,
                        since the <ol> carries the order. */}
                    <span aria-hidden className="text-caption font-medium text-ink-500">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{d}</span>
                  </li>
                ))}
              </ol>
              {more > 0 ? (
                <Link
                  href={href}
                  className="group mt-1 inline-flex min-h-11 items-center gap-2 text-caption text-ink-300 transition-colors hover:text-ink-50"
                >
                  <span className="link-draw">
                    And {COUNT_WORDS[more] ?? more} more on the audit page
                  </span>
                  <Arrow />
                </Link>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Row({ service, label }: { service: Service; label: string | null }) {
  return (
    <li>
      <Link
        href={`/services/${service.slug}`}
        className="card-hover-glow group -mx-4 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 rounded-xl px-4 py-6 transition-colors duration-200 md:-mx-6 md:grid-cols-[200px_minmax(0,1fr)_auto] md:items-baseline md:gap-x-8 md:px-6 md:py-7 [@media(hover:hover)]:hover:bg-ink-50/[0.018]"
      >
        <p className={cn("col-span-2 text-caption text-ink-400 md:col-span-1", label ? null : "hidden md:block")}>
          {label}
        </p>
        <div>
          <Title
            service={service}
            className="w-fit text-xl text-ink-100 transition-colors duration-200 group-hover:text-ink-50 group-focus-visible:text-ink-50"
          />
          <p className="mt-1.5 max-w-[60ch] text-[0.9375rem] leading-relaxed text-ink-400">
            {firstSentence(service.tagline)}
          </p>
        </div>
        <span className="self-start pt-0.5 text-ink-400 transition-colors duration-200 group-hover:text-ink-50 group-focus-visible:text-ink-50 md:self-auto md:pt-0">
          <Arrow />
        </span>
      </Link>
    </li>
  );
}

export function ServicesPreview({ services }: { services: Service[] }) {
  const forEveryone = services.filter((s) => s.audience === "everyone");
  const frontDoor = forEveryone.find((s) => s.track === "start");
  const rows = forEveryone.filter((s) => s !== frontDoor);
  const forExistingClients = services.filter((s) => s.audience === "existing-clients");

  // Group rows by track in order of first appearance, then flatten, marking
  // the first row of each band so it alone carries the track label.
  const bands: Service[][] = [];
  for (const s of rows) {
    const band = bands.find((b) => b[0]?.track === s.track);
    if (band) band.push(s);
    else bands.push([s]);
  }

  return (
    <section aria-labelledby="services-heading">
      <h2 id="services-heading" className="max-w-[24ch] text-statement text-ink-50">
        Start with an audit.
      </h2>
      <p className="mt-5 max-w-[44ch] text-lead text-balance text-ink-300">
        Build what is worth it. Then keep it running.
      </p>

      {frontDoor ? (
        <div className="mt-12 md:mt-16">
          <FrontDoor service={frontDoor} />
        </div>
      ) : null}

      {bands.length > 0 ? (
        <SpotlightGrid className="mt-12 border-y border-line md:mt-16">
          <ul className="reveal-stagger divide-y divide-line-soft">
            {bands.flatMap((band) =>
              band.map((service, i) => (
                <Row
                  key={service.slug}
                  service={service}
                  label={i === 0 ? TRACK_LABEL[service.track] : null}
                />
              )),
            )}
          </ul>
        </SpotlightGrid>
      ) : null}

      {forExistingClients.length > 0 ? (
        <p className="mt-8 text-[0.9375rem] leading-relaxed text-ink-400">
          For existing clients, I also take on{" "}
          {forExistingClients.map((s, i) => (
            <span key={s.slug}>
              {separatorBefore(i, forExistingClients.length)}
              <Link href={`/services/${s.slug}`} className="link-quiet whitespace-nowrap">
                {s.title}
              </Link>
            </span>
          ))}
          .
        </p>
      ) : null}
    </section>
  );
}
