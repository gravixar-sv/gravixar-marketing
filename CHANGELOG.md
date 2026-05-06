# CHANGELOG, gravixar-ai

## v0.4.0, 2026-05-05, launch day (gravixar.com live)

Hosted at **gravixar.com** for the first time. demo.gravixar.com also live.

**Marketing content (3 stacked PRs merged):**
- **W1 content (#1)**: Beeline case study refresh (9/14 modules framing), 5 comparison pages (Productive.io / Function Point / Karbon / Notion / monday.com), FAQPage + BreadcrumbList structured data, /llms.txt manifest.
- **Design refresh (#2)**: Geist Sans + Geist Mono replace Inter + JetBrains Mono. Hero now has a live persona panel (Mira / Kai / Nox / Sage) with system-signal stats. New `.card-surface`, `.card-hover-glow`, `.live-panel`, `.ambient-drift` utilities. /modules library page with 12 module entries. ContactCTA in live-panel surface.
- **Launch prep (#3)**: client names genericized across case studies + compare pages + module runningIn fields (logos kept per permission). monday-broomstick → monday-rollout-agency rename. /early-access waitlist with structured triage fields (interest dropdown + team size + timeline). Early-access endpoint + Blob log (separate prefix from leads).

**Admin dashboard (#4):**
- `/admin` route, single-user gated by `ADMIN_TOKEN` env var compared to HttpOnly cookie. Sufficient for sole-operator backend.
- Lists discovery-call leads + early-access signups grouped by month. Month-picker for browsing history. mailto: links for direct reply.
- Read helpers added to `lib/blob.ts`: `readLeads()`, `readEarlyAccess()`, `listLeadMonths()`, etc.

**Launch-day polish (#5):**
- DemoBanner copy: "coming online" → "running at" (demo is live).
- Hero persona cards now show per-role action verbs ("approve a deliverable", "send first reply", etc.).
- CalEmbed: replaced 720px-tall iframe with a styled card + click-to-popup-window button (was overflowing the contact form column).
- Early-access form: structured dropdowns (9 interest options, team size, timeline) replace the free-text "what are you hoping to use this for" field. Notification email includes all selections.
- Navbar gains a brand-filled "Get early access" CTA next to "Book a call".

**Layout fix (#6):**
- Marketing chrome (DemoBanner, Navbar, Footer) moved into `(marketing)/layout.tsx` so /admin and other non-marketing routes don't inherit it. Root layout stripped to just html/body/fonts/StructuredDataGlobal.

**Favicon fix (#7):**
- Removed broken `icons: { icon: '/favicon.ico' }` metadata override that pointed at a non-existent file (was returning 404).
- `app/icon.png` is now auto-detected by Next.js's file-based icon convention. Added `app/apple-icon.png` for iOS home-screen shortcuts.

**Infrastructure:**
- **DNS**: domain at GoDaddy, nameservers switched to Vercel (`ns1.vercel-dns.com` / `ns2.vercel-dns.com`). Cloudflare zone removed (was causing intermittent SSL handshake failures from stale cached IPs).
- DNS records preserved during migration: GoDaddy email MX records (smtp/mailstore1.secureserver.net), SPF, 4 verification TXT records (Google × 2, OpenAI, GoDaddy bookkeeping).
- Vercel Blob store provisioned + connected to gravixar-marketing project; `BLOB_READ_WRITE_TOKEN` auto-injected.
- **Resend**: only 1 domain on free tier; deferred sending from gravixar.com (low launch volume, /admin reads from Blob directly).

**Memory updates:**
- `feedback_periodic_sync_marketing.md` — bs-hub + Beeline evolve; resync marketing claims against canonical status docs every 2-4 weeks.
- `feedback_light_mode_deferred.md` — light/dark theme toggle deferred until 3 trigger conditions hit (5+ closed builds, 50+ early-access signups, specific complaint).

**Still NOT built:**
- Demo Tour V1 (next session — see `DEMO-TOUR-PLAN.md` in gravixar-demo).
- Case-study auto-drafter.
- Social syndication queue.
- AI personalization on /early-access form (V2 of structured fields).
- Admin UI for promoting blog drafts (current flow: email + manual git commit).
- Resend sending from `mail.gravixar.com` (separate Resend account or Pro upgrade required).

## v0.3.0, 2026-05-02, AI SEO agent + OG generator + port pin

**Port pinned to 3300.** Gravixar dev server now runs at `localhost:3300` (or `gravixar.localhost:3300`). Avoids collision with bs-hub on 3000.

**Dynamic OG images:** `/api/og?title=...&kind=...` returns a 1200×630 branded card via Next.js `ImageResponse`. `buildMetadata()` defaults to this endpoint when no static cover is supplied, every page now has a real OG card without per-page work.

**AI SEO agent, both entry points wired:**
- `src/lib/ai/seo-agent.ts`, core generator. Routes through Vercel AI Gateway (`anthropic/claude-sonnet-4-6`). zod-validated structured output: title, slug, excerpt, tags[], MDX body. Strict voice prompt, concrete, first-person, no fluff.
- `src/app/api/cron/seo-agent/route.ts`, production cron. Tue + Fri 14:00 UTC. Authenticates via `Authorization: Bearer ${CRON_SECRET}`. Generates one draft, writes to Vercel Blob under `drafts/blog/{date}-{slug}.mdx`, emails the full MDX inline to `gravixar@gmail.com`. Nothing publishes; approval = paste into the repo, edit, commit.
- `scripts/seo-agent-local.ts`, same generation logic but writes to `content/blog/_drafts/` for local iteration. Run via `pnpm seo:draft "optional topic seed"`.
- `vercel.ts`, cron entry enabled.
- env: added `CRON_SECRET` for cron authentication.
- deps: added `ai` (Vercel AI SDK v6).

**bs-hub case study fleshed out**, replaced the skeleton with a real write-up: what was built (state machine + audit log + AI fall-through), decisions I'd defend (4), and the honest "what broke" section (4 items including the temporary Stripe coupon hack that earned its keep). 16 modules referenced.

**Still NOT built:** case-study auto-drafter, social syndication queue, demo subdomain (separate repo), admin UI for promoting drafts in production.

## v0.2.0, 2026-05-02, routes + lead pipeline

All public routes wired. Site is now navigable end-to-end (no 404s on any Navbar link).

**Routes shipped:**
- `/about`, MDX-backed page (`content/pages/about.mdx`).
- `/services` index + `/services/[slug]` detail, consumes `content/services/*.mdx`. Detail page renders MDX body + deliverables + proof links + pricing in a 2-column layout.
- `/work` index + `/work/[slug]` detail, consumes `content/case-studies/*.mdx`. Detail page renders Problem/Approach/Outcome sections + stack + metrics sidebar.
- `/blog` index + `/blog/[slug]` detail, consumes `content/blog/*.mdx` (drafts in `_drafts/` excluded). AI-assisted disclosure surfaced on each post.
- `/graphics` index + `/graphics/[slug]` detail, gallery grid + per-piece page with cover/video/gallery + tools + process notes.
- `/contact`, split-pane: lead form (POST → `/api/lead`) and Cal.com booking embed.

**Lead pipeline:**
- `POST /api/lead` validates with zod, runs botid check, blocks honeypot fills, then fans out to Resend (notify email to gravixar@gmail.com via `LeadInboundEmail`) and Vercel Blob (monthly NDJSON log under `leads/YYYY-MM.jsonl`). Both side-effects are best-effort, missing keys skip the step rather than fail the request.
- `lib/lead.ts`, schema + `LeadRecord` type.
- `lib/resend.ts`, `lib/blob.ts`, clients with env-key gating.
- `emails/LeadInboundEmail.tsx`, react-email template.

**Schema additions:**
- `pageSchema` for one-off pages like `/about`. `loadPage(name)` reader added; validator extended.

**Components:**
- `site/PageHeader`, consistent eyebrow/title/lede header for every section.
- `lead/ContactForm` (client), submitting/ok/error states, honeypot field.
- `lead/CalEmbed`, iframe-based Cal.com booking embed; sandbox attrs scoped tight.

**Still NOT built:** AI SEO agent, case-study auto-drafter, social syndication queue, dynamic OG image generation, demo subdomain (separate repo).

## v0.1.0, 2026-05-02, first-pass scaffold

Initial scaffold. Marketing site only, AI agents, social syndication, and demo subdomain wiring all deferred to subsequent phases.

**Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4, MDX (next-mdx-remote), zod-validated frontmatter, Resend + Vercel Blob ready (not yet wired).

**What landed:**
- Project root: `package.json`, `tsconfig.json`, `next.config.ts` (CSP + security headers), `vercel.ts`, `.env.example`, eslint flat config, postcss for Tailwind v4.
- `src/app/layout.tsx`, root layout with Navbar + Footer + DemoBanner stub.
- `src/app/(marketing)/page.tsx`, homepage skeleton consuming `content/home/*.mdx` and `content/services/*.mdx`.
- `src/content/{schema,loaders,mdx}.ts`, content schema (BlogPost / CaseStudy / Service / GraphicsItem), filesystem readers, MDX component map.
- `content/home/{hero,proof}.mdx`, four `content/services/*.mdx` placeholders, one `content/case-studies/bs-hub.mdx` skeleton.
- `scripts/content-validate.ts`, zod-validates every MDX file at build time via `prebuild`.

**What's NOT built yet:** blog/case-study/graphics/contact pages (skeleton homepage only), lead-capture API, Cal.com embed, AI agents, social syndication, demo subdomain.

**Next:** install deps, run `pnpm dev`, sanity-check homepage, then plan what ships in v0.2.
