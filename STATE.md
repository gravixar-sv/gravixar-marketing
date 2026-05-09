# STATE — gravixar-marketing (local path: gravixar-ai)

> Read first at session start. Updated on every PR.
>
> Last updated: 2026-05-09

## Live now

- `https://gravixar.com` — Next 16 + Tailwind v4 + MDX content + Vercel
  Blob lead capture + Resend transactional email + AI SEO agent on cron
- v0.4.0 launch shipped 2026-05-05; subsequent polish via PRs #9-#14
- Resend wired on `mail.gravixar.com` (separate account from Broomstick's)
- BotID warn-only on lead routes until Vercel Bot Protection is enabled

## Currently working on

- (nothing — marketing surface is in maintenance mode)

## Next session

- (TBD — driven by the program-level roadmap; see
  `gravixar-notes/STATE.md` Quick state. Phase 3 will pull marketing into
  view as HQ ↔ Marketing Bridge work begins.)

## Open PRs

- (none currently)

## Recent merges (last 7)

- 2026-05-09: PR #14 — chore: soften botid to warn-only on lead routes
- 2026-05-09: PR #13 — chore: wire Resend on mail.gravixar.com
- 2026-05-07: PR #12 — polish: home hero, you-pivot
- 2026-05-07: PR #11 — polish: ship the About-page portrait
- 2026-05-07: PR #10 — polish: footer socials + soften demo CTAs while paused
- 2026-05-07: PR #9 — polish: voice + about-page layout
- 2026-05-06: PR #8 — Checkpoint: launch-day docs

## Required env (Vercel)

| Var | Status |
|---|---|
| `RESEND_API_KEY` | required, points at the new Gravixar Resend account |
| `RESEND_FROM_EMAIL` | optional override; default `Gravixar <leads@mail.gravixar.com>` |
| `BLOB_READ_WRITE_TOKEN` | auto-injected (Blob store connected) |
| `ADMIN_TOKEN` | required for `/admin` |
| `CRON_SECRET` | required for SEO agent cron |
| `AI_GATEWAY_API_KEY` | required for SEO agent |
| `LEAD_NOTIFY_EMAIL` | optional; default `gravixar@gmail.com` |

## Outstanding marketing chores (low priority)

- Replace deprecated `next lint` (Next 16 dropped it) — `pnpm lint`
  currently errors. Either swap to `eslint .` or remove the script.
- `SITE.demoUrl` audit — confirm no stale `.vercel.app` fallback paths
  remain in prose
- Periodic content sync — bs-hub + Beeline evolve; per AGENTS.md,
  resync claims every 2-4 weeks against `STATUS.md` / `STATE.md` of
  those repos

## Blockers / decisions pending

- **Vercel Bot Protection** — currently inactive. Until enabled, lead
  routes log but don't block on `isBot=true`. Decide: pay for Bot
  Protection (paid tier) or accept warn-only indefinitely.

## Phase relevance

This surface is largely complete for V1. Active program work happens in
HQ + demo until Phase 3 (HQ ↔ Marketing Bridge), at which point HQ will
gain a preview pane + edit-via-PR flow against this repo.

## Update protocol

- End of every session: update this file as part of the same PR
- On every merge: bump "Recent merges"
