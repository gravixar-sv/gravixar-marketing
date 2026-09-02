import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/site/PageHeader";
import { ContactCTA } from "@/components/home/ContactCTA";
import { loadModules } from "@/content/loaders";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "Module library, the patterns I reuse across builds",
  description:
    "Modules reused across builds: auth, audit log, review state machines, AI guardrails, finance, tax, leave. Each one compounds with the next build.",
  path: "/modules",
});

const CATEGORY_LABELS: Record<string, string> = {
  auth: "auth & permissions",
  audit: "audit & compliance",
  ai: "ai & guardrails",
  finance: "finance",
  ops: "operations",
  comms: "communications",
};

export default async function ModulesIndexPage() {
  const modules = await loadModules();

  // Group by category for the index, in the order the categories appear.
  const groups = modules.reduce<Record<string, typeof modules>>((acc, m) => {
    (acc[m.meta.category] ||= []).push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-16">
      <PageHeader
        eyebrow="module library"
        title="The patterns I reuse across builds."
        lede="Each engagement adds reusable modules to a shared library. The next build is faster because these already exist. Every entry below is running in production or private beta, with a link to where."
      />

      {Object.entries(groups).map(([category, items]) => (
        <section key={category}>
          <p className="font-mono text-label uppercase text-brand">
            {CATEGORY_LABELS[category] ?? category}
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {items.map((m) => (
              <Link
                key={m.meta.slug}
                href={`/modules/${m.meta.slug}`}
                className="card-surface card-hover-glow group rounded-xl p-6"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-lg font-semibold tracking-[-0.01em] text-zinc-100 md:text-xl">
                    {m.meta.title}
                  </h2>
                  <span className="font-mono text-[10px] text-zinc-700">
                    {String(m.meta.order).padStart(2, "0")}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                  {m.meta.summary}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-label-sm uppercase text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-brand" />
                    running in
                  </span>
                  {m.meta.runningIn.map((r, i) => (
                    <span key={`${r.client}-${i}`} className="text-zinc-400">
                      {r.client}
                      {i < m.meta.runningIn.length - 1 ? " ·" : ""}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <ContactCTA />
    </div>
  );
}
