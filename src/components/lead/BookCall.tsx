"use client";

// In-house "book a 30-min call" — replaces the cal.com popup.
// Slots first, verification second. The grid is the first thing this form
// shows, because availability is what a visitor is actually deciding on;
// the old order asked for name, email and an emailed code before showing a
// single time, which put the flow's heaviest step in front of the question
// "is there even a slot I can make".
// Step 1: pick a slot + details → emailed a verification code.
// Step 2: enter the code → confirm. If the slot was taken or aged out of the
//         24h lead window in the meantime, the grid refreshes and reappears
//         on this step for a repick; the emailed code stays valid, so nobody
//         re-verifies for a collision.
// Step 3: booked — Meet link shown + calendar invite emailed.
// Slots render in the visitor's own timezone. Picking a slot holds nothing
// until confirm, and the copy makes no claim otherwise.

import { useEffect, useState } from "react";
import { SERVICE_OPTIONS } from "@/lib/services";
import { buttonClass } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type Slot = { startUtc: string; pktLabel: string };
type Step = "pick" | "verify" | "done";

const LABEL = "font-mono text-label-sm uppercase text-muted";
// No focus:outline-none. It was killing the global coral :focus-visible ring
// that globals.css sets deliberately, leaving a border tint as the only focus
// signal, which is colour alone and fails a keyboard user outright.
const INPUT =
  "mt-1.5 w-full rounded-md border border-line bg-zinc-950/60 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-brand/50";

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

function SlotGrid({
  slots,
  failed,
  picked,
  onPick,
  onRetry,
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
}) {
  if (failed && (slots === null || slots.length === 0)) {
    return (
      <p className="mt-2 text-xs text-muted">
        Couldn&apos;t load the slots.{" "}
        <button type="button" onClick={onRetry} className="underline underline-offset-2 hover:text-zinc-300">
          Try again
        </button>
      </p>
    );
  }
  if (slots === null) {
    return (
      <>
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
          <p className="mt-2 text-sm text-zinc-300">
            Picking a time needs JavaScript, which is not running here. Email{" "}
            <a className="text-brand-soft underline" href="mailto:gravixar@gmail.com?subject=Book%20a%20call">
              gravixar@gmail.com
            </a>{" "}
            with a couple of times that suit you and I will confirm one.
          </p>
        </noscript>
        <p className="mt-2 text-xs text-muted">Loading slots…</p>
      </>
    );
  }
  if (slots.length === 0) {
    return (
      <p className="mt-2 text-xs text-muted">
        No open slots right now. Send a note with the form instead and
        I&apos;ll find a time.
      </p>
    );
  }
  return (
    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {slots.map((s) => (
        <button
          type="button"
          key={s.startUtc}
          onClick={() => onPick(s.startUtc)}
          aria-pressed={picked === s.startUtc}
          className={`rounded-md border px-2 py-2 text-left text-xs transition-colors ${
            picked === s.startUtc
              ? "border-brand bg-brand/10 text-brand-soft"
              : "border-line bg-zinc-950/60 text-zinc-300 hover:border-zinc-600"
          }`}
        >
          {fmtLocal(s.startUtc)}
        </button>
      ))}
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
  // Form-render timestamp for the @gravixar-sv/core/antibot time-trap — a
  // genuine fill takes >2s from mount; a replayed form is >24h stale.
  const [renderedAt] = useState(() => Date.now());

  const [token, setToken] = useState("");
  const [code, setCode] = useState("");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slotsFailed, setSlotsFailed] = useState(false);
  const [picked, setPicked] = useState<string>("");
  const [confirmed, setConfirmed] = useState<{ startUtc: string; meetUrl: string } | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!picked) {
      setError("Pick a slot first.");
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
      if (!res.ok) throw new Error(data.error ?? "couldn't send the code");
      setToken(data.token ?? "");
      setStep("verify");
    } catch (err) {
      setError(err instanceof Error ? friendly(err.message) : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!picked) {
      setError("Pick a slot first.");
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
          throw new Error(
            data.error === "slot_taken"
              ? "That slot was just taken. Pick another."
              : "That slot is no longer available. Pick another.",
          );
        }
        throw new Error(data.error ?? "couldn't confirm");
      }
      setConfirmed({ startUtc: data.startUtc ?? picked, meetUrl: data.meetUrl ?? "" });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? friendly(err.message) : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  // ── Done ──
  if (step === "done" && confirmed) {
    return (
      <div className="rounded-xl border border-brand-deep/30 bg-brand-deep/5 p-6">
        <p className="font-mono text-label-sm uppercase text-brand">booked</p>
        <h3 className="mt-1 text-lg font-medium tracking-[-0.01em] text-zinc-100">
          You&apos;re set for {fmtLocal(confirmed.startUtc)}.
        </h3>
        <p className="mt-2 text-sm text-zinc-400">
          A calendar invite is on its way to {email}. Join with Google Meet:
        </p>
        <a
          href={confirmed.meetUrl}
          rel="noreferrer"
          target="_blank"
          className={cn("mt-3", buttonClass({ size: "md" }))}
        >
          Open Google Meet <span aria-hidden>↗</span>
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-zinc-950/40 p-6">
      <p className="font-mono text-label-sm uppercase text-brand">
        30 min · google meet
      </p>
      <h3 className="mt-1 text-base font-medium tracking-[-0.01em] text-zinc-100">
        Book a call with Qamar
      </h3>
      <p className="mt-1 text-sm text-zinc-400">
        Pick a slot, confirm your email, get the Meet link. No prep needed.
      </p>

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
        <form onSubmit={sendCode} className="mt-5 space-y-4">
          <div>
            <span className={LABEL}>Pick a slot (your timezone)</span>
            <SlotGrid
              slots={slots}
              failed={slotsFailed}
              picked={picked}
              onPick={setPicked}
              onRetry={() => void refreshSlots()}
            />
          </div>
          <label className="block">
            <span className={LABEL}>Your name</span>
            <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
          </label>
          <label className="block">
            <span className={LABEL}>Email</span>
            <input className={INPUT} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="block">
            <span className={LABEL}>What do you need?</span>
            <select className={INPUT} value={service} onChange={(e) => setService(e.target.value)}>
              <option value="">Pick the closest match</option>
              {SERVICE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={LABEL}>Anything to share? (optional)</span>
            <textarea className={INPUT} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What's the problem, current stack, what 'good' looks like." />
          </label>
          {/* role="alert" so the failure is announced. Without it a screen
              reader user presses submit, nothing is read, and the form looks
              like it simply did nothing. */}
          {error ? (
            <p role="alert" className="text-xs text-red-400">
              {error}
            </p>
          ) : null}
          {/* Disabled only while busy, NOT on !picked: a disabled submit is a
              silent trap for keyboard and screen-reader users (it also eats
              the Enter key). The !picked case falls through to the guard in
              sendCode, which announces "Pick a slot first." via role=alert. */}
          <button
            type="submit"
            disabled={busy}
            className={buttonClass({ size: "md" })}
          >
            {busy ? "Sending…" : "Send verification code"}
            <span aria-hidden>→</span>
          </button>
        </form>
      ) : null}

      {step === "verify" ? (
        <form onSubmit={confirm} className="mt-5 space-y-4">
          {picked ? (
            <div>
              {/* "Chosen slot", not "Your slot": nothing is held until
                  confirm, and a possessive would claim otherwise. */}
              <span className={LABEL}>Chosen slot</span>
              <p className="mt-1.5 text-sm text-zinc-100">{fmtLocal(picked)}</p>
              <button
                type="button"
                onClick={() => {
                  setPicked("");
                  void refreshSlots();
                }}
                className="mt-1 text-xs text-muted hover:text-zinc-300"
              >
                change slot
              </button>
            </div>
          ) : (
            <div>
              <span className={LABEL}>Pick a slot (your timezone)</span>
              <SlotGrid
                slots={slots}
                failed={slotsFailed}
                picked={picked}
                onPick={setPicked}
                onRetry={() => void refreshSlots()}
              />
            </div>
          )}
          <div>
            {/* A real <label>, not a <span>. The pick step wraps its inputs
                in labels; this step dropped it, so the one field that arrives
                by email was announced as an unlabelled text box. */}
            <label className={LABEL} htmlFor="booking-code">
              Enter the 6-digit code sent to {email}
            </label>
            <input
              id="booking-code"
              className={`${INPUT} tracking-[0.4em]`}
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              // Lets iOS and Android offer the code straight from the SMS or
              // mail notification instead of making people switch apps.
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
              required
            />
          </div>
          {/* role="alert" so the failure is announced. Without it a screen
              reader user presses submit, nothing is read, and the form looks
              like it simply did nothing. */}
          {error ? (
            <p role="alert" className="text-xs text-red-400">
              {error}
            </p>
          ) : null}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={busy || !picked || code.length !== 6}
              className={buttonClass({ size: "md" })}
            >
              {busy ? "Confirming…" : "Confirm call"}
              <span aria-hidden>→</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("pick");
                setError(null);
                setCode("");
                void refreshSlots();
              }}
              className="text-xs text-muted hover:text-zinc-300"
            >
              ← back
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function friendly(code: string): string {
  switch (code) {
    case "bad_code": return "That code is wrong or expired. Try again.";
    case "slot_taken": return "That slot was just taken. Pick another.";
    case "slot_unavailable": return "That slot is no longer available.";
    case "email_unavailable":
    case "send_failed": return "Couldn't send the code right now. Try again shortly.";
    // Operator secret missing, so the flow is off rather than degraded. Point
    // at the contact form instead of inviting a retry that cannot succeed.
    case "booking_unavailable":
      return "Booking is temporarily unavailable. Use the contact form and I'll set a time up.";
    // The slot was NOT taken. Say that plainly rather than leaving someone
    // unsure whether they are double-booking by retrying.
    case "booking_not_stored":
      return "That did not save, so nothing is booked. Try again in a moment, or use the contact form.";
    default: return code.replace(/_/g, " ");
  }
}
