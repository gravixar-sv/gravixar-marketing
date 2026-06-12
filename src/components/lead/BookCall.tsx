"use client";

// In-house "book a 30-min call" — replaces the cal.com popup.
// Step 1: details + service → emailed a verification code.
// Step 2: enter code + pick a slot → confirm.
// Step 3: booked — Meet link shown + calendar invite emailed.
// Slots render in the visitor's own timezone.

import { useState } from "react";
import { SERVICE_OPTIONS } from "@/lib/services";

type Slot = { startUtc: string; pktLabel: string };
type Step = "details" | "verify" | "done";

const LABEL = "font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500";
const INPUT =
  "mt-1.5 w-full rounded-md border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-brand/50 focus:outline-none";

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

export function BookCall() {
  const [step, setStep] = useState<Step>("details");
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
  const [slots, setSlots] = useState<Slot[]>([]);
  const [picked, setPicked] = useState<string>("");
  const [confirmed, setConfirmed] = useState<{ startUtc: string; meetUrl: string } | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
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
      // Fetch slots in parallel with the user reading their email.
      const s = await fetch("/api/book/slots").then((r) => r.json()).catch(() => ({ slots: [] }));
      setSlots(s.slots ?? []);
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
        if (data.error === "slot_taken") {
          // refresh slots, ask to repick
          const s = await fetch("/api/book/slots").then((r) => r.json()).catch(() => ({ slots: [] }));
          setSlots(s.slots ?? []);
          setPicked("");
          throw new Error("That slot was just taken. Pick another.");
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
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand">booked</p>
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
          className="mt-3 inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-brand-soft"
        >
          Open Google Meet <span aria-hidden>↗</span>
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand">
        30 min · google meet
      </p>
      <h3 className="mt-1 text-base font-medium tracking-[-0.01em] text-zinc-100">
        Book a call with Qamar
      </h3>
      <p className="mt-1 text-sm text-zinc-400">
        Confirm your email, pick a slot, get the Meet link. No prep needed.
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

      {step === "details" ? (
        <form onSubmit={sendCode} className="mt-5 space-y-4">
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
          {error ? <p className="text-xs text-red-400">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-brand-soft disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send verification code"}
            <span aria-hidden>→</span>
          </button>
        </form>
      ) : null}

      {step === "verify" ? (
        <form onSubmit={confirm} className="mt-5 space-y-4">
          <div>
            <span className={LABEL}>Enter the 6-digit code sent to {email}</span>
            <input
              className={`${INPUT} tracking-[0.4em]`}
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
              required
            />
          </div>
          <div>
            <span className={LABEL}>Pick a slot (your timezone)</span>
            {slots.length === 0 ? (
              <p className="mt-2 text-xs text-zinc-500">No open slots right now. Email me and I&apos;ll find a time.</p>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {slots.map((s) => (
                  <button
                    type="button"
                    key={s.startUtc}
                    onClick={() => setPicked(s.startUtc)}
                    className={`rounded-md border px-2 py-2 text-left text-xs transition-colors ${
                      picked === s.startUtc
                        ? "border-brand bg-brand/10 text-brand-soft"
                        : "border-zinc-800 bg-zinc-950/60 text-zinc-300 hover:border-zinc-600"
                    }`}
                  >
                    {fmtLocal(s.startUtc)}
                  </button>
                ))}
              </div>
            )}
          </div>
          {error ? <p className="text-xs text-red-400">{error}</p> : null}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={busy || !picked || code.length !== 6}
              className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-brand-soft disabled:opacity-50"
            >
              {busy ? "Confirming…" : "Confirm call"}
              <span aria-hidden>→</span>
            </button>
            <button
              type="button"
              onClick={() => { setStep("details"); setError(null); setCode(""); }}
              className="text-xs text-zinc-500 hover:text-zinc-300"
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
    default: return code.replace(/_/g, " ");
  }
}
