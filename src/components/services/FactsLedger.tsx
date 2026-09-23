import Link from "next/link";

// A small ledger of figures the article already states, pulled out of grey
// paragraphs so a scanner can find them. It never introduces a number: every
// value must appear verbatim in the body it sits in, and a row whose figure is
// not there is dropped rather than shown (see ledgerFor), so an edit to the
// prose can never leave a stale figure on the page.
//
// Placed by an MDX comment in the body, {/* facts-ledger */}; see
// splitAtMarkers in ./body. On the AI Code Confidence Review it sits after
// "How it works", so the terms in its rows (second pass, parallel checks,
// re-ranked) are defined before the numbers, and before the two reviews the
// article then tells in full. Directly under the paragraph that had just
// stated the same five numbers, it read as a repeat.
//
// No "found by" split on the healthcare review. The page defines the second
// pass as a check whose only job is to prove a problem wrong, so crediting it
// with finding 8 bugs contradicted the page. Restore the split only once it is
// confirmed which pass found them and the article can name it the same way.

type Row = { label: string; value: string };
type Group = { title: string; href: string; rows: Row[] };

const LEDGERS: Record<string, { caption: string; groups: Group[] }> = {
  "system-audit": {
    caption: "The figures from both reviews below, in one place.",
    groups: [
      {
        title: "Healthcare platform",
        href: "/work/beeline",
        rows: [
          { label: "Bugs handled", value: "14" },
          { label: "Held back, reason written down", value: "3" },
          { label: "Already broken in the live app", value: "2" },
        ],
      },
      {
        title: "Agency portal",
        href: "/work/bs-hub",
        rows: [
          { label: "Parallel checks", value: "14" },
          { label: "Problems found", value: "63" },
          { label: "Re-ranked by the second pass", value: "11" },
          { label: "Closed, older ones included", value: "87" },
          { label: "Tests passing at the end", value: "252 of 252" },
        ],
      },
    ],
  },
};

export function ledgerFor(slug: string, body: string) {
  const ledger = LEDGERS[slug];
  if (!ledger) return null;
  const inBody = (v: string) => (v.match(/\d+(?:,\d{3})*/g) ?? []).every((n) => new RegExp(`\\b${n}\\b`).test(body));
  const groups = ledger.groups
    .map((g) => ({ ...g, rows: g.rows.filter((r) => inBody(r.value)) }))
    .filter((g) => g.rows.length > 0);
  return groups.length ? { caption: ledger.caption, groups } : null;
}

export function FactsLedger({ caption, groups }: { caption: string; groups: Group[] }) {
  return (
    <figure className="card-surface my-12 rounded-2xl p-5 sm:p-7">
      <div className="grid gap-8 sm:grid-cols-2 sm:gap-8">
        {groups.map((g) => (
          <div key={g.title}>
            <p className="text-caption font-medium text-ink-400">
              <Link href={g.href} className="link-quiet text-ink-200">
                {g.title}
              </Link>
            </p>
            <dl className="mt-3 border-t border-line">
              {g.rows.map((r) => (
                <div
                  key={r.label}
                  className="flex items-baseline justify-between gap-4 border-b border-line-soft py-2.5"
                >
                  <dt className="text-sm leading-snug text-ink-400">{r.label}</dt>
                  <dd className="shrink-0 text-lg font-semibold leading-none text-ink-50">
                    {r.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
      <figcaption className="mt-5 text-caption text-ink-500">{caption}</figcaption>
    </figure>
  );
}
