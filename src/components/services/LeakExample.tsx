// An excerpt of an Ops Leak Audit report, the way its reader sees the count:
// workflow, who does it, hours a week, where the number came from, and what it
// costs. A buyer deciding on $3,500 asked to see what they get, and the page
// had only described it.
//
// EVERY FIGURE HERE IS INVENTED, and the caption says so above the table and
// again under it. That is also why the rows live in code and not in MDX prose:
// the numbers are a format, not a claim, and they stay out of anything that
// reads published copy as fact.

const HOURLY_COST = 35; // GBP, a blended staff cost with overheads
const WEEKS_PER_MONTH = 52 / 12;

const ROWS: { workflow: string; who: string; hours: number; from: string }[] = [
  {
    workflow: "Friday status report, rebuilt by hand from three tools",
    who: "3 project managers",
    hours: 7.5,
    from: "Screen recording of one Friday",
  },
  {
    workflow: "Client approvals chased across email and chat",
    who: "2 account managers",
    hours: 5,
    from: "Interviews, checked against a week of email",
  },
  {
    workflow: "Timesheets typed again into the invoicing tool",
    who: "1 finance assistant",
    hours: 3,
    from: "Walkthrough and the tool's edit history",
  },
];

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});
// Each row rounds to £10, and the total is the sum of the rounded rows, so the
// column adds up for a reader checking it by hand. Totalling the hours first
// printed £2,350 under rows that add to £2,360, on the page that promises
// every number can be checked.
const monthlyCost = (hours: number) => Math.round((hours * WEEKS_PER_MONTH * HOURLY_COST) / 10) * 10;
const totalHours = ROWS.reduce((sum, r) => sum + r.hours, 0);
const totalCost = ROWS.reduce((sum, r) => sum + monthlyCost(r.hours), 0);

export function LeakExample() {
  return (
    <figure className="mt-8">
      <figcaption className="text-caption text-ink-500">
        Sample. A made-up 24-person London agency, with staff costed at £{HOURLY_COST} an hour
        including overheads.
      </figcaption>
      <div className="mt-3 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm text-ink-300">
          <thead>
            <tr>
              {["Workflow", "Who", "Hours a week", "Counted from", "Cost a month"].map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="border-b border-line bg-ink-900/60 px-4 py-3 font-medium text-ink-100"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.workflow}>
                <td className="border-b border-line-soft px-4 py-3 align-top text-ink-200">{r.workflow}</td>
                <td className="border-b border-line-soft px-4 py-3 align-top">{r.who}</td>
                <td className="border-b border-line-soft px-4 py-3 align-top tabular-nums">{r.hours}</td>
                <td className="border-b border-line-soft px-4 py-3 align-top">{r.from}</td>
                <td className="border-b border-line-soft px-4 py-3 align-top tabular-nums">
                  {gbp.format(monthlyCost(r.hours))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={2} className="px-4 py-3 text-left font-medium text-ink-100">
                The leak
              </th>
              <td className="px-4 py-3 font-medium tabular-nums text-ink-100">{totalHours}</td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3 font-medium tabular-nums text-ink-100">{gbp.format(totalCost)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-400">
        The priced fix in this sample keeps the project tool, moves approvals into the client view it
        already has, and connects timesheets to invoicing. None of these numbers belong to a client. Your
        report does the same for your team, in your currency.
      </p>
    </figure>
  );
}
