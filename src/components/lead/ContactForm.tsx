"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { sourceTag } from "@/lib/source-tag";
import { SERVICE_LABELS, SERVICE_OPTIONS } from "@/lib/services";
import { TOOL_OPTIONS } from "@/lib/lead";
import { TEAM_SIZE_LABELS, teamSizeOptions } from "@/lib/early-access";
import { Button } from "@/components/ui/Button";
import {
  ChipGroup,
  FormError,
  FormSuccess,
  SelectField,
  TextArea,
  TextField,
} from "@/components/ui/Field";
import { Disclosure } from "@/components/conversion/Disclosure";
import { FocusOnMount } from "@/components/conversion/FocusOnMount";

// The note form on /contact. Payload keys, the honeypot, the source tag and
// the field limits are the contract with /api/lead and HQ triage; only the
// presentation changed. Team size and tools are non-gating qualifiers that
// pre-arm the reply, so they sit behind "Add details" instead of in front of
// the one field that matters, the message.

type FormState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "ok" }
  | { kind: "error" };

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
      source: sourceTag("contact-page"),
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
      // The code is for the logs. The visitor gets a sentence (FormError).
      console.warn("[contact] note did not send:", err instanceof Error ? err.message : err);
      setState({ kind: "error" });
    }
  }

  if (state.kind === "ok") {
    return (
      <FocusOnMount>
        <FormSuccess title="Got it. I'll reply within 24 hours.">
          Rather talk sooner? Pick a time from the calendar on this page.
        </FormSuccess>
      </FocusOnMount>
    );
  }

  const submitting = state.kind === "submitting";

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
        <TextField label="Your name" name="name" required minLength={2} autoComplete="name" />
        <TextField label="Email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
        <TextField label="Company" optional name="company" autoComplete="organization" />
        <SelectField label="What do you need?" optional name="service" defaultValue="">
          <option value="">Pick the closest match</option>
          {SERVICE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {SERVICE_LABELS[s]}
            </option>
          ))}
        </SelectField>
      </div>
      <TextArea
        label="What do you want fixed or built?"
        name="message"
        required
        minLength={20}
        rows={6}
        hint="What's broken, what you've tried, what good would look like."
        placeholder="For example: client approvals live in three email threads and nobody knows which version was signed off."
      />
      <Disclosure summary="Add details">
        <SelectField label="Team size" optional name="teamSize" defaultValue="">
          <option value="">Prefer not to say</option>
          {teamSizeOptions.map((t) => (
            <option key={t} value={t}>
              {TEAM_SIZE_LABELS[t]}
            </option>
          ))}
        </SelectField>
        <ChipGroup legend="What are you running on today?" optional name="tools" options={TOOL_OPTIONS} />
      </Disclosure>
      {/* honeypot, visually hidden, must stay empty */}
      <div className="hidden" aria-hidden>
        <label>
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {state.kind === "error" ? <FormError /> : null}
      {/* Primary on phones, ghost from md up. From md this sits beside the
          booking panel, whose "Email me the code" is the page's one coral
          action, so it steps back. Below md the two forms are stacked, the
          booking panel shows no coral until a time is picked, and someone who
          scrolled past the picker to write a note is making the page's
          decision here, so it takes the coral. One element, one variant: the
          ghost set is layered on at md (md:hover sorts after hover, so it
          wins there). */}
      <Button
        type="submit"
        disabled={submitting}
        className={cn(
          "w-full sm:w-auto",
          "md:border md:border-line-strong md:bg-ink-50/[0.02] md:text-ink-100 md:shadow-none md:hover:border-ink-400/60 md:hover:bg-ink-50/[0.06] md:hover:shadow-none md:active:bg-ink-50/[0.08]",
          submitting && "cursor-wait",
        )}
      >
        {submitting ? "Sending…" : "Send the note"}
      </Button>
    </form>
  );
}
