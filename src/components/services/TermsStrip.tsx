import { cn } from "@/lib/cn";
import type { Term } from "./model";

// The deal in one line, directly under a service's headline: price, scope and
// timeline as two or three short facts. On phones it is a ledger (label left,
// value right, hairline rows); from md each fact is a column under its own top
// rule, so the row reads as a spec line rather than a stat hero. Values stay at
// reading size on purpose: the number is information, not decoration.
export function TermsStrip({ terms, className }: { terms: Term[]; className?: string }) {
  if (terms.length === 0) return null;
  return (
    <dl
      className={cn(
        "border-t border-line md:grid md:auto-cols-fr md:grid-flow-col md:gap-x-8 md:border-t-0",
        className,
      )}
    >
      {terms.map((t) => (
        <div
          key={t.label}
          className="grid grid-cols-[7rem_minmax(0,1fr)] items-baseline gap-x-4 border-b border-line-soft py-3 md:block md:border-b-0 md:border-t md:border-line md:pb-0 md:pt-4"
        >
          <dt className="text-caption text-ink-500">{t.label}</dt>
          <dd className="text-[1.0625rem] font-medium leading-snug text-ink-100 [text-wrap:balance] md:mt-1.5">
            {t.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
