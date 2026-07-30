// Capabilities and integrations: the real engineering surface area I build
// with, grouped by what each tool does. Every entry here is wired into at
// least one shipped product. No fabricated "X integrations" headline number;
// the proof is the named list, not a count.

type CapabilityGroup = {
  label: string;
  note: string;
  items: string[];
};

const GROUPS: CapabilityGroup[] = [
  {
    label: "ai",
    // Eval gates: 37 eval-gate suites, roughly 475 act-eval cases.
    // Source: brain/projects/gravixar-hq.md.
    note: "Claude across products: drafting, assessment, triage, with a human on every write. 37 eval suites gate the ones running in my own ops platform.",
    items: [
      "Claude API (Anthropic)",
      "Content drafting",
      "Candidate assessment",
      "Feedback triage",
      "Eval gates",
    ],
  },
  {
    // Cal.com was retired in May 2026. /contact renders lead/BookCall, which
    // runs the in-house flow in src/lib/booking.ts: generated slots, an
    // HMAC-signed email verification code (no token storage), a Blob append,
    // and a Resend confirmation carrying a reusable Google Meet link plus an
    // .ics invite. No third-party scheduler is in the path.
    label: "payments & scheduling",
    note: "Take the money and book the time.",
    items: ["Stripe", "In-house booking (no third-party scheduler)"],
  },
  {
    label: "storage & data",
    note: "Object storage, blobs, and Postgres, picked per workload.",
    items: ["Wasabi (S3-compatible)", "Vercel Blob", "Supabase", "Neon Postgres"],
  },
  {
    label: "comms",
    note: "Meetings, mail, and the notifications people actually read.",
    items: ["Zoom (meetings + telephony)", "Resend", "Web Push", "Telegram", "LinkedIn API"],
  },
  {
    label: "ops & security",
    // Governance: 23 registered checks running daily across the platform.
    // Source: brain/projects/gravixar-hq.md.
    note: "The boring, load-bearing layer: identity, audit, anti-bot, PHI safety, and 23 governance checks that run daily.",
    items: [
      "Monday.com",
      "Google OAuth + Drive",
      "WebAuthn passkeys + TOTP 2FA",
      "Anti-bot / BotID",
      "Audit logging",
      "PHI detection / redaction",
      "Governance checks",
    ],
  },
];

export function Capabilities() {
  return (
    <section>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">
        capabilities &amp; integrations
      </p>
      <h2 className="mt-3 text-xl font-medium tracking-[-0.01em] text-zinc-300 md:text-reference">
        The surface area I build with.
      </h2>
      <p className="mt-4 max-w-2xl text-zinc-400">
        Not a logo wall for its own sake. Every tool below is wired into
        something that ships: a client portal, a demo you can click, or the
        platform itself.
      </p>

      {/* No container box: the rows sit on the canvas and are separated by their
          own hairlines, so the top rule is unconditional (a conditional i > 0
          rule would leave the first row's top edge floating), and the last row
          carries a bottom rule so the stack closes instead of trailing off.
          The rules take border-line rather than border-line-soft on purpose:
          with the box gone they are the only structure left, so they enclose
          rather than merely separate. The chips keep border-zinc-800, which is
          a solid chip outline against their own fill, not a hairline rank. */}
      <div className="mt-10">
        {GROUPS.map((group, i) => (
          <div
            key={group.label}
            className={`grid gap-x-8 gap-y-4 border-t border-line py-5 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)] md:py-6 ${
              i === GROUPS.length - 1 ? "border-b" : ""
            }`}
          >
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                {group.label}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                {group.note}
              </p>
            </div>
            <ul className="flex flex-wrap content-start gap-2">
              {group.items.map((item) => (
                <li
                  key={item}
                  className="rounded-sm border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 font-mono text-[11px] text-zinc-300"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
