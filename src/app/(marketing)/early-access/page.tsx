import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/site/PageHeader";
import { EarlyAccessForm } from "@/components/lead/EarlyAccessForm";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Get Early Access to the Hosted Gravixar Platform",
  description:
    "A hosted Gravixar account is coming. Run a module (agentic email, client portal, intake wizard) on the platform without commissioning a custom build. Lower pricing, monthly.",
  path: "/early-access",
});

const TIERS = [
  {
    name: "Starter",
    price: "$49 / mo",
    blurb: "1 hosted module, 1 user, email support",
    fit: "solo founders, side projects, individual consultants",
  },
  {
    name: "Pro",
    price: "$149 / mo",
    blurb: "3 modules, 5 users, priority support",
    fit: "small agencies, partner-led teams",
    highlighted: true,
  },
  {
    name: "Concierge",
    price: "$399 / mo",
    blurb: "Custom setup, unlimited modules, dedicated Slack",
    fit: "the lower-end of the custom-build market",
  },
] as const;

const HOW_IT_WORKS = [
  {
    n: "01",
    title: "Pick a module",
    body: "AI intake wizard, agentic email, client portal, audit log + restore, daily check-in. Each module is the same pattern that runs in production for our existing builds.",
  },
  {
    n: "02",
    title: "We host it for you",
    body: "Your data, your account, our infrastructure. No DevOps, no SSL certs, no custom build cycle. You get a working module in minutes, not weeks.",
  },
  {
    n: "03",
    title: "Approve, don't auto-send",
    body: "Same human-in-the-loop pattern as the custom builds. AI drafts, you approve. No 3am surprises, no auto-published garbage.",
  },
] as const;

export default function EarlyAccessPage() {
  return (
    <div className="space-y-16">
      <PageHeader
        eyebrow="early access"
        title="The hosted platform: productized AI-ops, without commissioning a build."
        lede="The same modules that run in production at our custom-build clients, available as a monthly subscription. Pick one, sign in, configure, run. A human still approves every write. Private beta opening soon, get on the list."
      />

      <section className="grid gap-12 lg:grid-cols-12">
        {/* Form column */}
        <div className="lg:col-span-7">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">
            join the waitlist
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            One email when private beta opens. No drip sequence, no marketing
            list, no sharing your address with anyone.
          </p>
          <div className="mt-6">
            <EarlyAccessForm />
          </div>
        </div>

        {/* Pricing column */}
        <aside className="lg:col-span-5">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">
            pricing, indicative
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Final pricing lands at beta open. These are the bands we&apos;re
            building toward.
          </p>
          <ul className="mt-6 space-y-3">
            {TIERS.map((t) => (
              <li
                key={t.name}
                className={
                  "highlighted" in t && t.highlighted
                    ? "rounded-xl border border-brand/40 bg-brand/5 p-5"
                    : "rounded-xl border border-zinc-800 bg-zinc-950/40 p-5"
                }
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-base font-medium text-zinc-100">
                    {t.name}
                  </p>
                  <p className="font-mono text-sm text-zinc-100">{t.price}</p>
                </div>
                <p className="mt-2 text-sm text-zinc-300">{t.blurb}</p>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  fit · {t.fit}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">
            looking for a custom build instead? <Link href="/contact" className="text-brand-soft underline-offset-4 hover:underline">book a call →</Link>
          </p>
        </aside>
      </section>

      {/* How it works */}
      <section>
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">
          how it works
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {HOW_IT_WORKS.map((step) => (
            <div
              key={step.n}
              className="card-surface rounded-2xl p-6"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                step {step.n}
              </p>
              <h3 className="mt-3 text-lg font-medium tracking-[-0.01em] text-zinc-100">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* What you can do today */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-8 md:p-10">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">
          while you wait
        </h2>
        <h3 className="mt-3 max-w-3xl text-2xl font-medium tracking-[-0.015em] md:text-3xl">
          The modules that will live inside the platform are already running.
        </h3>
        <p className="mt-3 max-w-2xl text-sm text-zinc-300">
          Each module on the demo site is a sandbox of the exact pattern that
          ships when you sign up. Try them now, see if the shape fits before
          you wait for beta.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/modules"
            className="rounded-md border border-zinc-700 px-5 py-2.5 text-sm text-zinc-200 transition-colors hover:border-brand hover:text-brand-soft"
          >
            See the module library →
          </Link>
          <Link
            href="/contact"
            className="rounded-md border border-zinc-700 px-5 py-2.5 text-sm text-zinc-200 transition-colors hover:border-brand hover:text-brand-soft"
          >
            Book a custom-build call →
          </Link>
        </div>
      </section>
    </div>
  );
}
