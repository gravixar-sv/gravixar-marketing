"use client";

// Bosun's visible surface.
//
// IT NEVER OPENS ITSELF. No auto-open, no unread badge, no bounce, no "Hi 👋"
// after eight seconds. Every one of those is a measurable conversion tactic and
// every one of them is the reason people close chat widgets without reading
// them. On a site whose entire thesis is that software asks before it acts, a
// widget that interrupts would contradict the hero copy two hundred pixels
// above it. If nobody clicks it in month one, that is the spec working. Judge
// this on handoff rate and on the quality of the miss log, not on opens.
//
// NOTHING PERSISTS. Messages live in component state for the life of the panel
// and are gone on reload (clause 11). The only thing that leaves the browser
// besides the questions themselves is one scrubbed row of what Bosun could not
// answer, sent once on close.
//
// NOTHING IS SENT ON THE VISITOR'S BEHALF. The capture card renders the exact
// payload and does nothing until the visitor presses the button (clause 10).

import { useCallback, useEffect, useRef, useState } from "react";
import { sourceTag } from "@/lib/source-tag";

type Turn = {
  role: "bosun" | "visitor";
  text: string;
  href?: string;
  /** Published copy, rendered attributed. See the note in the chat route. */
  quoted?: boolean;
};

type Meta = {
  name: string;
  label: string;
  pronunciation: string;
  disclosure: string;
  opener: string;
  suggestions: string[];
};

export function Bosun({ sourcePage }: { sourcePage: string }) {
  const [open, setOpen] = useState(false);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [showCapture, setShowCapture] = useState(false);
  // Shown before the first question, and again after a dead end, which is
  // exactly when someone does not know what this thing can answer.
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [consecutiveMisses, setConsecutiveMisses] = useState(0);

  const missesRef = useRef<string[]>([]);
  const turnCountRef = useRef(0);
  const outcomeRef = useRef<"none" | "handoff_offered" | "captured">("none");
  const sentRef = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // One beacon per conversation, on close or unload. Guarded so a close
  // followed by an unload cannot write the row twice.
  const flushMisses = useCallback(() => {
    if (sentRef.current) return;
    if (missesRef.current.length === 0) return;
    sentRef.current = true;
    const payload = JSON.stringify({
      sourcePage,
      misses: missesRef.current.slice(0, 12),
      turns: Math.max(1, Math.min(turnCountRef.current, 50)),
      outcome: outcomeRef.current,
    });
    try {
      const blob = new Blob([payload], { type: "application/json" });
      if (!navigator.sendBeacon("/api/chat/miss", blob)) {
        void fetch("/api/chat/miss", { method: "POST", body: payload, keepalive: true });
      }
    } catch {
      // A log write must never surface to a visitor.
    }
  }, [sourcePage]);

  useEffect(() => {
    const onUnload = () => flushMisses();
    window.addEventListener("pagehide", onUnload);
    return () => {
      window.removeEventListener("pagehide", onUnload);
      flushMisses();
    };
  }, [flushMisses]);

  // Fetched on first open, not on mount: a closed launcher should cost nothing.
  useEffect(() => {
    if (!open || meta) return;
    let cancelled = false;
    void fetch(`/api/chat?page=${encodeURIComponent(sourcePage)}`)
      .then((r) => r.json())
      .then((m: Meta) => {
        if (cancelled) return;
        setMeta(m);
        // MANDATE CLAUSE 3: the disclosure is the first thing said, before the
        // visitor types anything, and it is a constant from the server.
        setTurns([{ role: "bosun", text: m.disclosure }, { role: "bosun", text: m.opener }]);
      })
      .catch(() => {
        if (cancelled) return;
        setTurns([
          {
            role: "bosun",
            text: "I could not load properly just now. The contact form and the Book a call button both still work.",
          },
        ]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, meta, sourcePage]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [turns, showCapture]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function send(override?: string) {
    const message = (override ?? input).trim();
    if (!message || busy) return;
    setInput("");
    // Once someone has asked something, the chips have done their job.
    setShowSuggestions(false);
    setTurns((t) => [...t, { role: "visitor", text: message }]);
    setBusy(true);
    turnCountRef.current += 1;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, sourcePage, consecutiveMisses }),
      });
      const data = (await res.json()) as {
        kind: string;
        text: string;
        href?: string;
        quoted?: boolean;
        offerCapture?: boolean;
        isMiss?: boolean;
      };

      if (!res.ok) throw new Error("bad_response");

      setTurns((t) => [
        ...t,
        { role: "bosun", text: data.text, href: data.href, quoted: data.quoted },
      ]);

      if (data.isMiss) {
        missesRef.current.push(message);
        setConsecutiveMisses((n) => n + 1);
      } else {
        setConsecutiveMisses(0);
      }
      // Set from THIS turn, not accumulated. The first version only ever set
      // it true, and the only reset was a successful send, so one early
      // handoff offer pinned the card to the bottom of the panel for the rest
      // of the conversation: every good answer after it came with a form
      // asking for your email. Reset per turn, so the card is present exactly
      // when the current turn ran out of road.
      // Put the chips back when Bosun could not help. A refusal or a miss is
      // precisely the moment someone needs to be shown what DOES work, rather
      // than left to guess again and get refused again.
      setShowSuggestions(data.kind === "miss" || data.kind === "refusal");
      setShowCapture(data.offerCapture === true);
      if (data.offerCapture && outcomeRef.current === "none") {
        outcomeRef.current = "handoff_offered";
      }
    } catch {
      // Deterministic tier, so a failure here is the network, not a model. Say
      // what still works rather than inviting a retry that may not succeed.
      setTurns((t) => [
        ...t,
        {
          role: "bosun",
          text: "That did not go through. The contact form and the Book a call button are unaffected if you would rather use those.",
        },
      ]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  if (!open) {
    return (
      // Below md the launcher is a small "Ask" pill that fades in only after
      // the fold has scrolled away (.bosun-launcher in globals.css): the old
      // full-width pill sat on top of the hero's primary button. No coral dot:
      // Bosun is the machine, and coral marks a human decision. Solid, not
      // frosted: glass is not part of this system.
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ask Bosun"
        className="bosun-launcher fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line-strong bg-ink-900 px-4 text-[0.8125rem] font-medium text-ink-100 shadow-[0_12px_30px_-12px_rgb(0_0_0/0.8)] transition-[border-color,background-color,scale] duration-200 ease-spring hover:border-ink-400/60 hover:bg-ink-800 active:scale-[0.96] md:bottom-6 md:right-6 md:h-10"
      >
        <span aria-hidden className="size-1.5 rounded-full bg-ink-300" />
        <span aria-hidden className="md:hidden">Ask</span>
        <span aria-hidden className="hidden md:inline">Ask Bosun</span>
      </button>
    );
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-label="Ask Bosun, an automated answer panel"
      className="pop-in panel-lit fixed bottom-4 right-4 z-40 flex h-[min(34rem,calc(100dvh-2rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl md:bottom-6 md:right-6"
    >
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="font-mono text-label-sm uppercase text-muted">
          Bosun <span className="text-ink-500">({meta?.pronunciation ?? "boh-sun"})</span>
        </p>
        <button
          type="button"
          onClick={() => {
            flushMisses();
            setOpen(false);
          }}
          aria-label="Close Bosun"
          className="text-[0.75rem] text-muted transition-colors duration-200 ease-out hover:text-ink-300"
        >
          close
        </button>
      </header>

      <div ref={logRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {turns.map((t, i) => (
          <div key={i} className={t.role === "visitor" ? "text-right" : ""}>
            {t.role === "visitor" ? (
              <p className="inline-block max-w-[85%] rounded-lg bg-ink-800 px-3 py-2 text-left text-[0.8125rem] leading-snug text-ink-100">
                {t.text}
              </p>
            ) : t.quoted ? (
              // Attributed, not spoken. The site is written first person as
              // Qamar, so published copy repeated flat would have Bosun saying
              // "I" about work it did not do. The rule reads on screen: indented
              // and sourced is a quotation, plain text is Bosun.
              <figure className="border-l border-ink-700 pl-3">
                <blockquote className="whitespace-pre-line text-[0.8125rem] leading-relaxed text-ink-300">
                  {t.text}
                </blockquote>
                <figcaption className="mt-1 font-mono text-label-sm uppercase text-ink-400">
                  quoted from{" "}
                  <a
                    href={t.href}
                    className="text-muted transition-colors duration-200 ease-out hover:text-ink-50"
                  >
                    {t.href}
                  </a>
                </figcaption>
              </figure>
            ) : (
              <p className="whitespace-pre-line text-[0.8125rem] leading-relaxed text-ink-300">
                {t.text}
              </p>
            )}
          </div>
        ))}
        {busy ? <p className="text-[0.75rem] text-ink-500">thinking</p> : null}
        {showSuggestions && meta?.suggestions?.length && !busy ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {meta.suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void send(s)}
                className="rounded-full border border-line px-2.5 py-1 text-[0.75rem] text-ink-400 transition-colors duration-200 ease-out hover:border-line-strong hover:text-ink-50"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}
        {showCapture ? (
          <CaptureCard
            sourcePage={sourcePage}
            onSent={() => {
              outcomeRef.current = "captured";
              setShowCapture(false);
              setTurns((t) => [
                ...t,
                {
                  role: "bosun",
                  text: "Sent. Qamar replies within one working day. Nobody is sitting in this chat, so the reply comes by email.",
                },
              ]);
            }}
          />
        ) : null}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="flex items-center gap-2 border-t border-line px-3 py-3"
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={600}
          placeholder="Ask what a service costs or what has been built"
          aria-label="Your question"
          className="h-10 flex-1 rounded-lg border border-line bg-ink-950/60 px-3 text-base text-ink-100 transition-colors placeholder:text-ink-500 focus:border-ink-400/70 md:h-9 md:text-[0.8125rem]"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="h-10 rounded-lg bg-brand px-3.5 text-[0.8125rem] font-medium text-bg transition-[background-color,scale] duration-200 ease-spring hover:bg-brand-soft active:scale-[0.96] disabled:bg-ink-800 disabled:text-ink-500 md:h-9"
        >
          send
        </button>
      </form>
    </div>
  );
}

/**
 * MANDATE CLAUSE 10. Bosun collects only what the visitor types into a rendered
 * field, never parses contact details out of prose, and never submits on the
 * visitor's behalf. The payload is shown before it is sent.
 */
function CaptureCard({
  sourcePage,
  onSent,
}: {
  sourcePage: string;
  onSent: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  // Stamped so HQ Inbox can tell a chat handoff from a form fill, with the
  // visit's channel when it has one ("chat:bosun:linkedin"). The card only
  // mounts after a click, so this never renders on the server. The channel is
  // part of the payload, so it is shown with the rest of it below.
  const source = sourceTag("chat:bosun");
  const via = source.startsWith("chat:bosun:") ? source.slice("chat:bosun:".length) : null;

  // The existing service-inquiry endpoint requires 20 characters, and telling
  // someone that up front beats a rejection after they press send.
  const ready = name.trim().length > 1 && /.+@.+\..+/.test(email) && message.trim().length >= 20;

  async function submit() {
    if (!ready || state === "sending") return;
    setState("sending");
    try {
      const res = await fetch("/api/service-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
          sourcePage,
          source,
        }),
      });
      if (!res.ok) throw new Error("failed");
      onSent();
    } catch {
      setState("error");
    }
  }

  return (
    <div className="rounded-xl border border-line bg-ink-950/40 p-3.5">
      <p className="font-mono text-label-sm uppercase text-muted">
        hand it to Qamar
      </p>
      <p className="mt-1 text-[0.75rem] leading-snug text-ink-400">
        Nothing is sent until you press the button, and this is exactly what goes.
      </p>
      <div className="mt-2 space-y-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          aria-label="Your name"
          className="h-10 w-full rounded-lg border border-line bg-ink-950/60 px-3 text-base text-ink-100 transition-colors placeholder:text-ink-500 focus:border-ink-400/70 md:h-9 md:text-[0.8125rem]"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          aria-label="Your email"
          className="h-10 w-full rounded-lg border border-line bg-ink-950/60 px-3 text-base text-ink-100 transition-colors placeholder:text-ink-500 focus:border-ink-400/70 md:h-9 md:text-[0.8125rem]"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="What do you need? A sentence or two is enough."
          aria-label="Your message"
          className="w-full rounded-lg border border-line bg-ink-950/60 px-3 py-2 text-base leading-snug text-ink-100 transition-colors placeholder:text-ink-500 focus:border-ink-400/70 md:text-[0.8125rem]"
        />
      </div>
      <p className="mt-2 font-mono text-[0.6875rem] leading-snug text-ink-500">
        sending: name, email, your message, and this page ({sourcePage}
        {via ? `, arrived via ${via}` : ""})
      </p>
      {state === "error" ? (
        <p className="mt-1 text-[0.75rem] text-danger">
          That did not send. The contact form still works.
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => void submit()}
        disabled={!ready || state === "sending"}
        className="mt-2 h-8 w-full rounded-md border border-ink-700 text-[0.75rem] font-medium text-ink-100 transition-colors duration-200 ease-out hover:border-line-strong hover:text-ink-50 disabled:opacity-40"
      >
        {state === "sending" ? "sending" : "send to Qamar"}
      </button>
    </div>
  );
}
