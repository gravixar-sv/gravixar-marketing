# AGENTS.md, gravixar-ai

Conventions and context for Claude (or any AI agent) working on this
repo. Read this first when starting a new session.

## What this repo is

`gravixar-ai` is **gravixar.com** — Qamar's personal brand site +
services marketing platform. The site itself runs the systems being
sold (AI SEO agent drafts blog posts, the modules library shows
production-tested patterns, the demo links live to a sister project
at demo.gravixar.com).

Live at: **https://gravixar.com**

## Stack

- Next.js 16 App Router + React 19 + TypeScript strict
- Tailwind CSS v4
- MDX content (git-as-CMS) with zod-validated frontmatter
- Resend (transactional email, currently disabled — see Resend section below)
- Vercel Blob (lead capture log + admin dashboard reads)
- Anthropic Claude via Vercel AI Gateway (SEO agent only, not in critical path)
- Hosting: Vercel Functions (Fluid Compute), `vercel.ts` config

## Local dev

```powershell
cd "C:\dev\gravixar-ai"
pnpm install
pnpm dev
```

Open http://localhost:3300 (port pinned to avoid bs-hub on 3000).

## Repo layout (the parts you'll actually touch)

```
src/
  app/
    layout.tsx                 # root, just html/body/fonts/StructuredDataGlobal
    (marketing)/               # marketing chrome (DemoBanner/Navbar/Footer) lives here
      layout.tsx               # the chrome wrapper
      page.tsx                 # homepage (Hero + Proof + ServicesPreview + ContactCTA)
      services/[slug]/         # MDX-backed
      work/[slug]/             # case studies
      modules/[slug]/          # 12 module library entries
      compare/[slug]/          # comparison pages
      blog/[slug]/             # AI-drafted (drafts gated)
      contact/                 # ContactForm + CalEmbed
      early-access/            # SaaS waitlist signup
      graphics/[slug]/         # gallery
      about/
    admin/                     # /admin dashboard, ADMIN_TOKEN gated
    api/
      lead/route.ts            # POST: contact form → Blob + Resend (if key set)
      early-access/route.ts    # POST: waitlist → Blob + Resend (if key set)
      og/route.ts              # dynamic OG image generation
      cron/seo-agent/route.ts  # Tue+Fri 14:00 UTC AI blog drafter
    icon.png                   # favicon (auto-detected, don't add `icons:` override)
    apple-icon.png             # iOS home-screen icon
    sitemap.ts                 # dynamic sitemap
    robots.ts
    llms.txt/route.ts          # AI engine manifest
  components/
    site/                      # Navbar, Footer, DemoBanner, PageHeader, StructuredData
    home/                      # Hero, Proof, ServicesPreview, ContactCTA, Clients
    lead/                      # ContactForm, EarlyAccessForm, CalEmbed
  content/
    schema.ts                  # zod schemas for ALL content kinds
    loaders.ts                 # filesystem readers (drafts excluded by default)
    mdx.tsx                    # MDX rendering helpers
  lib/
    seo.ts                     # SITE constant + buildMetadata helper
    env.ts                     # zod-validated env (don't read process.env directly)
    blob.ts                    # Vercel Blob append + read helpers
    resend.ts                  # lazy-init Resend client + getResend() returns null if no key
    lead.ts                    # lead schema + types
    early-access.ts            # waitlist schema + types + dropdown enums + label maps
    admin-auth.ts              # cookie-based admin gate
    admin-actions.ts           # server actions for sign-in/sign-out
    cn.ts                      # classNames helper
    ai/seo-agent.ts            # SEO agent generation logic (Vercel AI Gateway)
content/                       # MDX, validated at build time
  blog/                        # _drafts/ never published
  case-studies/
  services/
  modules/                     # 12 reusable patterns
  compare/                     # off-the-shelf vs custom pages
  graphics/
  home/                        # hero.mdx + proof.mdx
  pages/                       # about.mdx
emails/                        # react-email templates
scripts/
  content-validate.ts          # prebuild hook, fails build on invalid frontmatter
  seo-agent-local.ts           # `pnpm seo:draft "topic"` CLI
public/
  logos/, clients/, etc.
```

## Conventions

### Tone (locked, do not litigate)

Concrete-and-honest, not polished-marketing. First-person ("I"), no
"we" or "our team". One opinion per blog post / case study. **No
em-dashes** (LLM-detection signal); use commas or periods. Active
voice, short paragraphs, no listicles.

### Client name policy

**Genericized in all marketing copy** (e.g., "a digital agency client,
4-year engagement" rather than "Broomstick Creative"). Logos OK in
the marquee + cover images per Qamar's confirmed permission. When
clients grant explicit permission, names get restored in small
follow-up commits — never bulk-rename via search-replace.

See `feedback_periodic_sync_marketing.md` in user memory for the
periodic-sync rule.

### Branch + commit conventions

- Feature branches: `feat/short-description`
- Fixes: `fix/short-description`
- One PR per concern, squash-merge by default
- Commit messages: terse subject (under ~70 chars) + bullet body
  explaining changes and reasoning. Voice matches site copy
  (concrete, no fluff).
- `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
  on AI-assisted commits

### Git identity

Repo doesn't have user.name / user.email configured. **Don't run
`git config --global`.** Use one-shot env vars:

```bash
GIT_AUTHOR_NAME="Qamar" GIT_AUTHOR_EMAIL="gravixar@gmail.com" \
GIT_COMMITTER_NAME="Qamar" GIT_COMMITTER_EMAIL="gravixar@gmail.com" \
git rebase ...
```

Or `git -c user.name=... -c user.email=... commit ...`.

### Env vars

Defined in `lib/env.ts` with zod validation. Never read `process.env`
directly outside that file. Production env lives in Vercel
(gravixar-marketing project). Required for full functionality:

| Var | Purpose | Status |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | canonical URL for OG/sitemap | should be `https://gravixar.com` |
| `BLOB_READ_WRITE_TOKEN` | Blob lead log + admin reads | auto-injected when Blob store is connected |
| `ADMIN_TOKEN` | /admin dashboard gate | required for admin |
| `CRON_SECRET` | SEO agent cron auth | required for cron to fire |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway | required for SEO agent |
| `RESEND_API_KEY` | transactional email | currently empty (1 domain on free tier; handled via /admin instead) |

### Content + schema discipline

All MDX content has zod-validated frontmatter (`src/content/schema.ts`).
The `prebuild` script (`scripts/content-validate.ts`) fails the build
on bad frontmatter. **Don't add a content kind without updating both
the schema and the validator's SECTIONS array.**

### Voice rules for AI-drafted content

The SEO agent (`src/lib/ai/seo-agent.ts`) has a strict voice prompt.
If you modify it, preserve:
- "First-person singular ('I'). This is Qamar's writing, never 'we'"
- The "what Qamar will NOT write about" rejection list
- Generic project descriptors (no client names)

## Gotchas

- **Lint script is broken**: `next lint` is deprecated in Next 16,
  the `pnpm lint` command errors. Skip linting; rely on TypeScript
  + content validation + production build.
- **Cal.com availability**: configured in Cal.com dashboard, not
  code. The CalEmbed.tsx popup just opens cal.com/qamar/30min.
- **Demo URL**: `SITE.demoUrl` in `lib/seo.ts` points to
  https://demo.gravixar.com. Display text in prose stays as
  "demo.gravixar.com" even when SITE.demoUrl temporarily points at
  the .vercel.app fallback (was used during DNS migration).
- **AI in critical path = false**. SEO agent fails open: if API key
  unset or call times out, drafts skip, the workflow continues. Same
  rule applies to any future AI integrations.
- **Email is currently silent**: Resend free tier allows 1 domain
  (already used by Broomstick). Form submissions go to Vercel Blob
  only; check /admin to triage. To enable email later: separate
  Resend account or Pro upgrade.

## Key memory references

User memory lives in
`C:\Users\zaigu\.claude\projects\C--dev-gravixar-ai\memory\`:

- `MEMORY.md` — index of all memory files
- `user_qamar.md` — user profile + brand positioning
- `project_gravixar_marketing_location.md` — canonical paths
- `project_gravixar_demo.md` — demo project context
- `project_gravixar_locked_decisions.md` — pre-decided choices
- `feedback_periodic_sync_marketing.md` — sync against bs-hub/Beeline
- `feedback_light_mode_deferred.md` — light mode pushback
- `feedback_no_background_dev_server.md` — don't run `next dev` in bg
- `feedback_shell_powershell.md` — Windows shell conventions

Always read these at session start when relevant to the task.

## Sister projects (read-only context)

- **bs-hub** at `C:\Users\zaigu\OneDrive\Desktop\Google Antigravity\bs-hub`
  — agency portal, in production at broomstickhub.com. Read
  `NON_TECHNICAL_OVERVIEW.md` and `STATUS.md` before writing
  marketing copy that references it.
- **Beeline** at `C:\dev\beeline-medical` — healthcare ops platform,
  private beta. Read `STATUS.md` for current module state.
- **gravixar-demo** at `C:\dev\gravixar-demo` — demo.gravixar.com.
  Don't import code from it; read its `AGENTS.md` if you're working
  on it.

## When deploying

- Vercel auto-deploys on every push to `main`
- Env var changes require a manual redeploy
- DNS migration is **complete** (Vercel nameservers, Cloudflare
  removed). Don't touch DNS without good reason.
