"use client";

// In-house "book a 30-min call", replacing the cal.com popup.
// Slots first, verification second. The grid is the first thing this form
// shows, because availability is what a visitor is actually deciding on;
// the old order asked for name, email and an emailed code before showing a
// single time, which put the flow's heaviest step in front of the question
// "is there even a slot I can make".
// Step 1: pick a slot; the details fields arrive with the pick. Then get
//         emailed a verification code.
// Step 2: enter the code, then confirm. If the slot was taken or aged out of
//         the 24h lead window in the meantime, the grid refreshes and
//         reappears on this step for a repick; the emailed code stays valid,
//         so nobody re-verifies for a collision.
// Step 3: booked. Meet link shown + calendar invite emailed.
// Slots render in the visitor's own timezone, grouped by day (a flat wall of
// 27 identical "Thu 24 Sept, 17:00" buttons read as a spreadsheet), and the
// timezone is named the way a person says it ("Pacific Time"), with the IANA
// ID kept to a title attribute. Picking a slot holds
// nothing until confirm, and the copy makes no claim otherwise.
//
// A picked time is a human decision, so it takes the coral selected state;
// nothing else in the picker is coral.

import { useEffect, useRef, useState } from "react";
import { SERVICE_LABELS, SERVICE_OPTIONS } from "@/lib/services";
import { sourceTag } from "@/lib/source-tag";
import { Arrow, Button, buttonClass } from "@/components/ui/Button";
import {
  FieldLabel,
  FormError,
  SelectField,
  TextArea,
  TextField,
  controlClass,
} from "@/components/ui/Field";
import { FocusOnMount } from "@/components/conversion/FocusOnMount";
import { cn } from "@/lib/cn";

type Slot = { startUtc: string; pktLabel: string };
type Step = "pick" | "verify" | "done";

// Said when "Confirm the call" is pressed without a full code. The button is
// never disabled for this: a disabled coral button gives no reason, so the
// press is allowed and the reason is shown.
const CODE_SHORT = "Enter the 6-digit code from the email.";

// Days shown before "Show later dates". Five business days is a full week of
// choice and keeps the picker to one screen on a phone.
const VISIBLE_DAYS = 5;

function fmtLocal(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  } catch {
    return iso;
  }
}

type Day = { key: string; weekday: string; date: string; long: string; slots: Slot[] };

// Groups by the visitor's LOCAL calendar day, so a slot that crosses midnight
// for them lands on the day they will actually take the call.
function groupByDay(slots: Slot[]): Day[] {
  const days = new Map<string, Day>();
  const sorted = [...slots].sort((a, b) => Date.parse(a.startUtc) - Date.parse(b.startUtc));
  for (const s of sorted) {
    const d = new Date(s.startUtc);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    let day = days.get(key);
    if (!day) {
      day = {
        key,
        weekday: d.toLocaleDateString(undefined, { weekday: "short" }),
        date: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
        long: d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }),
        slots: [],
      };
      days.set(key, day);
    }
    day.slots.push(s);
  }
  return [...days.values()];
}

// The zone as a person says it ("Pacific Time", "Pakistan Standard Time"),
// not the IANA ID ("America/Argentina/Buenos_Aires"), which is a machine
// string. longGeneric first because it does not change name across a DST
// switch, and the grid can span one; then long; then the ID itself.
function zoneName(iana: string): string {
  for (const style of ["longGeneric", "long"] as const) {
    try {
      const name = new Intl.DateTimeFormat(undefined, { timeZoneName: style })
        .formatToParts(new Date())
        .find((p) => p.type === "timeZoneName")?.value;
      if (name) return name;
    } catch {
      // Older engines reject longGeneric with a RangeError; try the next.
    }
  }
  return iana.replace(/_/g, " ");
}

type Zone = { iana: string; name: string };

function SlotPicker({
  slots,
  failed,
  picked,
  onPick,
  onRetry,
  zone,
}: {
  /** null while the first fetch is in flight. */
  slots: Slot[] | null;
  /** Last fetch failed. Only shown when there is no usable grid to fall back
   *  on: "no open slots" is a factual claim, and a network blip must not be
   *  allowed to make it. */
  failed: boolean;
  picked: string;
  onPick: (startUtc: string) => void;
  onRetry: () => void;
  zone: Zone | null;
}) {
  const [showAll, setShowAll] = useState(false);

  const header = (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <FieldLabel>Pick a time</FieldLabel>
      {zone ? (
        <p className="text-caption text-ink-400" title={zone.iana}>
          Times in {zone.name}
        </p>
      ) : null}
    </div>
  );

  if (failed && (slots === null || slots.length === 0)) {
    return (
      <div>
        {header}
        <p className="mt-3 text-sm text-ink-300">
          The times did not load.{" "}
          <button type="button" onClick={onRetry} className="link-quiet min-h-11">
            Try again
          </button>
        </p>
      </div>
    );
  }
  if (slots === null) {
    return (
      <div>
        {header}
        {/* SERVER-RENDERED FALLBACK. This branch is what the server emits, so
            with JavaScript off or a bundle that never loads, "Loading slots…"
            was the final state of the page: a message describing a fetch that
            will never be attempted, above two forms whose submits are
            preventDefault'd and whose inputs carry no name attributes, so
            every path on /contact was dead and none of them looked it.
            A noscript block cannot be styled away by the same failure that
            caused it, so it is the one thing guaranteed to reach that
            visitor. */}
        <noscript>
          <p className="mt-3 text-sm text-ink-300">
            Picking a time needs JavaScript, which is not running here. Email{" "}
            <a className="link-quiet" href="mailto:gravixar@gmail.com?subject=Book%20a%20call">
              gravixar@gmail.com
            </a>{" "}
            with a couple of times that suit you and I will confirm one.
          </p>
        </noscript>
        {/* Static placeholder rows hold the picker's height so the fields
            below do not jump when the times arrive. No shimmer: nothing here
            moves on its own. */}
        <div aria-hidden className="mt-3 divide-y divide-line-soft">
          {[0, 1, 2].map((i) => (
            <div key={i} className="grid grid-cols-[3.75rem_minmax(0,1fr)] gap-3 py-3">
              <span className="mt-1 h-3.5 w-9 rounded bg-ink-50/[0.05]" />
              <span className="flex gap-2">
                <span className="h-11 w-[4.5rem] rounded-lg bg-ink-50/[0.04] sm:h-10" />
                <span className="h-11 w-[4.5rem] rounded-lg bg-ink-50/[0.04] sm:h-10" />
                <span className="h-11 w-[4.5rem] rounded-lg bg-ink-50/[0.04] sm:h-10" />
              </span>
            </div>
          ))}
        </div>
        <p className="sr-only" role="status">
          Loading times
        </p>
      </div>
    );
  }
  if (slots.length === 0) {
    return (
      <div>
        {header}
        <p className="mt-3 text-sm text-ink-300">
          No open times right now. Send a note with the form instead and I&apos;ll find one.
        </p>
      </div>
    );
  }

  const days = groupByDay(slots);
  const pickedDay = days.findIndex((d) => d.slots.some((s) => s.startUtc === picked));
  const limit = showAll ? days.length : Math.max(VISIBLE_DAYS, pickedDay + 1);
  const visible = days.slice(0, limit);
  const hidden = days.length - visible.length;

  return (
    <div role="group" aria-label={zone ? `Pick a time, times in ${zone.name}` : "Pick a time"}>
      {header}
      <div className="mt-2 divide-y divide-line-soft">
        {visible.map((day) => (
          <div
            key={day.key}
            role="group"
            aria-label={day.long}
            className="grid grid-cols-[3.75rem_minmax(0,1fr)] items-start gap-3 py-3"
          >
            <p className="pt-1.5 leading-tight">
              <span className="block text-sm font-medium text-ink-100">{day.weekday}</span>
              <span className="block text-caption text-ink-500">{day.date}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {day.slots.map((s) => {
                const on = picked === s.startUtc;
                return (
                  <button
                    type="button"
                    key={s.startUtc}
                    onClick={() => onPick(s.startUtc)}
                    aria-pressed={on}
                    aria-label={`${day.long}, ${fmtTime(s.startUtc)}`}
                    className={cn(
                      // 44px tall on phones, where picking a time is the
                      // page's main action; 40px from sm, under a pointer.
                      "inline-flex h-11 min-w-[4.5rem] items-center sm:h-10 justify-center rounded-lg border px-3 text-sm transition-[border-color,background-color,color,scale] duration-200 active:scale-[0.97] active:duration-100",
                      on
                        ? "border-brand bg-brand/[0.14] font-medium text-ink-50"
                        : "border-line bg-ink-950/60 text-ink-200 hover:border-line-strong hover:text-ink-50",
                    )}
                  >
                    {fmtTime(s.startUtc)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm text-ink-300 transition-colors hover:text-ink-50"
        >
          Show later dates
          <span className="text-ink-500">({hidden} more {hidden === 1 ? "day" : "days"})</span>
        </button>
      ) : null}
    </div>
  );
}

export function BookCall() {
  const [step, setStep] = useState<Step>("pick");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [service, setService] = useState<string>("");
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  // Form-render timestamp for the @gravixar-sv/core/antibot time-trap: a
  // genuine fill takes >2s from mount; a replayed form is >24h stale.
  const [renderedAt] = useState(() => Date.now());

  const [token, setToken] = useState("");
  const [code, setCode] = useState("");
  const codeRef = useRef<HTMLInputElement>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slotsFailed, setSlotsFailed] = useState(false);
  const [picked, setPicked] = useState<string>("");
  const [confirmed, setConfirmed] = useState<{ startUtc: string; meetUrl: string } | null>(null);
  // Read after mount: the server cannot know the visitor's zone, and printing
  // one during SSR would be wrong for everyone but the server.
  const [zone, setZone] = useState<Zone | null>(null);

  // Fetches (or re-fetches) the grid. Failure sets a flag instead of faking
  // an empty grid: "no open slots" is a claim about availability, and a
  // network blip is not evidence for it. An already-loaded grid is kept on a
  // failed refresh; confirm re-validates server-side anyway.
  async function refreshSlots() {
    try {
      const r = await fetch("/api/book/slots");
      const s = (await r.json()) as { slots?: Slot[] };
      setSlots(s.slots ?? []);
      setSlotsFailed(false);
    } catch {
      setSlotsFailed(true);
    }
  }

  // Slots load on mount, before any detail is asked for.
  useEffect(() => {
    void refreshSlots();
    try {
      const iana = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
      setZone(iana ? { iana, name: zoneName(iana) } : null);
    } catch {
      setZone(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!picked) {
      setError("Pick a time first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/book/request-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // One hidden input feeds both honeypot names: `website` (legacy +
        // confirm route) and `hp_website` (@gravixar-sv/core/antibot).
        body: JSON.stringify({ email, name, website, hp_website: website, ts: renderedAt }),
      });
      const data = (await res.json().catch(() => ({}))) as { token?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? `request_failed_${res.status}`);
      setToken(data.token ?? "");
      setStep("verify");
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(false);
    }
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!picked) {
      setError("Pick a time first.");
      return;
    }
    if (code.length !== 6) {
      setError(CODE_SHORT);
      codeRef.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/book/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          code,
          token,
          startUtc: picked,
          service: service || undefined,
          note: note || undefined,
          source: sourceTag("booking"),
          website,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        startUtc?: string;
        meetUrl?: string;
      };
      if (!res.ok) {
        if (data.error === "slot_taken" || data.error === "slot_unavailable") {
          // Refresh the grid and clear the pick; the verify step renders the
          // grid whenever nothing is picked, so the repick happens in place
          // and the already-verified code is reused. slot_unavailable gets
          // the same treatment as slot_taken: a slot ages out of the 24h
          // lead window while the visitor reads their email, and without a
          // refresh the stale grid would re-offer times the server has
          // already stopped honouring, forever.
          await refreshSlots();
          setPicked("");
        }
        throw new Error(data.error ?? `request_failed_${res.status}`);
      }
      setConfirmed({ startUtc: data.startUtc ?? picked, meetUrl: data.meetUrl ?? "" });
      setStep("done");
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(false);
    }
  }

  // ── Done ──
  if (step === "done" && confirmed) {
    return (
      <FocusOnMount>
        <div role="status" className="fade-up panel-lit rounded-2xl p-6 sm:p-7">
          <p className="flex items-center gap-2 text-sm font-medium text-ink-100">
            <span aria-hidden className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand text-bg">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="m2.5 6.2 2.3 2.3 4.7-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            Booked
          </p>
          <h3 className="mt-3 text-xl font-semibold tracking-[-0.015em] text-ink-50">
            You&apos;re set for {fmtLocal(confirmed.startUtc)}.
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-400">
            A calendar invite is on its way to {email}. Join with Google Meet:
          </p>
          <a
            href={confirmed.meetUrl}
            rel="noreferrer"
            target="_blank"
            className={cn("group mt-5", buttonClass({ size: "md" }))}
          >
            Open Google Meet <Arrow external />
          </a>
        </div>
      </FocusOnMount>
    );
  }

  return (
    <div className="panel-lit rounded-2xl p-4 sm:p-6">
      {/* honeypot */}
      <input
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden
      />

      {step === "pick" ? (
        <form onSubmit={sendCode} className="space-y-6">
          <SlotPicker
            slots={slots}
            failed={slotsFailed}
            picked={picked}
            onPick={(s) => {
              setPicked(s);
              if (error) setError(null);
            }}
            onRetry={() => void refreshSlots()}
            zone={zone}
          />
          {/* Announces the pick. Persistent, so the change is read even though
              the details below mount at the same moment. */}
          <p className="sr-only" aria-live="polite">
            {picked ? `Chosen: ${fmtLocal(picked)}` : ""}
          </p>
          {/* The details arrive BECAUSE a time was picked. Before that the
              picker is the panel's single idea: no name or email to fill in
              for a slot that might not suit, and no coral submit that can only
              fail. That also keeps the no-disabled-submit rule: there is no
              submit to disable until it can succeed. The field values live in
              state, so going Back from the code step brings them back filled. */}
          {picked ? (
            <div className="fade-up space-y-6 border-t border-line-soft pt-6">
              <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                <TextField
                  label="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                  autoComplete="name"
                />
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <SelectField label="What do you need?" optional value={service} onChange={(e) => setService(e.target.value)}>
                <option value="">Pick the closest match</option>
                {SERVICE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {SERVICE_LABELS[s]}
                  </option>
                ))}
              </SelectField>
              <TextArea
                label="Anything to share?"
                optional
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                hint="The problem, what you use today, what good would look like."
              />
              {/* role="alert" (inside FormError) so the failure is announced.
                  Without it a screen reader user presses submit, nothing is
                  read, and the form looks like it simply did nothing. */}
              {error ? <FormError>{error}</FormError> : null}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <Button type="submit" disabled={busy} className={cn("group w-full sm:w-auto", busy && "cursor-wait")}>
                  {busy ? "Sending…" : "Email me the code"}
                  {busy ? null : <Arrow />}
                </Button>
                <p className="text-caption text-ink-400">
                  Chosen: <span className="text-ink-200">{fmtLocal(picked)}</span>
                  <span className="block">A 6-digit code confirms it is you.</span>
                </p>
              </div>
            </div>
          ) : slots && slots.length > 0 ? (
            // Sits on the same hairline the details will arrive on.
            <p className="border-t border-line-soft pt-5 text-caption text-ink-400">Pick a time to continue.</p>
          ) : null}
          {!picked && error ? <FormError>{error}</FormError> : null}
        </form>
      ) : null}

      {step === "verify" ? (
        // noValidate: the code check is ours (CODE_SHORT, in words), not the
        // browser's "match the requested format" bubble. The pattern stays for
        // :user-invalid styling and for assistive tech.
        <form onSubmit={confirm} noValidate className="space-y-6">
          {picked ? (
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line-soft pb-5">
              {/* "Chosen time", not "Your slot": nothing is held until
                  confirm, and a possessive would claim otherwise. */}
              <div>
                <FieldLabel>Chosen time</FieldLabel>
                <p className="mt-1 text-lg font-medium tracking-[-0.01em] text-ink-50">{fmtLocal(picked)}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPicked("");
                  void refreshSlots();
                }}
                className="inline-flex min-h-11 items-center text-sm text-ink-300 transition-colors hover:text-ink-50"
              >
                Change time
              </button>
            </div>
          ) : (
            <SlotPicker
              slots={slots}
              failed={slotsFailed}
              picked={picked}
              onPick={(s) => {
                setPicked(s);
                if (error) setError(null);
              }}
              onRetry={() => void refreshSlots()}
              zone={zone}
            />
          )}
          <div>
            {/* A real <label>, not a <span>. The pick step wraps its inputs
                in labels; this step dropped it once, so the one field that
                arrives by email was announced as an unlabelled text box. */}
            <label htmlFor="booking-code" className="block text-sm font-medium text-ink-200">
              Enter the 6-digit code sent to <span className="text-ink-50">{email}</span>
            </label>
            <input
              ref={codeRef}
              id="booking-code"
              aria-invalid={error === CODE_SHORT || undefined}
              className={cn(controlClass, "mt-2 h-12 max-w-[14rem] text-center text-lg tracking-[0.4em] tabular-nums md:text-lg")}
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              // Lets iOS and Android offer the code straight from the SMS or
              // mail notification instead of making people switch apps.
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ""));
                if (error === CODE_SHORT) setError(null);
              }}
              placeholder="••••••"
              required
            />
            <span className="mt-1.5 block text-[0.8125rem] leading-snug text-ink-500">
              Not in your inbox? Check the spam folder.
            </span>
          </div>
          {error ? <FormError>{error}</FormError> : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            {/* Disabled only while a request is in flight (the
                no-disabled-submit rule). A short code or a missing time is
                answered in words by confirm(). */}
            <Button
              type="submit"
              disabled={busy}
              className={cn("group w-full sm:w-auto", busy && "cursor-wait")}
            >
              {busy ? "Confirming…" : "Confirm the call"}
              {busy ? null : <Arrow />}
            </Button>
            <button
              type="button"
              onClick={() => {
                setStep("pick");
                setError(null);
                setCode("");
                void refreshSlots();
              }}
              className="inline-flex min-h-11 items-center justify-center text-sm text-ink-400 transition-colors hover:text-ink-100"
            >
              Back
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

// API codes and network failures, in words. A raw code (or "Failed to
// fetch") is never shown; unknown ones get the generic line with the email
// fallback, and the code goes to the console for whoever is debugging.
function friendly(err: unknown): string {
  const code = err instanceof Error ? err.message : "";
  switch (code) {
    case "bad_code":
      return "That code is wrong or has expired. Check the email and try again.";
    case "slot_taken":
      return "Someone just took that time. Pick another one.";
    case "slot_unavailable":
      return "That time is no longer open. Pick another one.";
    case "invalid":
    case "invalid_input":
      return "Some details look off. Check your name and email and try again.";
    case "email_unavailable":
    case "send_failed":
      return "The code could not be sent just now. Try again in a minute.";
    // Operator secret missing, so the flow is off rather than degraded. Point
    // at the contact form instead of inviting a retry that cannot succeed.
    case "booking_unavailable":
      return "Booking is paused for the moment. Send a note with the form and I'll set a time up.";
    // The slot was NOT taken. Say that plainly rather than leaving someone
    // unsure whether they are double-booking by retrying.
    case "booking_not_stored":
      return "That did not save, so nothing is booked. Try again in a moment, or send a note instead.";
    default:
      console.warn("[book] request failed:", code || err);
      return "That did not go through. Try again, or email me at gravixar@gmail.com.";
  }
}
