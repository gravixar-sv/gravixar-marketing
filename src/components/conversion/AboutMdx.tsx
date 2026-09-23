import type { ReactNode } from "react";

// Components the About MDX body can use, on top of the site-wide map in
// src/content/mdx.tsx. They exist because the page's proof used to be walls
// of numbers inside sentences (one paragraph carried seven figures, one bullet
// ten), which nobody reads on a phone. The figures now sit in the MDX exactly
// as counted, and these components set them as reference material: a quiet
// ledger of label/value rows, and a list of current work with one result each.
//
// Server components, no motion of their own: they arrive with the prose.

// ---------- Ledger ----------

export function Ledger({ children }: { children: ReactNode }) {
  return (
    <figure className="my-10 grid gap-x-10 gap-y-8 border-y border-line py-6 sm:grid-cols-2">
      {children}
    </figure>
  );
}

// One dated group of figures. `when` is the count date or period, set as a
// people-facing caption above the rows.
export function LedgerGroup({ when, children }: { when: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-caption font-medium text-ink-400">{when}</p>
      <dl className="mt-2 divide-y divide-line-soft">{children}</dl>
    </div>
  );
}

// Value first, visually, so a column of numbers reads down the left edge; the
// <dt> still comes first in the source so a screen reader hears the label
// before the number.
export function Fact({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-row-reverse items-baseline justify-end gap-4 py-2.5">
      <dt className="min-w-0 text-sm leading-snug text-ink-300">{label}</dt>
      <dd className="w-14 shrink-0 text-xl font-semibold tabular-nums tracking-[-0.02em] text-ink-50">{value}</dd>
    </div>
  );
}

// ---------- Current work ----------

export function WorkList({ children }: { children: ReactNode }) {
  return <ul className="mt-6 border-b border-line-soft">{children}</ul>;
}

// `children` is markdown (MDX wraps it in the site's <p>), so an item can
// still carry an inline link. The link on the title goes to the full story.
export function WorkItem({
  title,
  href,
  note,
  children,
}: {
  title: string;
  href?: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <li className="grid gap-x-8 gap-y-2 border-t border-line-soft py-6 md:grid-cols-[minmax(0,12.5rem)_minmax(0,1fr)]">
      <div>
        <h3 className="text-base font-semibold leading-snug text-ink-50">
          {href ? (
            <a href={href} className="link-quiet">
              {title}
            </a>
          ) : (
            title
          )}
        </h3>
        {note ? <p className="mt-1 text-caption text-ink-500">{note}</p> : null}
      </div>
      <div className="min-w-0 [&>p]:mt-0 [&>p+p]:mt-3">{children}</div>
    </li>
  );
}
