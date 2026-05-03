# Gravixar — Site Sections + Their Data

Smaller cousin of bs-hub's MODULES.md. Each "section" is a public route family with a content source and a small surface of components/lib.

## Section dependency graph

```
                     content/ (MDX, git-as-CMS)
                           │
                ┌──────────┼──────────┐
                ▼          ▼          ▼
            home/      services/   case-studies/  blog/   graphics/
                \          \          /            /        /
                 \          \________/____________/        /
                  \                  │                    /
                   ▼                 ▼                   ▼
            site/Navbar        SectionPage           GraphicsGallery
                                    │
                                    ▼
                              ContactCTA → /contact (Cal.com embed)
                                                   │
                                                   ▼
                                            api/lead → Resend + Blob log

  Independent (deferred):
  api/cron/seo-agent → drafts → content/blog/_drafts/
  api/cron/social-queue → LinkedIn/X drafts (review-gated)
  case-study auto-drafter → drafts → content/case-studies/_drafts/
```

## Section catalog

### `home`

**Routes:** `/`
**Content:** `content/home/hero.mdx`, `content/home/proof.mdx` + previews of services.
**Components:** `home/Hero.tsx`, `home/Proof.tsx`, `home/ServicesPreview.tsx`, `home/ContactCTA.tsx`.
**Loaders:** `loadHome()`.

### `services`

**Routes:** `/services`, `/services/[slug]`
**Content:** `content/services/{operations-infrastructure,people-ops,ai-augmented-work,graphics}.mdx`
**Schema:** `Service` — `bucket`, `deliverables[]`, `proof[]` (links to case studies + live demos), `pricing?`.
**Note:** `bucket: "graphics"` is treated as a service for routing parity, but the public-facing entry to the graphics work is `/graphics` (the gallery). The service page is for "hire me for design" framing.

### `work` (case studies)

**Routes:** `/work`, `/work/[slug]`
**Content:** `content/case-studies/*.mdx`. Drafts in `_drafts/` are never listed.
**First entry:** `bs-hub.mdx` — written by hand. Future entries may be drafted by the case-study agent into `_drafts/` and promoted on approval.

### `blog`

**Routes:** `/blog`, `/blog/[slug]`
**Content:** `content/blog/*.mdx`. Drafts in `_drafts/` are never listed; AI SEO agent writes here.
**Schema:** `BlogPost` — `aiAssisted: bool` flag is required and surfaced on the post.

### `graphics`

**Routes:** `/graphics`, `/graphics/[slug]`
**Content:** `content/graphics/*.mdx` — frontmatter references images/videos in `public/graphics/`.
**Schema:** `GraphicsItem` — `kind: "static"|"motion"|"brand"`.

### `contact`

**Routes:** `/contact`
**Components:** `lead/ContactForm.tsx` (POST → `/api/lead`), Cal.com embed (`NEXT_PUBLIC_CAL_USERNAME`).
**API:** `POST /api/lead` → Resend notification + append to Vercel Blob JSON log.

### Deferred — AI infrastructure

- `api/cron/seo-agent` — runs Tue + Fri, drafts 1-2 posts to `content/blog/_drafts/`. Approval = `git mv` to `content/blog/`.
- `api/cron/social-queue` — on publish, drafts LinkedIn + X posts to a review queue (Blob-backed JSON for now). Manual approval before send.
- Case-study auto-drafter — triggered manually with a project-artifacts pointer, drafts to `content/case-studies/_drafts/`.

These do not exist yet. Each will land as its own module in this catalog when built.
