"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { sourceTag } from "@/lib/source-tag";
import { Button } from "@/components/ui/Button";
import { FormError, FormSuccess, TextArea, TextField } from "@/components/ui/Field";

// The closing form on every /services/[slug] page. It sits under the panel's
// own heading, so it carries no heading of its own: the old "Talk about Ops
// Leak Audit" repeated the h2 above it, dropped the article, and promised a
// 24-hour reply for the third time in one panel.
//
// Built on the shared Field primitives, so inputs are 16px on phones (no iOS
// zoom on focus), 44px tall, and keep the site-wide focus ring. Failures show
// human copy; the machine code goes to the console, never to the visitor.

type FormState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "ok" }
  | { kind: "error"; status?: number };

interface Props {
  /** Page slug travelling into HQ Inbox as `sourcePage`, e.g. "/services/ai-tooling" */
  sourcePage: string;
  /** Display name of the service, used in the confirmation */
  serviceTitle: string;
  /** The one field that needs thought. The start track asks for the scope inputs. */
  messageLabel?: string;
  messagePlaceholder?: string;
  submitLabel?: string;
}

export function ServiceInquiryForm({
  sourcePage,
  serviceTitle,
  messageLabel = "What are you trying to do?",
  messagePlaceholder = "What is broken, what good would look like, your team size and tools, and any deadline.",
  submitLabel = "Send",
}: Props) {
  const [state, setState] = useState<FormState>({ kind: "idle" });
  const doneRef = useRef<HTMLDivElement>(null);

  // The form unmounts on success; move focus to the confirmation so keyboard
  // and screen reader users land on what just happened instead of on <body>.
  useEffect(() => {
    if (state.kind === "ok") doneRef.current?.focus();
  }, [state.kind]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state.kind === "submitting") return;
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
      source: sourceTag("service-page"),
    };

    try {
      const res = await fetch("/api/service-inquiry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        console.error("[service-inquiry] send failed", res.status, data.error);
        setState({ kind: "error", status: res.status });
        return;
      }
      form.reset();
      setState({ kind: "ok" });
    } catch (err) {
      console.error("[service-inquiry] send failed", err);
      setState({ kind: "error" });
    }
  }

  if (state.kind === "ok") {
    return (
      <div ref={doneRef} tabIndex={-1} className="rounded-xl outline-none">
        <FormSuccess flat title="Got it. I will reply within 24 hours.">
          It reaches me tagged with the {serviceTitle} page, so there is nothing
          to explain twice.
        </FormSuccess>
      </div>
    );
  }

  const submitting = state.kind === "submitting";

  return (
    <form onSubmit={onSubmit} className="space-y-5" aria-busy={submitting}>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Your name"
          name="name"
          required
          minLength={2}
          maxLength={120}
          autoComplete="name"
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          inputMode="email"
          required
          maxLength={160}
          autoComplete="email"
        />
      </div>
      <TextField
        label="Company"
        optional
        name="company"
        maxLength={160}
        autoComplete="organization"
      />
      <TextArea
        label={messageLabel}
        name="message"
        required
        minLength={20}
        maxLength={4000}
        rows={5}
        placeholder={messagePlaceholder}
        hint="A couple of sentences is plenty."
      />
      {/* honeypot, visually hidden, must stay empty */}
      <div className="hidden" aria-hidden>
        <label>
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {state.kind === "error" ? (
        state.status === 400 ? (
          <FormError>
            Something in the form did not go through. Check the email address
            and that the message is at least a sentence, then send again.
          </FormError>
        ) : (
          <FormError />
        )
      ) : null}
      {/* aria-disabled rather than disabled: a disabled button drops focus to
          <body> mid-submit, so a keyboard user would lose their place when an
          error comes back. onSubmit ignores repeat presses instead. */}
      <Button
        type="submit"
        aria-disabled={submitting}
        className={cn("w-full sm:w-auto sm:min-w-[11rem]", submitting && "cursor-wait opacity-70")}
      >
        {submitting ? "Sending" : submitLabel}
      </Button>
    </form>
  );
}
