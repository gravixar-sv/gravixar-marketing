import type { Metadata } from "next";
import { PageHeader } from "@/components/site/PageHeader";
import { ContactForm } from "@/components/lead/ContactForm";
import { BookCall } from "@/components/lead/BookCall";
import { PageLight } from "@/components/conversion/PageLight";
import { ReplyPromise } from "@/components/conversion/ReplyPromise";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Contact Gravixar, book a 30-minute call",
  description:
    "Book a 30-minute discovery call or send a longer note about your operations. I reply within 24 hours, founder to founder.",
  path: "/contact",
});

// Two ways in, side by side on desktop. Booking comes first in the source, so
// on a phone the lower-effort path (pick a time) leads and the note form
// follows, instead of a visitor who wants a call scrolling past eight fields
// to find a single time. The reading order and the visual order are the same
// at every width; nothing is reordered with CSS.
export default function ContactPage() {
  return (
    <div className="relative isolate">
      <PageLight />
      <PageHeader
        eyebrow="Contact"
        title="Tell me what you're trying to build."
        lede="Send a note or pick a time to talk. Either way, it comes straight to me."
      >
        <ReplyPromise />
      </PageHeader>

      <div className="mt-12 grid gap-16 md:mt-16 md:grid-cols-2 md:gap-10 lg:gap-16">
        <section id="book" aria-labelledby="book-title" className="min-w-0 scroll-mt-24">
          <h2 id="book-title" className="text-reference font-semibold text-ink-50">
            Book a 30-minute call
          </h2>
          <p className="mt-2 max-w-[46ch] text-ink-400">
            Bring the problem, I&apos;ll bring the questions. It runs on Google Meet.
            <span className="md:hidden">
              {" "}
              Rather write it down?{" "}
              <a href="#note" className="link-quiet">
                Send a note
              </a>
              .
            </span>
          </p>
          <div className="mt-6">
            <BookCall />
          </div>
        </section>

        <section id="note" aria-labelledby="note-title" className="min-w-0 scroll-mt-24">
          <h2 id="note-title" className="text-reference font-semibold text-ink-50">
            Send a note
          </h2>
          <p className="mt-2 max-w-[46ch] text-ink-400">Best when there is a lot to explain.</p>
          <div className="mt-6">
            <ContactForm />
          </div>
        </section>
      </div>
    </div>
  );
}
