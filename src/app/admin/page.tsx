// /admin dashboard. Single page that:
// - Renders the sign-in form when ADMIN_TOKEN is unset OR cookie missing
// - Renders the leads + early-access dashboards when authenticated
// - Lists records for the current month plus a month-picker for older
//
// Auth model: env-based ADMIN_TOKEN, cookie set via server action.
// Sufficient for sole-operator backend. Replace with NextAuth when
// the team grows.

import Link from "next/link";
import { adminEnabled, isAdmin } from "@/lib/admin-auth";
import {
  currentMonthKey,
  listEarlyAccessMonths,
  listLeadMonths,
  readEarlyAccess,
  readLeads,
} from "@/lib/blob";
import {
  adminSignInAction,
  adminSignOutAction,
} from "@/lib/admin-actions";
import type { LeadRecord } from "@/lib/lead";
import type { EarlyAccessRecord } from "@/lib/early-access";

export const dynamic = "force-dynamic";

type SearchParams = { month?: string; error?: string };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { month, error } = await searchParams;

  if (!adminEnabled()) {
    return <Disabled />;
  }

  const authed = await isAdmin();
  if (!authed) {
    return <SignIn error={error} />;
  }

  const selectedMonth = month && /^\d{4}-\d{2}$/.test(month) ? month : currentMonthKey();

  const [leads, earlyAccess, leadMonths, eaMonths] = await Promise.all([
    readLeads(selectedMonth),
    readEarlyAccess(selectedMonth),
    listLeadMonths(),
    listEarlyAccessMonths(),
  ]);

  // Combine months from both sources for the picker, plus current month if missing
  const allMonths = Array.from(
    new Set([currentMonthKey(), ...leadMonths, ...eaMonths]),
  ).sort((a, b) => b.localeCompare(a));

  return (
    <Dashboard
      selectedMonth={selectedMonth}
      months={allMonths}
      leads={leads}
      earlyAccess={earlyAccess}
    />
  );
}

// ------- Sign-in --------

function SignIn({ error }: { error?: string }) {
  return (
    <div className="mx-auto max-w-md py-16">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand">
        gravixar admin
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.015em]">Sign in</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Single-user admin. Enter the token from your Vercel environment.
      </p>
      <form action={adminSignInAction} className="mt-8 space-y-3">
        <label className="block">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-400">
            admin token
          </span>
          <input
            name="token"
            type="password"
            required
            autoComplete="current-password"
            className="mt-2 block w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-brand"
          />
        </label>
        {error === "invalid" ? (
          <p className="text-xs text-red-400">Invalid token.</p>
        ) : null}
        <button
          type="submit"
          className="rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-brand-soft"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}

// ------- Disabled --------

function Disabled() {
  return (
    <div className="mx-auto max-w-md py-16">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand">
        gravixar admin
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.015em]">
        Admin disabled
      </h1>
      <p className="mt-3 text-sm text-zinc-400">
        Set <code className="font-mono text-zinc-200">ADMIN_TOKEN</code> in Vercel
        environment variables (Production scope) to enable this dashboard.
        After saving, redeploy the marketing project to pick up the new env.
      </p>
    </div>
  );
}

// ------- Dashboard --------

function Dashboard({
  selectedMonth,
  months,
  leads,
  earlyAccess,
}: {
  selectedMonth: string;
  months: string[];
  leads: LeadRecord[];
  earlyAccess: EarlyAccessRecord[];
}) {
  return (
    <div className="space-y-12">
      {/* Header + month picker + sign out */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand">
            gravixar admin
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.015em] md:text-3xl">
            Inbox · {selectedMonth}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <form>
            <select
              name="month"
              defaultValue={selectedMonth}
              onChange={undefined}
              className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-300"
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="ml-2 rounded-md border border-zinc-700 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-300 hover:border-brand hover:text-brand-soft"
            >
              load
            </button>
          </form>
          <form action={adminSignOutAction}>
            <button
              type="submit"
              className="rounded-md border border-zinc-800 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-400 hover:border-red-400/60 hover:text-red-300"
            >
              sign out
            </button>
          </form>
        </div>
      </header>

      {/* Stats strip */}
      <section className="grid gap-3 md:grid-cols-3">
        <Stat label="discovery-call leads" value={String(leads.length)} accent />
        <Stat label="early-access signups" value={String(earlyAccess.length)} accent />
        <Stat
          label="this month"
          value={selectedMonth}
          mono
        />
      </section>

      {/* Discovery-call leads */}
      <Section
        title="Discovery-call leads"
        subtitle="from /contact form, latest first"
        count={leads.length}
      >
        {leads.length === 0 ? (
          <Empty>
            No discovery-call leads in {selectedMonth}. Try a different month
            from the picker above.
          </Empty>
        ) : (
          <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-950/40">
            {[...leads]
              .reverse()
              .map((l) => (
                <li key={l.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-3">
                      <p className="text-sm font-medium text-zinc-100">{l.name}</p>
                      <a
                        href={`mailto:${l.email}`}
                        className="font-mono text-xs text-brand-soft hover:underline"
                      >
                        {l.email}
                      </a>
                      {l.company ? (
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                          {l.company}
                        </span>
                      ) : null}
                    </div>
                    <span className="font-mono text-[10px] text-zinc-600">
                      {timeFmt(l.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-300">
                    {l.message}
                  </p>
                  {l.source ? (
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                      source · {l.source}
                    </p>
                  ) : null}
                </li>
              ))}
          </ul>
        )}
      </Section>

      {/* Early-access waitlist */}
      <Section
        title="Early-access waitlist"
        subtitle="from /early-access form, latest first"
        count={earlyAccess.length}
      >
        {earlyAccess.length === 0 ? (
          <Empty>
            No early-access signups in {selectedMonth}. Try a different month
            from the picker above.
          </Empty>
        ) : (
          <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-950/40">
            {[...earlyAccess]
              .reverse()
              .map((e) => (
                <li key={e.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-3">
                      <a
                        href={`mailto:${e.email}`}
                        className="text-sm font-medium text-brand-soft hover:underline"
                      >
                        {e.email}
                      </a>
                      {e.name ? (
                        <span className="text-xs text-zinc-300">{e.name}</span>
                      ) : null}
                    </div>
                    <span className="font-mono text-[10px] text-zinc-600">
                      {timeFmt(e.createdAt)}
                    </span>
                  </div>
                  {e.need ? (
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-300">
                      {e.need}
                    </p>
                  ) : null}
                </li>
              ))}
          </ul>
        )}
      </Section>

      <footer className="border-t border-zinc-800 pt-6">
        <Link
          href="/"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 hover:text-zinc-200"
        >
          ← back to gravixar.com
        </Link>
      </footer>
    </div>
  );
}

// ------- helpers --------

function Stat({
  label,
  value,
  accent = false,
  mono = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p
        className={`mt-2 ${mono ? "font-mono text-base" : "text-2xl font-semibold tracking-[-0.015em]"} ${
          accent ? "text-brand" : "text-zinc-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Section({
  title,
  subtitle,
  count,
  children,
}: {
  title: string;
  subtitle?: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.015em] text-zinc-100">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">
              {subtitle}
            </p>
          ) : null}
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          {count} {count === 1 ? "row" : "rows"}
        </span>
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/20 p-6 text-sm text-zinc-500">
      {children}
    </div>
  );
}

function timeFmt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}
