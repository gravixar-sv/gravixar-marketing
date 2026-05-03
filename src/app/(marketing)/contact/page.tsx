import type { Metadata } from "next";
import { PageHeader } from "@/components/site/PageHeader";
import { ContactForm } from "@/components/lead/ContactForm";
import { CalEmbed } from "@/components/lead/CalEmbed";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Contact",
  description:
    "Book a 30-minute discovery call, or send a longer note. I reply within 24 hours.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="contact"
        title="Tell me what you're trying to build."
        lede="Two ways in: send a note with the details, or grab a slot directly. Either works, pick whichever you have less friction with."
      />

      <div className="grid gap-10 md:grid-cols-2">
        <section>
          <h2 className="font-mono text-xs uppercase tracking-widest text-brand">
            send a note
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Best for complex briefs, operations problems, AI integrations, or
            anything where context matters.
          </p>
          <div className="mt-6">
            <ContactForm />
          </div>
        </section>

        <section>
          <h2 className="font-mono text-xs uppercase tracking-widest text-brand">
            book a 30-min call
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Pick a slot. No prep needed, bring the problem, I&apos;ll bring
            the questions.
          </p>
          <div className="mt-6">
            <CalEmbed />
          </div>
        </section>
      </div>
    </div>
  );
}
