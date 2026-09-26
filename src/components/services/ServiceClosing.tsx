import Link from "next/link";
import type { Service } from "@/content/schema";
import { ServiceInquiryForm } from "@/components/lead/ServiceInquiryForm";
import { Reveal } from "@/components/site/Reveal";
import { closingHeading, closingLine, dealFor, messagePlaceholder, termsFor } from "./model";

// The decision point at the foot of every service page, and the target of the
// header's primary button (#start). One heading, one sentence with one
// promise, a recap of what is being bought beside the form, and the call as
// the quiet alternative. Lit from below: the light points forward.
export function ServiceClosing({ meta, sourcePage }: { meta: Service; sourcePage: string }) {
  const terms = termsFor(meta);
  const [price, ...scope] = terms;
  const rest = [...scope, ...dealFor(meta)];
  const start = meta.track === "start";
  const placeholder = messagePlaceholder(meta);

  return (
    <Reveal className="reveal-lead">
      <section
        id="start"
        aria-labelledby="start-heading"
        className="panel-lit relative scroll-mt-24 overflow-hidden rounded-2xl"
      >
        <div aria-hidden className="ember-rise pointer-events-none absolute inset-0" />
        <div className="relative px-5 py-9 sm:p-8 md:p-12">
          <div className="border-b border-line pb-8 md:pb-10">
            <h2 id="start-heading" className="max-w-[24ch] text-section font-semibold text-ink-50">
              {start ? (
                // The product name never splits across lines ("Start the Ops /
                // Leak Audit." read as two things on a phone).
                <>
                  Start the <span className="whitespace-nowrap">{meta.title}.</span>
                </>
              ) : (
                closingHeading(meta)
              )}
            </h2>
            <p className="mt-4 max-w-[52ch] text-[1.0625rem] leading-relaxed text-ink-300">
              {closingLine(meta)}
            </p>
          </div>

          <div className="mt-8 grid gap-10 md:mt-10 md:grid-cols-12 md:gap-12 lg:gap-16">
            {/* The deal, next to where they commit to it: the price, then the
                rest of the terms from the header strip as label/value rows.
                It confirms the deal rather than reprinting what you get, which
                the article and the aside already list. On a phone it follows
                the form, which is the thing to reach. */}
            <div className="order-last md:order-none md:col-span-5">
              <p className="text-caption text-ink-500">{meta.title}</p>
              {price ? (
                <p className="mt-1 text-reference font-semibold text-ink-50">{price.value}</p>
              ) : null}
              {rest.length > 0 ? (
                <dl className="mt-5 border-t border-line-soft">
                  {rest.map((t) => (
                    <div
                      key={t.label}
                      className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-baseline gap-x-4 border-b border-line-soft py-3"
                    >
                      <dt className="text-caption text-ink-500">{t.label}</dt>
                      <dd className="text-[0.9375rem] leading-normal text-ink-200">{t.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              <p className="mt-6 text-[0.9375rem] text-ink-400">
                Prefer a call?{" "}
                <Link href="/contact" className="link-quiet">
                  Book 30 minutes
                </Link>
                .
              </p>
            </div>

            <div className="md:col-span-7">
              <ServiceInquiryForm
                sourcePage={sourcePage}
                serviceTitle={meta.title}
                {...(start
                  ? {
                      messageLabel: "Your team and its tools",
                      messagePlaceholder:
                        "How many people, which tools the work runs on, and the workflow you suspect costs the most.",
                      submitLabel: "Request a start date",
                    }
                  : placeholder
                    ? { messagePlaceholder: placeholder }
                    : {})}
              />
            </div>
          </div>
        </div>
      </section>
    </Reveal>
  );
}
