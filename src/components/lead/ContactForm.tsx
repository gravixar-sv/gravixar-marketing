"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { SERVICE_OPTIONS } from "@/lib/services";
import { TOOL_OPTIONS } from "@/lib/lead";
import { TEAM_SIZE_LABELS, teamSizeOptions } from "@/lib/early-access";
import { buttonClass } from "@/components/ui/Button";

type FormState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "ok" }
  | { kind: "error"; message: string };

export function ContactForm() {
  const [state, setState] = useState<FormState>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({ kind: "submitting" });

    const form = e.currentTarget;
    const fd = new FormData(form);
    const tools = fd.getAll("tools").map(String).filter(Boolean);
    const payload = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      company: String(fd.get("company") ?? "") || undefined,
      service: String(fd.get("service") ?? "") || undefined,
      teamSize: String(fd.get("teamSize") ?? "") || undefined,
      tools: tools.length > 0 ? tools : undefined,
      message: String(fd.get("message") ?? ""),
      website: String(fd.get("website") ?? ""), // honeypot
      source: "contact-page",
    };

    try {
      const res = await fetch("/api/lead", {
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
      <div className="rounded-lg border border-brand-deep/30 bg-brand-deep/5 p-6">
        <p className="font-mono text-eyebrow uppercase text-brand">
          received
        </p>
        <h3 className="mt-2 text-xl font-semibold tracking-tight">
          Got it. I&apos;ll reply within 24 hours.
        </h3>
        <p className="mt-2 text-sm text-zinc-400">
          If you&apos;d rather skip the email and just book the call,
          the slots are right next to this form.
        </p>
      </div>
    );
  }

  const submitting = state.kind === "submitting";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Your name" name="name" required minLength={2} />
      <Field label="Email" name="email" type="email" required />
      <Field label="Company (optional)" name="company" />
      <label className="block">
        <span className="font-mono text-label uppercase text-zinc-400">
          What do you need? (optional)
        </span>
        <select
          name="service"
          defaultValue=""
          className="mt-2 block w-full rounded-md border border-line bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-brand"
        >
          <option value="">Pick the closest match</option>
          {SERVICE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      {/* Optional qualifiers. Deliberately non-gating: no required flags, no
          extra step. They pre-arm the reply and the call, nothing more. */}
      <label className="block">
        <span className="font-mono text-label uppercase text-zinc-400">
          Team size (optional)
        </span>
        <select
          name="teamSize"
          defaultValue=""
          className="mt-2 block w-full rounded-md border border-line bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-brand"
        >
          <option value="">Prefer not to say</option>
          {teamSizeOptions.map((t) => (
            <option key={t} value={t}>
              {TEAM_SIZE_LABELS[t]}
            </option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend className="font-mono text-label uppercase text-zinc-400">
          What are you running on today? (optional)
        </legend>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {TOOL_OPTIONS.map((t) => (
            <label key={t} className="cursor-pointer">
              <input type="checkbox" name="tools" value={t} className="peer sr-only" />
              <span className="inline-block rounded-md border border-line bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-400 transition-colors peer-checked:border-brand peer-checked:bg-brand/10 peer-checked:text-brand-soft peer-focus-visible:border-brand hover:border-zinc-600">
                {t}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Textarea
        label="What's the problem you're solving?"
        name="message"
        required
        minLength={20}
        rows={6}
        placeholder="The more concrete the better, what's broken, what you've tried, what 'good' looks like."
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
        {submitting ? "Sending…" : "Send"}
      </button>
      {state.kind === "error" ? (
        <p className="text-sm text-red-400">
          Something failed: {state.message}. Try again, or email me directly at gravixar@gmail.com.
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
  minLength,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  minLength?: number;
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
        minLength={minLength}
        className="mt-2 block w-full rounded-md border border-line bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-brand"
      />
    </label>
  );
}

function Textarea({
  label,
  name,
  required,
  minLength,
  rows = 5,
  placeholder,
}: {
  label: string;
  name: string;
  required?: boolean;
  minLength?: number;
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
        required={required}
        minLength={minLength}
        rows={rows}
        placeholder={placeholder}
        className="mt-2 block w-full rounded-md border border-line bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-brand"
      />
    </label>
  );
}
