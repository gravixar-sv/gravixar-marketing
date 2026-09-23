import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { TocItem } from "./longform";

// The long-form grid every reading page shares: a 68ch column on the left of
// the 1104px container and, at lg, a sticky rail on the right.
//
// The measure is set in ch at the prose size (17px), so the column holds about
// 68 characters a line whatever the viewport. The rail carries the table of
// contents (desktop only: on a phone it would be a screen of links before the
// first paragraph) plus anything page-specific passed as `rail`, which stays
// visible at every width and stacks after the body on a phone.
export function ArticleBody({
  toc = [],
  rail,
  children,
  className,
}: {
  toc?: TocItem[];
  rail?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const showToc = toc.length >= 2;
  return (
    <div
      className={cn(
        "grid gap-x-16 gap-y-14 lg:grid-cols-[minmax(0,1fr)_13.5rem]",
        className,
      )}
    >
      <div className="min-w-0 max-w-[68ch] text-prose">{children}</div>
      {showToc || rail ? (
        <aside className="min-w-0">
          <div className="space-y-10 lg:sticky lg:top-28">
            {showToc ? <TocNav toc={toc} className="hidden lg:block" /> : null}
            {rail}
          </div>
        </aside>
      ) : null}
    </div>
  );
}

// Plain anchors on a hairline. No scroll spy: the header's reading-progress
// line already says where the reader is, and a second moving marker would be
// motion with nothing new to say.
export function TocNav({ toc, className }: { toc: TocItem[]; className?: string }) {
  return (
    <nav aria-label="On this page" className={className}>
      <p className="text-caption font-medium text-ink-500">On this page</p>
      <ol className="mt-4 border-l border-line">
        {toc.map((t) => (
          <li key={t.id}>
            <a
              href={`#${t.id}`}
              className="-ml-px block border-l border-transparent py-1.5 pl-4 text-caption text-ink-400 transition-colors hover:border-line-strong hover:text-ink-100"
            >
              {t.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

// A labelled block for the rail (Runs in, Built with, Related). Sans caption
// label: these are people-facing, not machine output.
export function RailBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-caption font-medium text-ink-500">{label}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}
