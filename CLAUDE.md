# CLAUDE.md — gravixar-marketing (local: `gravixar-ai`)

Loaded into context for every Claude Code session in this repo. Project-specific overrides only; cross-project conventions live in `~/.claude/CLAUDE.md` (the operator's user-level config).

## Truth-source

**State of this project lives in `C:\dev\gravixar-hq\brain\projects\gravixar-marketing.md`.** Read that first — `## Hand-written: engagement state`, ship log, open questions, deploy posture are all there. The cron-managed sections cover technical state + recent commits.

For "why is X like this?", read `C:\dev\gravixar-hq\brain\ledgers\decisions.md` and `infra.md`.

Per-repo `STATE.md` is **retired** (see [brain-canonical-truth decision](https://github.com/gravixar-sv/gravixar-hq/blob/main/brain/ledgers/decisions.md)). Don't recreate it.

## What this repo is

`gravixar-ai` (local path) is **gravixar.com** (deployed) — Qamar's personal brand + services marketing site. Next 16 + Tailwind v4 + MDX (git-as-CMS) + Vercel Blob lead capture + Resend transactional email + Vercel AI Gateway (SEO agent on cron).

Lead capture is the funnel surface: `/contact`, `/early-access`, `/services/<slug>` all write JSONL to the shared `gravixar-blob` store, which HQ's `/api/cron/sync-leads` pulls into HQ Inbox every 15 minutes.

## Inviolable rules

1. **All MDX frontmatter is zod-validated.** `prebuild` script fails the build on bad frontmatter. Don't add a content kind without updating `src/content/schema.ts` AND the validator's SECTIONS array.
2. **Never read `process.env` outside `src/lib/env.ts`** — that file is the single zod-validated entry point.
3. **AI is never in the critical path.** SEO agent fails open: missing key or timeout → skip the draft, log a warning, continue. Same rule for any future AI integrations.
4. **No em-dashes in marketing copy.** LLM-detection signal; use commas or periods.
5. **First-person ("I"), never "we".** Locked tone.

## Conventions

- **Branches**: `feat/DDMMYY-HHMM-mkt` / `fix/...` / `chore/...` (date+time + repo tag). One PR per concern. Squash-merge.
- **Commits**: terse subject (< ~70 chars) + bullet body explaining why. Voice matches site copy. AI-assisted: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- **Git identity** (repo has no `user.name`/`user.email` — don't run `git config --global`): use `git -c user.name=Qamar -c user.email=gravixar@gmail.com commit ...` or env vars.
- **Client names**: genericized in marketing copy unless explicit permission given. Logos OK in marquee + cover images.

## Local dev

```powershell
cd C:\dev\gravixar-ai
pnpm install
pnpm dev   # http://localhost:3300
```

Port pinned to 3300 (avoids bs-hub on 3000, beeline on 3030, demo on 3400, hq on 3500).

## Common gotchas

- **`pnpm lint` is broken** — Next 16 deprecated `next lint`. Rely on TypeScript + `pnpm prebuild` (content validation) + `pnpm build`.
- **No background dev server** — don't `pnpm dev &`. Foreground only.
- **PowerShell command chaining**: `;` not `&&`.
- **Email is live** on `mail.gravixar.com` (separate Resend account from Broomstick's). Form submissions trigger both a Blob append AND a Resend send; both best-effort.
- **BotID is warn-only** on lead routes until Vercel Bot Protection is enabled (paid).

## When in doubt

- Read `C:\dev\gravixar-hq\brain\projects\gravixar-marketing.md` for current state.
- Read `C:\dev\gravixar-hq\brain\ledgers\decisions.md` for locked decisions.
- Cross-reference HQ for the lead-pipeline contracts (`brain/projects/gravixar-hq.md`, `src/lib/leads/marketing-blob.ts`).
