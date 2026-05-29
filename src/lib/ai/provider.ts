// Central AI model config. The SEO agent and Trend Radar both generate
// through the DIRECT Anthropic provider (billed via ANTHROPIC_API_KEY),
// not the Vercel AI Gateway. The gateway requires a credit card on file
// for the Vercel team before it services any request, so routing direct
// keeps generation working off our own Anthropic billing instead.
//
// One module so the model id lives in a single place — change it here and
// both generators pick it up.

import { createAnthropic } from "@ai-sdk/anthropic";
import { env } from "@/lib/env";

// Reads ANTHROPIC_API_KEY (validated in env.ts). Set it in the Vercel
// production env; locally it falls through to process.env for scripts.
const anthropic = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY });

// Model id preserved from the prior gateway string "anthropic/claude-sonnet-4-6"
// (the segment after "anthropic/" is the Anthropic model id, so this is the
// same model, just reached directly).
export const contentModel = anthropic("claude-sonnet-4-6");
