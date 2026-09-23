// The tools I build with, grouped by what each one does. Every entry is wired
// into at least one shipped product. No "X integrations" headline number: the
// proof is the named list, not a count.
//
// Since 2026-09-23 this lives on /about, not the homepage. On the homepage it
// was an engineer's spec sheet standing between the proof and the offer, and
// for the agency owner the page is written for it was the least useful screen
// on it. On /about it is reference material for the reader who asked, so it is
// set quietly: a small heading, sans labels in sentence case, and the tools as
// plain pills. Nothing here is machine output, so nothing here is mono.

type CapabilityGroup = {
  label: string;
  note: string;
  items: string[];
};

const GROUPS: CapabilityGroup[] = [
  {
    label: "AI",
    // 37 test suites (eval gates, roughly 475 cases) gate the AI in my own ops
    // platform. Source: brain/projects/gravixar-hq.md. Hard-coded here, so it
    // sits outside system-stats.json and its staleness check; recount it when
    // that file is recounted.
    note: "Claude writes drafts, screens candidates, and sorts feedback, with a person approving every action. In my own ops system, 37 sets of tests check its work.",
    items: [
      "Claude API (Anthropic)",
      "Content drafting",
      "Candidate assessment",
      "Feedback sorting",
      "Eval gates",
    ],
  },
  {
    // Cal.com was retired in May 2026. /contact renders lead/BookCall, which
    // runs the in-house flow in src/lib/booking.ts: generated slots, an
    // HMAC-signed email verification code (no token storage), a Blob append,
    // and a Resend confirmation carrying a reusable Google Meet link plus an
    // .ics invite. No third-party scheduler is in the path.
    label: "Payments and scheduling",
    note: "Take the money and book the time.",
    items: ["Stripe", "In-house booking (no third-party scheduler)"],
  },
  {
    label: "Storage and data",
    note: "Where files and data live, picked for each job.",
    items: ["Wasabi (S3-compatible)", "Vercel Blob", "Supabase", "Neon Postgres"],
  },
  {
    label: "Messages and meetings",
    note: "Meetings, mail, and the notifications people actually read.",
    items: ["Zoom (meetings and phone)", "Resend", "Web Push", "Telegram", "LinkedIn API"],
  },
  {
    label: "Ops and security",
    // 23 registered checks running daily across the platform. Source:
    // brain/projects/gravixar-hq.md. Same staleness caveat as the 37 above.
    // "Bot checks", not "bot blocking": BotID is warn-only on lead routes.
    note: "The boring part that holds it all up: logins, audit trails, bot checks, patient-data safety, and 23 rule checks that run every day.",
    items: [
      "Monday.com",
      "Google OAuth and Drive",
      "Passkeys (WebAuthn) and TOTP 2FA",
      "Bot checks (BotID)",
      "Audit logging",
      "Patient-data detection and redaction",
      "Rule checks",
    ],
  },
];

export function Capabilities() {
  return (
    <section aria-labelledby="capabilities">
      <h2 id="capabilities" className="text-reference font-semibold text-ink-100">
        The tools I build with.
      </h2>
      <p className="mt-3 max-w-[60ch] text-[0.9375rem] leading-relaxed text-ink-400">
        Every tool here is in use today: in a client portal, a demo you can
        click, or my own ops system.
      </p>

      {/* No container box: the rows sit on the canvas, separated by their own
          hairlines, and the last row closes the stack with a bottom rule. */}
      <dl className="mt-8 border-b border-line">
        {GROUPS.map((group) => (
          <div
            key={group.label}
            className="grid gap-x-10 gap-y-3 border-t border-line py-5 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)] md:py-6"
          >
            <dt>
              <p className="text-caption font-medium text-ink-200">{group.label}</p>
              <p className="mt-1.5 text-caption text-ink-500">{group.note}</p>
            </dt>
            <dd>
              <ul className="flex flex-wrap content-start gap-2">
                {group.items.map((item) => (
                  <li
                    key={item}
                    className="rounded-full border border-line px-3 py-1 text-caption text-ink-300"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
