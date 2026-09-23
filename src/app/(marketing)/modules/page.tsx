import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/site/PageHeader";
import { ContactCTA } from "@/components/home/ContactCTA";
import { Reveal } from "@/components/site/Reveal";
import { Arrow } from "@/components/ui/Button";
import { MODULE_CATEGORY_LABELS } from "@/components/content/modules";
import { loadModules } from "@/content/loaders";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "Module library, the parts I build once and use again",
  description:
    "Modules reused across builds: sign-in, audit log, client sign-off, AI guardrails, finance, tax, leave. Each one names the build it runs in today.",
  path: "/modules",
});

// A catalogue, set as one: categories down the left, plain rows on the right.
// The identical card grid this replaced had orphaned half-rows in odd groups
// and printed each module's GLOBAL order number inside its category, so the
// page read 03, 12, 04, 09... on a page selling rigour. No numbers now; the
// count sits on the category heading instead.
export default async function ModulesIndexPage() {
  const modules = await loadModules();

  // Group by category, in the order the categories first appear.
  const groups = modules.reduce<Record<string, typeof modules>>((acc, m) => {
    (acc[m.meta.category] ||= []).push(m);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        eyebrow="Module library"
        title="The parts I build once and use again."
        lede="Every project leaves behind parts I can use again: sign-in, sign-off flows, change history, payroll. Your build starts further along because these already exist. Each one below names where it runs today."
      />

      <div className="mt-4 space-y-16 md:mt-8 md:space-y-20">
        {Object.entries(groups).map(([category, items]) => {
          const label =
            MODULE_CATEGORY_LABELS[category as keyof typeof MODULE_CATEGORY_LABELS] ?? category;
          return (
            <section
              key={category}
              aria-labelledby={`cat-${category}`}
              className="grid gap-x-12 gap-y-2 border-t border-line pt-8 first:border-t-0 md:pt-10 lg:grid-cols-[14rem_minmax(0,1fr)]"
            >
              <div>
                <h2
                  id={`cat-${category}`}
                  className="flex items-baseline gap-2.5 text-reference font-semibold text-ink-100 lg:sticky lg:top-28"
                >
                  {label}
                  <span className="text-caption font-normal tabular-nums text-ink-500">
                    {items.length}
                  </span>
                </h2>
              </div>
              <Reveal className="reveal-quiet">
                <ol className="reveal-stagger border-t border-line-soft lg:border-t-0">
                  {items.map((m) => (
                    <li
                      key={m.meta.slug}
                      className="group border-b border-line-soft transition-colors last:border-b-0 hover:border-line lg:first:-mt-6"
                    >
                      <Link
                        href={`/modules/${m.meta.slug}`}
                        className="grid gap-x-8 py-6 md:grid-cols-[minmax(0,1fr)_auto]"
                      >
                        <div className="min-w-0">
                          <h3 className="text-xl font-semibold leading-snug tracking-[-0.012em] text-ink-100 transition-colors group-hover:text-ink-50">
                            {m.meta.title}
                          </h3>
                          <p className="mt-2 line-clamp-3 max-w-[64ch] text-[0.9375rem] leading-relaxed text-ink-400 md:line-clamp-none">
                            {m.meta.summary}
                          </p>
                          <p className="mt-3 text-caption text-ink-500">
                            Runs in {m.meta.runningIn.map((r) => r.client).join(", ")}
                          </p>
                        </div>
                        <span aria-hidden className="hidden pt-1 text-ink-400 transition-colors group-hover:text-ink-50 md:block">
                          <Arrow />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </Reveal>
            </section>
          );
        })}
      </div>

      <div className="mt-20 md:mt-28">
        <ContactCTA />
      </div>
    </div>
  );
}
