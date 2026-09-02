"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { buttonClass } from "@/components/ui/Button";

type FormState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "ok" }
  | { kind: "error"; message: string };

interface Props {
  /** Page slug travelling into HQ Inbox as `sourcePage`, e.g. "/services/ai-tooling" */
  sourcePage: string;
  /** Display name of the service — drives the form heading + email body */
  serviceTitle: string;
}

export function ServiceInquiryForm({ sourcePage, serviceTitle }: Props) {
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
      message: String(fd.get("message") ?? ""),
      sourcePage,
      website: String(fd.get("website") ?? ""), // honeypot
      source: "service-page",
    };

    try {
      const res = await fetch("/api/service-inquiry", {
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
          Got it. I&apos;ll reply within 24 hours about {serviceTitle}.
        </h3>
        <p className="mt-2 text-sm text-zinc-400">
          If you&apos;d rather chat than email, you can also{" "}
          <a
            href="/contact"
            className="text-brand-soft underline underline-offset-4 hover:text-brand"
          >
            book a 30-minute call
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
          Talk about {serviceTitle}
        </h3>
        <p className="mt-1 text-sm text-zinc-400">
          Quick form, lands in my inbox and HQ at the same time. I reply within
          24 hours.
        </p>
      </div>
      <Field label="Your name" name="name" required minLength={2} />
      <Field label="Email" name="email" type="email" required />
      <Field label="Company (optional)" name="company" />
      <Textarea
        label="What are you trying to do?"
        name="message"
        required
        minLength={20}
        rows={5}
        placeholder="Concrete is better than vague. What's broken now, what would good look like, what's the rough size or timeline."
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
