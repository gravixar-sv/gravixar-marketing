"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import {
  FieldLabel,
  FieldHint,
  FormError,
  SelectField,
  TextArea,
  TextField,
  controlClass,
} from "@/components/ui/Field";
import { FocusOnMount } from "@/components/conversion/FocusOnMount";
import { FlatSuccess } from "@/components/conversion/FlatSuccess";
import {
  CV_ACCEPT,
  CV_CONTENT_TYPES,
  CV_MAX_BYTES,
  NAME_RE,
  PHONE_RE,
  normalizeLink,
} from "@/lib/job-application";
import type { ScreeningQuestion } from "@/lib/careers";

// Map the API's machine error codes to something a human wants to read. An
// unknown code is never shown (it used to reach applicants as "Something
// failed (500)."); it goes to the console and the applicant gets a sentence.
function friendlyError(code: string | undefined, status: number): string {
  if (code === "invalid")
    return "Some details look off. Please check the form and try again.";
  if (code === "cv_type") return "Your CV must be a PDF or Word file.";
  if (code === "cv_too_large")
    return "Your CV is over 4 MB. Please upload a smaller file.";
  if (code === "invalid_form" || code === "invalid_json")
    return "Something went wrong sending the form. Please try again.";
  console.warn("[careers] application did not send:", code ?? status);
  return "That didn't send. Please try again.";
}

// `mailFallback` is for failures to SEND (offer the email route); a
// validation message about the applicant's own input does not need it.
type FormState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "ok" }
  | { kind: "error"; message: string; mailFallback?: boolean };

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
  // Flexible links: the applicant can add as many as they like (LinkedIn,
  // portfolio, online CV, GitHub, socials). Forgiving: no scheme required.
  const [links, setLinks] = useState<string[]>([""]);
  const setLinkAt = (i: number, v: string) =>
    setLinks((prev) => prev.map((l, j) => (j === i ? v : l)));
  const addLink = () => setLinks((prev) => [...prev, ""]);
  const removeLink = (i: number) =>
    setLinks((prev) => prev.filter((_, j) => j !== i));

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

    // Validate the CV (type/size) before submitting for fast feedback; the route
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

    // Normalize links (forgiving: prepend https:// when missing); drop blanks.
    const normalizedLinks = links.map(normalizeLink).filter(Boolean);

    setState({ kind: "submitting" });

    // multipart/form-data so the CV rides along; the route uploads it to a
    // private blob server-side (no browser client-upload handshake).
    const body = new FormData();
    body.set("name", name);
    body.set("email", String(fd.get("email") ?? "").trim());
    body.set("phone", phone);
    body.set("company", String(fd.get("company") ?? "").trim());
    body.set("link", normalizedLinks.join("\n"));
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
        mailFallback: true,
        // A network failure surfaces as the browser's own "Failed to fetch";
        // only messages friendlyError wrote are shown as they are.
        message:
          err instanceof Error && !(err instanceof TypeError)
            ? err.message
            : "That didn't send. Please try again.",
      });
    }
  }

  if (state.kind === "ok") {
    return (
      <FocusOnMount>
        {/* Flat, not FormSuccess: this form already sits in a lit panel. */}
        <FlatSuccess title={`Thanks for applying for ${roleTitle}.`}>
          I reply if it is a fit. If you have more to share, email me at{" "}
          <a href="mailto:gravixar@gmail.com" className="link-quiet">
            gravixar@gmail.com
          </a>
          .
        </FlatSuccess>
      </FocusOnMount>
    );
  }

  const submitting = state.kind === "submitting";

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField
          label="Your name"
          name="name"
          required
          minLength={2}
          maxLength={80}
          pattern="[^0-9<>]{2,80}"
          title="Your name, letters only"
          autoComplete="name"
        />
        <TextField label="Email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField
          label="Phone"
          name="phone"
          type="tel"
          required
          inputMode="tel"
          placeholder="+92 3xx xxxxxxx"
          autoComplete="tel"
        />
        <TextField
          label="Current company"
          optional
          name="company"
          maxLength={160}
          autoComplete="organization"
        />
      </div>
      <fieldset>
        <FieldLabel as="legend" optional>
          Links
        </FieldLabel>
        <FieldHint>LinkedIn, portfolio, online CV, GitHub, socials. Paste any, no https:// needed.</FieldHint>
        <div className="mt-2.5 space-y-2">
          {links.map((val, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                inputMode="url"
                value={val}
                onChange={(e) => setLinkAt(i, e.target.value)}
                placeholder="linkedin.com/in/you"
                autoComplete="off"
                aria-label={`Link ${i + 1}`}
                className={cn(controlClass, "h-11")}
              />
              {links.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeLink(i)}
                  aria-label={`Remove link ${i + 1}`}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line text-ink-400 transition-colors hover:border-line-strong hover:text-ink-100"
                >
                  <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="m3 3 6 6M9 3 3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              ) : null}
            </div>
          ))}
        </div>
        {links.length < 6 ? (
          <button
            type="button"
            onClick={addLink}
            className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm text-ink-300 transition-colors hover:text-ink-50"
          >
            <span aria-hidden className="text-ink-500">
              +
            </span>{" "}
            Add another link
          </button>
        ) : null}
      </fieldset>
      <label className="block">
        <FieldLabel optional>CV</FieldLabel>
        <input
          name="cv"
          type="file"
          accept={CV_ACCEPT}
          className={cn(
            controlClass,
            "mt-2 h-auto cursor-pointer py-2 text-sm text-ink-300 md:text-sm file:mr-3 file:h-8 file:cursor-pointer file:rounded-md file:border-0 file:bg-ink-800 file:px-3 file:text-[0.8125rem] file:font-medium file:text-ink-100 hover:file:bg-ink-700",
          )}
        />
        <FieldHint>PDF or Word, up to 4 MB.</FieldHint>
      </label>
      {screeningQuestions.map((q) => {
        const name = `sq_${q.id}`;
        if (q.type === "textarea") {
          return (
            <TextArea key={q.id} label={q.label} optional={!q.required} name={name} required={q.required} rows={3} />
          );
        }
        if (q.type === "yesno" || q.type === "select") {
          const options = q.type === "yesno" ? ["Yes", "No"] : (q.options ?? []);
          return (
            <SelectField
              key={q.id}
              label={q.label}
              optional={!q.required}
              name={name}
              required={q.required}
              defaultValue=""
            >
              <option value="" disabled={q.required}>
                Pick one
              </option>
              {options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </SelectField>
          );
        }
        return <TextField key={q.id} label={q.label} optional={!q.required} name={name} required={q.required} />;
      })}
      <TextArea
        label="Why this role?"
        name="message"
        required
        minLength={20}
        rows={5}
        hint="A few sentences on why this fits and what you would bring. Links to things you have built are worth more than a polished pitch."
      />
      {/* honeypot, visually hidden, must stay empty */}
      <div className="hidden" aria-hidden>
        <label>
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {state.kind === "error" ? (
        <FormError>
          {state.message}
          {state.mailFallback ? (
            <>
              {" "}
              If it keeps failing, email me at{" "}
              <a href="mailto:gravixar@gmail.com" className="link-quiet">
                gravixar@gmail.com
              </a>
              .
            </>
          ) : null}
        </FormError>
      ) : null}
      <Button type="submit" disabled={submitting} className={cn("w-full sm:w-auto", submitting && "cursor-wait")}>
        {submitting ? "Sending…" : "Send application"}
      </Button>
    </form>
  );
}
