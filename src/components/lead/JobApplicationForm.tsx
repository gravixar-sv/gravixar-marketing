"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

type FormState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "ok" }
  | { kind: "error"; message: string };

interface Props {
  /** Page slug travelling into HQ Inbox as `sourcePage`, e.g. "/careers/founding-engineer" */
  sourcePage: string;
  /** Display name of the role, drives the form heading + confirmation copy */
  roleTitle: string;
}

export function JobApplicationForm({ sourcePage, roleTitle }: Props) {
  const [state, setState] = useState<FormState>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({ kind: "submitting" });

    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      company: String(fd.get("company") ?? "") || undefined,
      link: String(fd.get("link") ?? "") || undefined,
      message: String(fd.get("message") ?? ""),
      sourcePage,
      website: String(fd.get("website") ?? ""), // honeypot
      source: "careers",
    };

    try {
      const res = await fetch("/api/job-application", {
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
        <p className="font-mono text-xs uppercase tracking-widest text-brand">
          received
        </p>
        <h3 className="mt-2 text-xl font-semibold tracking-tight">
          Thanks for applying for {roleTitle}. I read every application myself
          and reply if it is a fit.
        </h3>
        <p className="mt-2 text-sm text-zinc-400">
          If you have more to share, you can also email me directly at{" "}
          <a
            href="mailto:gravixar@gmail.com"
            className="text-brand-soft underline underline-offset-4 hover:text-brand"
          >
            gravixar@gmail.com
          </a>
          .
        </p>
      </div>
    );
  }

  const submitting = state.kind === "submitting";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold tracking-tight">
          Apply for {roleTitle}
        </h3>
        <p className="mt-1 text-sm text-zinc-400">
          Quick form, lands in my inbox and HQ at the same time. I read every
          one myself.
        </p>
      </div>
      <Field label="Your name" name="name" required minLength={2} />
      <Field label="Email" name="email" type="email" required />
      <Field label="Current company (optional)" name="company" />
      <Field
        label="CV / portfolio / LinkedIn (optional)"
        name="link"
        type="url"
        placeholder="https://"
      />
      <Textarea
        label="Why this role?"
        name="message"
        required
        minLength={20}
        rows={5}
        placeholder="A few sentences on why this fits and what you would bring. Links to things you have built are worth more than a polished pitch."
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
        className={cn(
          "rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-black transition-colors",
          submitting ? "cursor-wait opacity-70" : "hover:bg-brand-soft",
        )}
      >
        {submitting ? "Sending…" : "Send application"}
      </button>
      {state.kind === "error" ? (
        <p className="text-sm text-red-400">
          Something failed: {state.message}. Try again, or email me directly at
          gravixar@gmail.com.
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
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-400">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        className="mt-2 block w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-brand"
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
      <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-400">
        {label}
      </span>
      <textarea
        name={name}
        required={required}
        minLength={minLength}
        rows={rows}
        placeholder={placeholder}
        className="mt-2 block w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-brand"
      />
    </label>
  );
}
