"use client";

// Early-access waitlist form. Structured fields give Qamar enough triage
// signal (interest, team size, timeline) without making the form long.
// Free-text `need` is optional — for visitors who want to add context
// the dropdowns don't capture.
//
// Adaptive questions powered by AI (GenAI follow-ups based on their
// interest selection) is a follow-up, not in this iteration. The static
// dropdowns cover the same triage need at zero LLM cost.

import { useState } from "react";
import { cn } from "@/lib/cn";
import { buttonClass } from "@/components/ui/Button";
import {
  interestOptions,
  teamSizeOptions,
  timelineOptions,
  INTEREST_LABELS,
  TEAM_SIZE_LABELS,
  TIMELINE_LABELS,
} from "@/lib/early-access";

type FormState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "ok" }
  | { kind: "error"; message: string };

export function EarlyAccessForm() {
  const [state, setState] = useState<FormState>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({ kind: "submitting" });

    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      email: String(fd.get("email") ?? ""),
      name: String(fd.get("name") ?? "") || undefined,
      interest: String(fd.get("interest") ?? "") || undefined,
      teamSize: String(fd.get("teamSize") ?? "") || undefined,
      timeline: String(fd.get("timeline") ?? "") || undefined,
      need: String(fd.get("need") ?? "") || undefined,
      source: "early-access-page",
      website: String(fd.get("website") ?? ""), // honeypot
    };

    try {
      const res = await fetch("/api/early-access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `request_failed_${res.status}`);
      }
      form.reset();
      setState({ kind: "ok" });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "unknown_error",
      });
    }
  }

  if (state.kind === "ok") {
    return (
      <div className="rounded-xl border border-brand-deep/30 bg-brand-deep/5 p-6">
        <p className="font-mono text-label uppercase text-brand">
          on the list
        </p>
        <h3 className="mt-2 text-xl font-semibold tracking-[-0.01em]">
          Got you. I&apos;ll email when there is something you can actually run.
        </h3>
        <p className="mt-2 text-sm text-zinc-400">
          No drip sequence, no marketing list. One email when there&apos;s
          something for you to try, that&apos;s it.
        </p>
      </div>
    );
  }

  const submitting = state.kind === "submitting";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field
        label="Email"
        name="email"
        type="email"
        required
        placeholder="you@example.com"
      />
      <Field
        label="Name (optional)"
        name="name"
        placeholder="What should I call you?"
      />
      <Select
        label="What are you looking for?"
        name="interest"
        placeholder="Pick the closest match"
        options={interestOptions.map((v) => ({
          value: v,
          label: INTEREST_LABELS[v],
        }))}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Team size"
          name="teamSize"
          placeholder="—"
          options={teamSizeOptions.map((v) => ({
            value: v,
            label: TEAM_SIZE_LABELS[v],
          }))}
        />
        <Select
          label="Timeline"
          name="timeline"
          placeholder="—"
          options={timelineOptions.map((v) => ({
            value: v,
            label: TIMELINE_LABELS[v],
          }))}
        />
      </div>
      <Textarea
        label="Anything else? (optional)"
        name="need"
        rows={3}
        placeholder="Specific use case, current stack, what 'good' looks like for you."
      />
      {/* honeypot, visually hidden, must stay empty */}
      <div className="hidden" aria-hidden>
        <label>
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className={cn(buttonClass(), submitting && "cursor-wait")}
      >
        {submitting ? "Adding…" : "Get early access"}
      </button>
      {state.kind === "error" ? (
        <p className="text-sm text-red-400">
          Something failed: {state.message}. Try again, or email me at gravixar@gmail.com.
        </p>
      ) : null}
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="font-mono text-label uppercase text-zinc-400">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-2 block w-full rounded-md border border-line bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-brand"
      />
    </label>
  );
}

function Select({
  label,
  name,
  placeholder,
  options,
}: {
  label: string;
  name: string;
  placeholder?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="font-mono text-label uppercase text-zinc-400">
        {label}
      </span>
      <select
        name={name}
        defaultValue=""
        className="mt-2 block w-full rounded-md border border-line bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-brand"
      >
        <option value="" disabled>
          {placeholder ?? "Select…"}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Textarea({
  label,
  name,
  rows = 3,
  placeholder,
}: {
  label: string;
  name: string;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="font-mono text-label uppercase text-zinc-400">
        {label}
      </span>
      <textarea
        name={name}
        rows={rows}
        placeholder={placeholder}
        className="mt-2 block w-full rounded-md border border-line bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-brand"
      />
    </label>
  );
}
