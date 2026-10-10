import type { Metadata } from "next";
import { PageHeader } from "@/components/site/PageHeader";
import { PageLight } from "@/components/conversion/PageLight";
import { OpsLeakCalculator } from "@/components/calculator/OpsLeakCalculator";
import { buildMetadata } from "@/lib/seo";

// The free step before the paid one. Every close competitor puts a self-check
// in front of its paid diagnostic (ZenPilot's PM Grader, Parakeeto's
// calculator), and until this page gravixar.com went straight from stranger to
// $3,500. It takes about three minutes, shows the answer on the page with no
// email, and ends on the audit. The email only buys the same breakdown as a
// PDF. HQ brain task: marketing-ops-leak-calculator.

export const metadata: Metadata = buildMetadata({
  title: "Ops Leak calculator: what busywork costs your team a month",
  description:
    "A free three-minute check. Enter the hours your team spends on status reports, chasing approvals, typing things twice and hunting for files, and see what they cost a month.",
  path: "/ops-leak-calculator",
});

export default function OpsLeakCalculatorPage() {
  return (
    <div className="relative isolate">
      <PageLight />
      <PageHeader
        eyebrow="Ops Leak calculator"
        title="What does busywork cost your team"
        accent="each month?"
        lede="Status reports put together by hand, approvals chased, the same thing typed into two tools, files nobody can find. Tell me roughly how many hours go to each and what an hour costs you. The estimate shows on this page as you type, and you don't need to give an email to see it."
      />
      <div className="mt-12 md:mt-16">
        <OpsLeakCalculator />
      </div>
    </div>
  );
}
