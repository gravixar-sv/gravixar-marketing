"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import { createFormClock } from "@gravixar/forms";
import { cn } from "@/lib/cn";
import { sourceTag } from "@/lib/source-tag";
import {
  CURRENCIES,
  CURRENCY_CODES,
  EXAMPLE,
  LEAKS,
  TOOLS,
  WEEKS_PER_MONTH,
  compute,
  money,
  who,
  type CalcInput,
  type Currency,
  type LeakKey,
} from "@/lib/ops-leak";
import { Arrow, Button, buttonClass } from "@/components/ui/Button";
import { FieldHint, FieldLabel, FormError, FormSuccess, TextField, controlClass } from "@/components/ui/Field";

// The Ops Leak calculator. Everything is worked out in the browser as the
// visitor types, and the result is never gated: the email form only buys the
// same breakdown as a PDF. The arithmetic lives in src/lib/ops-leak.ts so the
// page, the PDF and the route agree to the unit.
//
// No motion on the result. It changes on every keystroke, and a number that
// animates while you type reads as the page arguing with you.

// The inputs are held as the strings the visitor typed, so a field can be
// empty mid-edit without snapping back to 0. They become numbers here.
type Draft = {
  teamSize: string;
  tools: string[];
  leaks: Record<LeakKey, { people: string; hours: string }>;
  rate: string;
  currency: Currency;
};

const toDraft = (v: CalcInput): Draft => ({
  teamSize: String(v.teamSize),
  tools: [...v.tools],
  leaks: Object.fromEntries(
    LEAKS.map((l) => [l.key, { people: String(v.leaks[l.key].people), hours: String(v.leaks[l.key].hours) }]),
  ) as Draft["leaks"],
  rate: String(v.rate),
  currency: v.currency,
});

const num = (s: string, max: number, int = false) => {
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(int ? Math.floor(n) : n, max);
};

// The draft as valid inputs: blanks are 0, everything is clamped to the limits
// the route enforces, and no leak has more people than the team.
function toInput(d: Draft): CalcInput {
  const teamSize = Math.max(1, num(d.teamSize, 500, true));
  return {
    teamSize,
    tools: d.tools.filter((t): t is (typeof TOOLS)[number] => (TOOLS as readonly string[]).includes(t)),
    leaks: Object.fromEntries(
      LEAKS.map((l) => [
        l.key,
        {
          people: Math.min(num(d.leaks[l.key].people, 500, true), teamSize),
          hours: num(d.leaks[l.key].hours, 40),
        },
      ]),
    ) as CalcInput["leaks"],
    rate: Math.max(1, num(d.rate, 2000)),
    currency: d.currency,
  };
}

const numberClass = cn(
  controlClass,
  "h-11 tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
);

function NumberField({
  label,
  value,
  onChange,
  max,
  step = 1,
  hint,
  srLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  step?: number;
  hint?: React.ReactNode;
  /** A fuller name for screen readers when the visible label is short. */
  srLabel?: string;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink-200">
        {srLabel ? (
          <>
            <span aria-hidden>{label}</span>
            <span className="sr-only">{srLabel}</span>
          </>
        ) : (
          label
        )}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={hintId}
        className={cn(numberClass, "mt-2")}
      />
      {hint ? <FieldHint id={hintId}>{hint}</FieldHint> : null}
    </div>
  );
}

function Section({ step, title, hint, children }: { step: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-t border-line pt-7">
      <legend className="float-left w-full">
        <span className="font-mono text-label-sm text-ink-500">{step}</span>
        <span className="mt-1.5 block text-reference font-semibold text-ink-50">{title}</span>
      </legend>
      {hint ? <p className="clear-left max-w-[56ch] pt-2 text-[0.9375rem] leading-relaxed text-ink-400">{hint}</p> : null}
      <div className="clear-left pt-6">{children}</div>
    </fieldset>
  );
}

export function OpsLeakCalculator() {
  const [draft, setDraft] = useState<Draft>(() => toDraft(EXAMPLE));
  const input = useMemo(() => toInput(draft), [draft]);
  const result = useMemo(() => compute(input), [input]);
  const m = (n: number) => money(n, input.currency);
  const started = useRef(false);

  // One event per visit, on the first change: the October target counts
  // completions, and a visit that never touches the example is not one.
  function edit(next: (d: Draft) => Draft) {
    setDraft(next);
    if (!started.current) {
      started.current = true;
      track("Ops Leak calculator used");
    }
  }

  const setLeak = (key: LeakKey, field: "people" | "hours", v: string) =>
    edit((d) => ({ ...d, leaks: { ...d.leaks, [key]: { ...d.leaks[key], [field]: v } } }));

  const toggleTool = (t: string) =>
    edit((d) => ({ ...d, tools: d.tools.includes(t) ? d.tools.filter((x) => x !== t) : [...d.tools, t] }));

  // Switching currency swaps the hourly cost too, but only while it is still
  // the old currency's example figure: a rate the visitor typed is theirs.
  const setCurrency = (c: Currency) =>
    edit((d) => ({
      ...d,
      currency: c,
      rate: d.rate === String(CURRENCIES[d.currency].defaultRate) ? String(CURRENCIES[c].defaultRate) : d.rate,
    }));

  const workingDays = Math.round((result.weeklyHours * WEEKS_PER_MONTH) / 8);
  const sorted = [...result.rows].sort((a, b) => b.monthlyCost - a.monthlyCost);
  const topKeys = new Set(result.top.map((r) => r.key));

  return (
    <>
      <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
        {/* ---- The questions */}
        <div className="min-w-0 space-y-12 lg:col-span-7">
          <p className="text-[0.9375rem] text-ink-400">
            The figures are filled in for an example 12-person team. Change them to yours.
          </p>

          <Section step="01" title="Your team">
            <div className="max-w-[12rem]">
              <NumberField
                label="People on the team"
                value={draft.teamSize}
                max={500}
                onChange={(v) => edit((d) => ({ ...d, teamSize: v }))}
              />
            </div>
            <fieldset className="mt-8">
              <FieldLabel as="legend" optional>
                The tools the work runs on
              </FieldLabel>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {TOOLS.map((t) => {
                  const on = draft.tools.includes(t);
                  return (
                    <label key={t} className="cursor-pointer">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggleTool(t)}
                        className="peer sr-only"
                      />
                      <span className="inline-flex h-11 items-center rounded-full border border-line bg-ink-950/60 px-3.5 text-sm text-ink-300 transition-[border-color,background-color,color] duration-200 hover:border-line-strong peer-checked:border-brand/60 peer-checked:bg-brand/10 peer-checked:text-ink-50 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand/80 pointer-fine:h-9">
                        {t}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </Section>

          <Section
            step="02"
            title="Where the hours go"
            hint="For each one, how many people do it, and roughly how many hours each of them spends on it in a normal week. A rough number is fine."
          >
            <ul className="border-t border-line-soft">
              {LEAKS.map((l) => {
                const people = num(draft.leaks[l.key].people, 500, true);
                const over = people > input.teamSize;
                return (
                  <li
                    key={l.key}
                    className="grid grid-cols-2 items-end gap-x-4 gap-y-3 border-b border-line-soft py-5 sm:grid-cols-[minmax(0,1fr)_7rem_7rem] sm:gap-5"
                  >
                    <p className="col-span-2 text-[0.9375rem] leading-snug text-ink-100 sm:col-span-1 sm:pb-3">{l.label}</p>
                    <NumberField
                      label="People"
                      srLabel={`${l.label}: how many people`}
                      value={draft.leaks[l.key].people}
                      max={500}
                      onChange={(v) => setLeak(l.key, "people", v)}
                    />
                    <NumberField
                      label="Hours each"
                      srLabel={`${l.label}: hours each, a week`}
                      value={draft.leaks[l.key].hours}
                      max={40}
                      step={0.5}
                      onChange={(v) => setLeak(l.key, "hours", v)}
                    />
                    {over ? (
                      <p className="col-span-2 text-caption text-ink-400 sm:col-span-3">
                        That is more than your team of {input.teamSize}, so I count {input.teamSize}.
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </Section>

          <Section
            step="03"
            title="What an hour costs"
            hint="Salary plus overheads, divided by the hours people work. If you are not sure, a rough figure is fine."
          >
            <div className="grid gap-6 sm:grid-cols-[auto_12rem] sm:items-end">
              <fieldset>
                <FieldLabel as="legend">Currency</FieldLabel>
                <div className="mt-2 inline-flex rounded-lg border border-line bg-ink-950/60 p-1">
                  {CURRENCY_CODES.map((c) => (
                    <label key={c} className="cursor-pointer">
                      <input
                        type="radio"
                        name="ops-leak-currency"
                        value={c}
                        checked={draft.currency === c}
                        onChange={() => setCurrency(c)}
                        className="peer sr-only"
                      />
                      <span className="inline-flex h-9 min-w-14 items-center justify-center rounded-md px-3 text-sm text-ink-300 transition-[background-color,color] duration-200 hover:text-ink-100 peer-checked:bg-ink-50/[0.09] peer-checked:text-ink-50 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand/80">
                        <span aria-hidden>{c}</span>
                        <span className="sr-only">{CURRENCIES[c].label}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <NumberField
                label={`Cost an hour, ${input.currency}`}
                value={draft.rate}
                max={2000}
                onChange={(v) => edit((d) => ({ ...d, rate: v }))}
              />
            </div>
          </Section>
        </div>

        {/* ---- The answer. Beside the questions from lg, so it moves as
            they are answered; under them on a phone. */}
        <aside aria-labelledby="estimate-title" className="min-w-0 lg:col-span-5">
          <div className="panel-lit rounded-2xl px-6 py-8 sm:p-8 lg:sticky lg:top-28">
            <h2 id="estimate-title" className="text-caption text-ink-400">
              Your estimate, a month
            </h2>
            <p
              aria-live="polite"
              aria-atomic
              className="mt-3 text-statement font-semibold tabular-nums text-ink-50"
            >
              {result.monthlyCost > 0 ? (
                <>
                  {m(result.low)}
                  <span className="text-ink-500"> to </span>
                  {m(result.high)}
                </>
              ) : (
                m(0)
              )}
            </p>
            {result.monthlyCost > 0 ? (
              <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-300">
                {m(result.monthlyCost)} as entered. That is {result.weeklyHours} hours a week, about{" "}
                {workingDays} working {workingDays === 1 ? "day" : "days"} a month.
              </p>
            ) : (
              <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-300">
                Add the hours on the left to see what they cost.
              </p>
            )}
            <p className="mt-4 text-caption text-ink-500">
              An estimate from your own numbers, with a quarter either side, because hours remembered from a
              normal week are rough.
            </p>
            {result.top.length > 0 ? (
              <ol className="mt-6 border-t border-line">
                {result.top.map((r, i) => (
                  <li
                    key={r.key}
                    className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-baseline gap-x-2 border-b border-line-soft py-3 text-[0.9375rem]"
                  >
                    <span className="font-mono text-label-sm text-brand">{i + 1}</span>
                    <span className="text-ink-200">{r.short}</span>
                    <span className="tabular-nums text-ink-100">{m(r.monthlyCost)}</span>
                  </li>
                ))}
              </ol>
            ) : null}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <a href="#breakdown" className={cn("group", buttonClass({ variant: "ghost" }))}>
                See the breakdown <Arrow />
              </a>
            </div>
          </div>
        </aside>
      </div>

      {/* ---- The breakdown, in the audit report's own columns */}
      <section id="breakdown" aria-labelledby="breakdown-title" className="mt-24 scroll-mt-24 md:mt-32">
        <h2 id="breakdown-title" className="text-section font-semibold text-ink-50">
          {result.top.length > 1 ? `Your top ${result.top.length} leaks` : "Your leak"}
        </h2>
        <p className="mt-4 max-w-[60ch] text-ink-400">
          The same columns as the audit report. The difference is the fourth one: here every number is your
          estimate, and in the audit each one is counted from an interview or a recording.
        </p>
        <div className="mt-8 overflow-x-auto rounded-xl border border-line">
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
              {sorted.map((r) => {
                const top = topKeys.has(r.key);
                return (
                  <tr key={r.key} className={top ? undefined : "text-ink-500"}>
                    <td className={cn("border-b border-line-soft px-4 py-3 align-top", top && "text-ink-200")}>
                      {r.short}
                    </td>
                    <td className="border-b border-line-soft px-4 py-3 align-top">{who(r.people)}</td>
                    <td className="border-b border-line-soft px-4 py-3 align-top tabular-nums">{r.weeklyHours}</td>
                    <td className="border-b border-line-soft px-4 py-3 align-top">Your estimate</td>
                    <td className="border-b border-line-soft px-4 py-3 align-top tabular-nums">
                      {m(r.monthlyCost)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colSpan={2} className="px-4 py-3 text-left font-medium text-ink-100">
                  The leak
                </th>
                <td className="px-4 py-3 font-medium tabular-nums text-ink-100">{result.weeklyHours}</td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3 font-medium tabular-nums text-ink-100">{m(result.monthlyCost)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {result.top.length > 0 ? (
          <>
            <h3 className="mt-14 text-reference font-semibold text-ink-50">What the audit would count instead</h3>
            <ol className="mt-6 border-t border-line">
              {result.top.map((r, i) => (
                <li
                  key={r.key}
                  className="grid gap-2 border-b border-line py-6 md:grid-cols-[2.5rem_minmax(0,18rem)_minmax(0,1fr)] md:gap-8"
                >
                  <span className="font-mono text-label-sm text-brand md:pt-1">0{i + 1}</span>
                  <p className="font-semibold text-ink-100">{r.short}</p>
                  <p className="max-w-[58ch] text-ink-400">{r.audit}</p>
                </li>
              ))}
              {input.tools.length > 0 ? (
                <li className="grid gap-2 border-b border-line py-6 md:grid-cols-[2.5rem_minmax(0,18rem)_minmax(0,1fr)] md:gap-8">
                  <span className="font-mono text-label-sm text-ink-500 md:pt-1">+</span>
                  <p className="font-semibold text-ink-100">
                    The {input.tools.length} {input.tools.length === 1 ? "tool" : "tools"} you named
                  </p>
                  <p className="max-w-[58ch] text-ink-400">
                    Lists each one with its seats, its monthly cost and what it is really used for.
                  </p>
                </li>
              ) : null}
            </ol>
          </>
        ) : null}
      </section>

      {/* ---- The two ways on: the PDF, or the real count */}
      <div className="mt-24 grid gap-14 md:mt-32 lg:grid-cols-12 lg:gap-16">
        <section aria-labelledby="pdf-title" className="min-w-0 lg:col-span-6">
          <h2 id="pdf-title" className="text-reference font-semibold text-ink-50">
            Get this as a PDF
          </h2>
          <p className="mt-2 max-w-[52ch] text-ink-400">
            The breakdown on one page, to keep or forward to whoever signs off on tools.
          </p>
          <div className="mt-8">
            <BreakdownForm input={input} />
          </div>
        </section>

        <section
          aria-labelledby="audit-title"
          className="panel-lit relative isolate overflow-hidden rounded-2xl px-6 py-9 sm:p-10 lg:col-span-6"
        >
          <div aria-hidden className="ember-rise pointer-events-none absolute inset-0 -z-10" />
          <h2 id="audit-title" className="max-w-[20ch] text-section font-semibold text-ink-50">
            When you want the real number.
          </h2>
          <p className="mt-4 max-w-[52ch] text-ink-300">
            The Ops Leak Audit swaps these estimates for a count. I talk to the people who do the work, watch
            the costliest workflows run, and price the fix, including when the answer is to keep the tool you
            have.
          </p>
          <p className="mt-4 text-ink-100">$3,500 fixed for one team, with a written report about two weeks after kickoff.</p>
          <div className="mt-8">
            <Link href="/services/ops-leak-audit" className={cn("group", buttonClass({ variant: "ghost" }))}>
              See how the audit works <Arrow />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}

type SendState = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; status?: number };

function BreakdownForm({ input }: { input: CalcInput }) {
  const [state, setState] = useState<SendState>({ kind: "idle" });
  // The anti-bot time trap's clock (src/lib/form-gate.ts): `te` and `ts`.
  const [clock] = useState(() => createFormClock());
  const doneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.kind === "sent") doneRef.current?.focus();
  }, [state.kind]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state.kind === "sending") return;
    setState({ kind: "sending" });
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      company: String(fd.get("company") ?? "") || undefined,
      inputs: input,
      website: String(fd.get("website") ?? ""), // honeypot
      ...clock.fields(),
      source: sourceTag("calculator"),
    };
    try {
      const res = await fetch("/api/ops-leak-calculator", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        console.error("[ops-leak-calculator] send failed", res.status, data.error);
        setState({ kind: "error", status: res.status });
        return;
      }
      track("Ops Leak breakdown sent");
      setState({ kind: "sent" });
    } catch (err) {
      console.error("[ops-leak-calculator] send failed", err);
      setState({ kind: "error" });
    }
  }

  if (state.kind === "sent") {
    return (
      <div ref={doneRef} tabIndex={-1} className="rounded-xl outline-none">
        <FormSuccess flat title="On its way.">
          The PDF should arrive within a few minutes. If it does not, check the spam folder, or email me at
          gravixar@gmail.com.
        </FormSuccess>
      </div>
    );
  }

  const sending = state.kind === "sending";

  // method="post" covers a submit before React hydrates, so nothing typed
  // here lands in a URL (scripts/form-method-selftest.ts).
  return (
    <form method="post" onSubmit={onSubmit} className="space-y-5" aria-busy={sending}>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Your name" name="name" required minLength={2} maxLength={120} autoComplete="name" />
        <TextField
          label="Work email"
          name="email"
          type="email"
          inputMode="email"
          required
          maxLength={160}
          autoComplete="email"
        />
      </div>
      <TextField label="Company" optional name="company" maxLength={160} autoComplete="organization" />
      <div className="hidden" aria-hidden>
        <label>
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {state.kind === "error" ? (
        state.status === 400 ? (
          <FormError>Check the email address and your name, then send again.</FormError>
        ) : (
          <FormError />
        )
      ) : null}
      <Button
        type="submit"
        aria-disabled={sending}
        className={cn("w-full sm:w-auto sm:min-w-[13rem]", sending && "cursor-wait opacity-70")}
      >
        {sending ? "Sending" : "Email me the PDF"}
      </Button>
      <p className="max-w-[56ch] text-caption leading-relaxed text-ink-500">
        I send the PDF to this address and keep your details with the numbers you entered, so I can reply if
        you write back. No newsletter and no list. The{" "}
        <Link href="/privacy" className="link-quiet">
          privacy policy
        </Link>{" "}
        has the rest.
      </p>
    </form>
  );
}
