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
    note: "Claude across products: drafting, assessment, triage, with a human on every write.",
    items: [
      "Claude API (Anthropic)",
      "Content drafting",
      "Candidate assessment",
      "Feedback triage",
    ],
  },
  {
    label: "payments & scheduling",
    note: "Take the money and book the time.",
    items: ["Stripe", "Cal.com"],
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
    note: "The boring, load-bearing layer: identity, audit, anti-bot, and PHI safety.",
    items: [
      "Monday.com",
      "Google OAuth + Drive",
      "WebAuthn passkeys + TOTP 2FA",
      "Anti-bot / BotID",
      "Audit logging",
      "PHI detection / redaction",
    ],
  },
];

export function Capabilities() {
  return (
    <section>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">
        capabilities &amp; integrations
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.015em] md:text-4xl">
        The surface area I build with.
      </h2>
      <p className="mt-4 max-w-2xl text-zinc-400">
        Not a logo wall for its own sake. Every tool below is wired into
        something that ships: a client portal, a demo you can click, or the
        platform itself.
      </p>

      <div className="mt-10 overflow-hidden rounded-xl border border-zinc-800/80">
        {GROUPS.map((group, i) => (
          <div
            key={group.label}
            className={`grid gap-x-8 gap-y-4 p-6 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)] md:p-7 ${
              i > 0 ? "border-t border-zinc-800/80" : ""
            }`}
          >
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">
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
