import { SetFigure } from "@/components/site/SetFigure";
import type { CaseStudy } from "@/content/schema";
import { cn } from "@/lib/cn";
import { glanceMetrics, keepCompounds } from "./model";

// "At a glance": the facts a reader wants before committing to the long read,
// right under the cover on every viewport. Two quiet columns of label/value
// rows on hairlines, not cards and not big-number tiles. The engagement on the
// left, the numbers on the right. A number with provenance carries the date it
// was checked, in mono, because that date is machine output; when every row
// was checked on the same day, the date prints once under the block.
//
// The numbers are set in type as the block scrolls in (<SetFigure>): each
// glyph rises in its own slot, so no frame ever shows a number the study does
// not print. The rows and their hairlines hold still.
//
// On phones the engagement folds into one caption line (client and period;
// the role waits for a wider screen), so the reading starts a screen sooner.
export function CaseLedger({ meta, className }: { meta: CaseStudy; className?: string }) {
  const numbers = glanceMetrics(meta);
  const facts = [
    { label: "Client", value: keepCompounds(meta.client) },
    { label: "Role", value: meta.role },
    { label: "Period", value: meta.period },
  ];
  const dates = new Set(numbers.map((m) => m.verifiedAt ?? ""));
  const shared =
    numbers.length > 1 && dates.size === 1 && numbers[0]?.verifiedAt ? numbers[0].verifiedAt : null;

  return (
    <section aria-labelledby="at-a-glance" className={cn("border-y border-line py-7 sm:py-8 md:py-10", className)}>
      <h2 id="at-a-glance" className="text-caption font-normal tracking-normal text-ink-400 [font-stretch:100%]">
        At a glance
      </h2>
      <p className="mt-3 text-[0.9375rem] leading-snug text-ink-200 sm:hidden">
        {keepCompounds(meta.client)}
        <span className="mt-0.5 block text-caption text-ink-400">{meta.period}</span>
      </p>
      <div className="mt-4 grid gap-x-16 sm:mt-6 md:grid-cols-2">
        <dl className="hidden divide-y divide-line-soft sm:block">
          {facts.map((f) => (
            <Row key={f.label} label={f.label}>
              <span className="text-ink-200">{f.value}</span>
            </Row>
          ))}
        </dl>
        {numbers.length > 0 ? (
          <div>
            <dl className="divide-y divide-line-soft border-t border-line-soft md:border-t-0">
              {numbers.map((m) => (
                <Row key={m.label} label={m.label}>
                  <span className="font-medium text-ink-50">
                    <SetFigure text={m.value} />
                  </span>
                  {m.verifiedAt && !shared ? (
                    <span className="mt-1 block font-mono text-label-xs text-ink-500">checked {m.verifiedAt}</span>
                  ) : null}
                </Row>
              ))}
            </dl>
            {shared ? (
              // Aligned under the value column (10rem label + 1.5rem gap).
              <p className="mt-1 font-mono text-label-xs text-ink-500 sm:pl-[11.5rem]">checked {shared}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-3.5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6">
      <dt className="text-caption text-ink-400">{label}</dt>
      <dd className="text-[0.9375rem] leading-snug">{children}</dd>
    </div>
  );
}
