"use client";

// Early-access waitlist form. Email is the only must. Interest is the one
// triage signal Qamar reads first, so it stays visible; team size, timeline
// and a free-text line sit behind "Add context", because a list that promises
// one email should not open with a six-field form. Everything inside the
// disclosure still submits whether or not it was opened.
//
// Adaptive questions powered by AI (GenAI follow-ups based on their
// interest selection) is a follow-up, not in this iteration. The static
// dropdowns cover the same triage need at zero LLM cost.
//
// Payload keys, the honeypot and the source tag are the contract with
// /api/early-access and HQ; do not rename them.

import Link from "next/link";
import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { sourceTag } from "@/lib/source-tag";
import { Button } from "@/components/ui/Button";
import { FormError, FormSuccess, SelectField, TextArea, TextField } from "@/components/ui/Field";
import { Disclosure } from "@/components/conversion/Disclosure";
import { FocusOnMount } from "@/components/conversion/FocusOnMount";
import {
  interestOptions,
  teamSizeOptions,
  timelineOptions,
  INTEREST_LABELS,
  TEAM_SIZE_LABELS,
  TIMELINE_LABELS,
} from "@/lib/early-access";

// Two of the interests are things I sell today, through /contact. Picking one
// here used to put a buyer on a list that promises one email "when there is
// something you can use", which is a wait for something already on offer. The
// options and their stored values stay (HQ triages on them); the form now says
// so and points at the booking panel instead.
const AVAILABLE_NOW: ReadonlySet<string> = new Set(["ops-consulting", "brand-visuals"]);

type FormState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "ok" }
  | { kind: "error" };

export function EarlyAccessForm() {
  const [state, setState] = useState<FormState>({ kind: "idle" });
  const [interest, setInterest] = useState("");
  const nowId = useId();
  const availableNow = AVAILABLE_NOW.has(interest);

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
      source: sourceTag("early-access-page"),
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
      setInterest("");
      setState({ kind: "ok" });
    } catch (err) {
      // The code is for the logs. The visitor gets a sentence (FormError).
      console.warn("[early-access] signup did not send:", err instanceof Error ? err.message : err);
      setState({ kind: "error" });
    }
  }

  if (state.kind === "ok") {
    return (
      <FocusOnMount>
        <FormSuccess title="You're on the list.">
          I&apos;ll email once, when there is something you can use.
        </FormSuccess>
      </FocusOnMount>
    );
  }

  const submitting = state.kind === "submitting";

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
        />
        <TextField label="Name" optional name="name" autoComplete="name" placeholder="What should I call you?" />
      </div>
      {/* No disabled placeholder option: an optional choice must be
          clearable, and a disabled "" option made the first pick permanent. */}
      <div>
        <SelectField
          label="What are you looking for?"
          optional
          name="interest"
          defaultValue=""
          onChange={(e) => setInterest(e.target.value)}
          aria-describedby={availableNow ? nowId : undefined}
        >
          <option value="">Pick the closest match</option>
          {interestOptions.map((v) => (
            <option key={v} value={v}>
              {INTEREST_LABELS[v]}
            </option>
          ))}
        </SelectField>
        {/* A live region that is always mounted, so the line is announced
            when it appears and not only when the select is next focused. */}
        <div aria-live="polite">
          {availableNow ? (
            <p id={nowId} className="fade-up mt-2 text-caption text-ink-300">
              That is available now.{" "}
              <Link href="/contact#book" className="link-quiet">
                Book a call instead
              </Link>
              .
            </p>
          ) : null}
        </div>
      </div>
      <Disclosure summary="Add context">
        <div className="grid gap-6 sm:grid-cols-2">
          <SelectField label="Team size" optional name="teamSize" defaultValue="">
            <option value="">Prefer not to say</option>
            {teamSizeOptions.map((v) => (
              <option key={v} value={v}>
                {TEAM_SIZE_LABELS[v]}
              </option>
            ))}
          </SelectField>
          <SelectField label="Timeline" optional name="timeline" defaultValue="">
            <option value="">Pick one</option>
            {timelineOptions.map((v) => (
              <option key={v} value={v}>
                {TIMELINE_LABELS[v]}
              </option>
            ))}
          </SelectField>
        </div>
        <TextArea
          label="Anything else?"
          optional
          name="need"
          rows={3}
          hint="What you would use it for, what you run today, what good would look like."
        />
      </Disclosure>
      {/* honeypot, visually hidden, must stay empty */}
      <div className="hidden" aria-hidden>
        <label>
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {state.kind === "error" ? <FormError /> : null}
      {/* "Join the list", not "Get early access": the page's own headline
          says there is nothing to access yet, and joining a list is what the
          button actually does. */}
      <Button type="submit" disabled={submitting} className={cn("w-full sm:w-auto", submitting && "cursor-wait")}>
        {submitting ? "Adding…" : "Join the list"}
      </Button>
    </form>
  );
}
