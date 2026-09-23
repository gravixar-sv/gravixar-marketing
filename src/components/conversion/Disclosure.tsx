import type { ReactNode } from "react";

// Native <details> for the optional qualifiers on a lead form. It keeps the
// form short for the visitor who only wants to send a line, and the fields
// inside still submit with the form whether or not it was opened (a closed
// <details> hides its content, it does not remove it from the form).
//
// No JS, so it works before hydration and with scripting off. The only motion
// is the chevron turning on open, 200ms on the default curve; under reduced
// motion it simply flips.
export function Disclosure({
  summary,
  optional = true,
  children,
}: {
  summary: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="group/disclosure rounded-xl border border-line-soft transition-colors duration-200 open:border-line open:bg-ink-50/[0.015]">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-ink-200 transition-colors duration-200 hover:text-ink-50 [&::-webkit-details-marker]:hidden">
        <span>
          {summary}
          {optional ? <span className="ml-1.5 font-normal text-ink-500">(optional)</span> : null}
        </span>
        <svg
          aria-hidden
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className="shrink-0 text-ink-500 transition-transform duration-200 ease-out group-open/disclosure:rotate-180 motion-reduce:transition-none"
        >
          <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="space-y-6 px-4 pb-5 pt-2">{children}</div>
    </details>
  );
}
