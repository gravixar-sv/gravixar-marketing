# CHANGELOG, gravixar-ai

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
