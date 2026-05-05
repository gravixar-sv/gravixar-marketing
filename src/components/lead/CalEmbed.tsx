"use client";

// Cal.com booking surface. Replaces the previous always-on iframe
// (720px tall, overflowed the form column visually) with a styled
// teaser card and a "Pick a slot" button that opens Cal.com in a
// popup window centered on the visitor's screen.
//
// Why not the inline iframe: it overran the form column visually and
// its height couldn't shrink without breaking the picker.
// Why not Cal's official embed.js modal: requires loading their script
// and managing global state, fragile for a single-button trigger.
// A popup window is simpler, the booking experience is identical,
// and it falls back to a normal new-tab open if popups are blocked.
//
// CSP already permits cal.com frames (next.config.ts), so this works
// without further config changes.

import { env } from "@/lib/env";

export function CalEmbed({ slug = "30min" }: { slug?: string }) {
  const username = env.NEXT_PUBLIC_CAL_USERNAME;
  const calUrl = `https://cal.com/${username}/${slug}?theme=dark`;

  function openCal(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    if (typeof window === "undefined") return;
    const w = 540;
    const h = 720;
    const left = Math.max(0, (window.screen.width - w) / 2);
    const top = Math.max(0, (window.screen.height - h) / 2);
    const popup = window.open(
      calUrl,
      "cal-booking",
      `popup,width=${w},height=${h},left=${left},top=${top}`,
    );
    // Fallback: if popup was blocked, open in a new tab
    if (!popup) {
      window.open(calUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
          {/* Calendar icon, inline svg to avoid an extra import */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden
          >
            <rect width="18" height="18" x="3" y="4" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand">
            30 min · google meet
          </p>
          <h3 className="mt-1 text-base font-medium tracking-[-0.01em] text-zinc-100">
            Discuss a project with Qamar
          </h3>
          <p className="mt-2 text-sm text-zinc-400">
            Pick a slot in your timezone. No prep needed — bring the problem,
            I&apos;ll bring the questions.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={openCal}
        className="mt-5 inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-brand-soft"
      >
        Pick a slot
        <span aria-hidden>→</span>
      </button>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">
        opens cal.com in a popup window
      </p>
    </div>
  );
}
