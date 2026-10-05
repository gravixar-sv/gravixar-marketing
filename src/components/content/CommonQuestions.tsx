import { StructuredDataFAQ } from "@/components/site/StructuredData";
import { cn } from "@/lib/cn";

export type Faq = { question: string; answer: string };

// The "Common questions" list, plus its FAQPage JSON-LD from the SAME array,
// so the structured data can only ever say what the visible list says. Lifted
// out of the compare template on 2026-10-05 when the service and buyer pages
// grew FAQs too: three copies of one list is how a fix lands on one of them.
//
// `id` is the anchor a table of contents can point at. Answers render as
// plain text on purpose (see faqList in src/content/schema.ts).
export function CommonQuestions({
  faqs,
  id = "common-questions",
  title = "Common questions",
  className,
}: {
  faqs: readonly Faq[];
  id?: string;
  title?: string;
  className?: string;
}) {
  if (faqs.length === 0) return null;
  return (
    <section id={id} aria-labelledby={`${id}-h`} className={cn("scroll-mt-28", className)}>
      <StructuredDataFAQ faqs={[...faqs]} />
      <h2
        id={`${id}-h`}
        className="text-[1.625rem] font-semibold leading-[1.18] tracking-[-0.02em] text-ink-50 md:text-subsection"
      >
        {title}
      </h2>
      <dl className="mt-6 border-t border-line-soft">
        {faqs.map((f) => (
          <div key={f.question} className="border-b border-line-soft py-6">
            <dt className="text-[1.125rem] font-semibold leading-snug text-ink-100">{f.question}</dt>
            <dd className="mt-2.5 text-prose text-ink-300">{f.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
