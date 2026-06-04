"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import {
  CV_ACCEPT,
  CV_CONTENT_TYPES,
  CV_MAX_BYTES,
  NAME_RE,
  PHONE_RE,
} from "@/lib/job-application";
import type { ScreeningQuestion } from "@/lib/careers";

// Map the API's machine error codes to something a human wants to read.
function friendlyError(code: string | undefined, status: number): string {
  if (code === "invalid")
    return "Some details look off. Please check the form and try again.";
  if (code === "cv_type") return "Your CV must be a PDF or Word file.";
  if (code === "cv_too_large")
    return "Your CV is over 4 MB. Please upload a smaller file.";
  if (code === "invalid_form" || code === "invalid_json")
    return "Something went wrong sending the form. Please try again.";
  return `Something failed (${code ?? status}).`;
}

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
  /** Role-specific screening questions, set in HQ. Rendered dynamically. */
  screeningQuestions?: ScreeningQuestion[];
}

export function JobApplicationForm({
  sourcePage,
  roleTitle,
  screeningQuestions = [],
}: Props) {
  const [state, setState] = useState<FormState>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = String(fd.get("name") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();

    // Mirror the server rules client-side for instant, friendly feedback.
    // The server (zod) is still the authority.
    if (!NAME_RE.test(name)) {
      setState({
        kind: "error",
        message: "Please enter your name using letters only (no numbers).",
      });
      return;
    }
    if (!PHONE_RE.test(phone)) {
      setState({ kind: "error", message: "Please enter a valid phone number." });
      return;
    }

    // Screening answers (role-specific). Required ones must be answered.
    const screeningAnswers = screeningQuestions.map((q) => ({
      questionId: q.id,
      label: q.label,
      value: String(fd.get(`sq_${q.id}`) ?? "").trim(),
    }));
    const missing = screeningQuestions.find(
      (q) =>
        q.required && !screeningAnswers.find((a) => a.questionId === q.id)?.value,
    );
    if (missing) {
      setState({ kind: "error", message: `Please answer: ${missing.label}` });
      return;
    }

    // Validate the CV (type/size) before submitting — fast feedback; the route
    // re-checks. The file itself rides in the multipart body below.
    const cvFile = fd.get("cv");
    if (cvFile instanceof File && cvFile.size > 0) {
      if (!(CV_CONTENT_TYPES as readonly string[]).includes(cvFile.type)) {
        setState({ kind: "error", message: "Your CV must be a PDF or Word file." });
        return;
      }
      if (cvFile.size > CV_MAX_BYTES) {
        setState({
          kind: "error",
          message: "Your CV is over 4 MB. Please upload a smaller file.",
        });
        return;
      }
    }

    setState({ kind: "submitting" });

    // multipart/form-data so the CV rides along; the route uploads it to a
    // private blob server-side (no browser client-upload handshake).
    const body = new FormData();
    body.set("name", name);
    body.set("email", String(fd.get("email") ?? "").trim());
    body.set("phone", phone);
    body.set("company", String(fd.get("company") ?? "").trim());
    body.set("link", String(fd.get("link") ?? "").trim());
    body.set("message", String(fd.get("message") ?? "").trim());
    body.set("sourcePage", sourcePage);
    body.set("source", "careers");
    body.set("website", String(fd.get("website") ?? "")); // honeypot
    if (screeningAnswers.length > 0) {
      body.set("screeningAnswers", JSON.stringify(screeningAnswers));
    }
    if (cvFile instanceof File && cvFile.size > 0) {
      body.set("cv", cvFile, cvFile.name);
    }

    try {
      const res = await fetch("/api/job-application", {
        method: "POST",
        body,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(friendlyError(data.error, res.status));
      }
      form.reset();
      setState({ kind: "ok" });
    } catch (err) {
      setState({
        kind: "error",
        message:
          err instanceof Error ? err.message : "Something failed. Please try again.",
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
      <Field
        label="Your name"
        name="name"
        required
        minLength={2}
        maxLength={80}
        pattern="[^0-9<>]{2,80}"
        title="Your name, letters only"
        autoComplete="name"
      />
      <Field
        label="Email"
        name="email"
        type="email"
        required
        autoComplete="email"
      />
      <Field
        label="Phone"
        name="phone"
        type="tel"
        required
        inputMode="tel"
        placeholder="+92 3xx xxxxxxx"
        autoComplete="tel"
      />
      <Field
        label="Current company (optional)"
        name="company"
        maxLength={160}
        autoComplete="organization"
      />
      <Field
        label="LinkedIn or portfolio URL (optional)"
        name="link"
        type="url"
        placeholder="https://linkedin.com/in/…"
        autoComplete="url"
      />
      <FileField
        label="CV — PDF or Word, optional (max 4 MB)"
        name="cv"
        accept={CV_ACCEPT}
      />
      {screeningQuestions.map((q) => {
        const cls =
          "mt-2 block w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-brand";
        const name = `sq_${q.id}`;
        return (
          <label key={q.id} className="block">
            <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-400">
              {q.label}
              {q.required ? " *" : ""}
            </span>
            {q.type === "textarea" ? (
              <textarea name={name} required={q.required} rows={3} className={cls} />
            ) : q.type === "yesno" ? (
              <select name={name} required={q.required} defaultValue="" className={cls}>
                <option value="" disabled={q.required}>
                  Select…
                </option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            ) : q.type === "select" ? (
              <select name={name} required={q.required} defaultValue="" className={cls}>
                <option value="" disabled={q.required}>
                  Select…
                </option>
                {(q.options ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input name={name} type="text" required={q.required} className={cls} />
            )}
          </label>
        );
      })}
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
          {state.message} If it keeps failing, email me directly at{" "}
          <a
            href="mailto:gravixar@gmail.com"
            className="underline underline-offset-4"
          >
            gravixar@gmail.com
          </a>
          .
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
  maxLength,
  pattern,
  title,
  inputMode,
  autoComplete,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  title?: string;
  inputMode?: "text" | "tel" | "email" | "url" | "numeric";
  autoComplete?: string;
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
        maxLength={maxLength}
        pattern={pattern}
        title={title}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="mt-2 block w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-brand"
      />
    </label>
  );
}

function FileField({
  label,
  name,
  accept,
}: {
  label: string;
  name: string;
  accept?: string;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-400">
        {label}
      </span>
      <input
        name={name}
        type="file"
        accept={accept}
        className="mt-2 block w-full cursor-pointer rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300 outline-none transition-colors file:mr-3 file:rounded file:border-0 file:bg-zinc-800 file:px-3 file:py-1 file:text-xs file:font-medium file:text-zinc-100 hover:file:bg-zinc-700 focus:border-brand"
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
