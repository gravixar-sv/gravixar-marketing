# gravixar-ai

Personal brand site and services marketing platform for [gravixar.com](https://gravixar.com).

Working demonstration of AI-augmented business operations consulting — the site itself runs the systems being sold. Visitors see proof, not promises.

## Stack

- Next.js 16 App Router, React 19, TypeScript strict
- Tailwind CSS v4
- MDX content (git-as-CMS), zod-validated frontmatter
- Resend (transactional email), Vercel Blob (lead log), Anthropic SDK (AI agents — not in first pass)
- Vercel Functions (Fluid Compute), `vercel.ts` config

## Local dev

Prerequisites: Node 20+, pnpm 9+, Vercel CLI (`npm i -g vercel`).

```powershell
cd "C:\dev\gravixar-ai"
pnpm install
pnpm dev
```

Open http://localhost:3300 — or http://gravixar.localhost:3300 for a labeled tab (browsers auto-resolve `*.localhost` to 127.0.0.1, no `/etc/hosts` edit needed).

**Port pinning.** Gravixar is pinned to **3300** so it can run alongside other Next.js projects (e.g. bs-hub on 3000) without collision. Change the port in `package.json` if you need to.

## Content

All content is MDX under `content/`. Frontmatter is validated by zod schemas in `src/content/schema.ts`.

- `content/home/` — homepage hero + proof block
- `content/services/` — the 4 service pages
- `content/blog/` — blog posts (drafts in `_drafts/`, never shipped)
- `content/case-studies/` — case studies (drafts in `_drafts/`)
- `content/graphics/` — gallery items

To scaffold a new post: not yet built — write the file by hand for now.

## Validate content

```powershell
pnpm validate:content
```

Runs zod over every MDX frontmatter. Wired into `prebuild`, so a bad file will fail the production build before anything deploys.

## Deployment

Two Vercel projects on the same team:

1. `gravixar-marketing` (this repo) → `gravixar.com`
2. `gravixar-demo` (forked bs-hub) → `demo.gravixar.com` — read-only sandbox, weekly seed reset

The marketing site links out to the demo subdomain; it does not import any bs-hub code.

## AI SEO agent

Two entry points, same generation logic in `src/lib/ai/seo-agent.ts`:

- **Local (preferred while iterating):** `pnpm seo:draft "topic seed"` writes a draft to `content/blog/_drafts/{date}-{slug}.mdx`. Edit it in your editor, `git mv` it out of `_drafts/` to publish, flip `draft: false`.
- **Production cron:** `/api/cron/seo-agent` runs Tue + Fri at 14:00 UTC (configured in `vercel.ts`). Drafts go to Vercel Blob and an email lands in your inbox with the full body inlined. Nothing publishes without you committing.

Routes through the **Vercel AI Gateway** — model strings like `"anthropic/claude-sonnet-4-6"` so providers swap with one line. Set `AI_GATEWAY_API_KEY` in env.

## What's NOT built yet (intentional)

- Case-study auto-drafter (next module — same pattern as the SEO agent)
- Social syndication queue (LinkedIn/X drafts on publish, requires approval)
- Demo subdomain (separate repo)
- An admin UI for browsing/promoting drafts in production (current flow is email + manual git)
