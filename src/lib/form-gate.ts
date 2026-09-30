// The fleet anti-bot gate (@gravixar-sv/core/antibot) for the public lead
// forms: /api/lead, /api/service-inquiry, /api/early-access and
// /api/job-application. Three checks, all silent on a trip:
//   1. honeypot   `website` (every form's hidden input) or `hp_website`
//                 (core's name), filled means a bot;
//   2. time trap  `te`, how long the form was open in ms, measured on the
//                 browser's own clock (the kit's createFormClock()): under 2s
//                 is a bot. Without a usable `te`, `ts` (the form-render time
//                 in unix ms) is compared with the server's clock instead;
//   3. staleness  on the `ts` path only: older than 24h is a cached or
//                 replayed form.
// The forms send both. `te` is the one that decides: `ts` alone let a device
// clock running minutes fast make a real fill look too fast, and the lead was
// dropped with nothing but a log line. `ts` stays for the fallback.
// Both are optional in core, so a client that sends neither (a cached old
// bundle, or Bosun's chat handoff) is still let through by the checks above.
//
// Run it on the RAW submission, BEFORE the zod schema. Every one of these
// schemas caps `website` at zero characters, so a honeypot checked after the
// parse never ran: the bot got a 400 naming the field instead of the silent
// success. /api/book/request-code already uses this gate; there BotID blocks,
// because that route sends email to a caller-supplied address. Here BotID
// stays warn-only until Vercel Bot Protection is enabled, as before.

import {
  checkAntiBot,
  type AntiBotResult,
  type BotIdVerdict,
} from "@gravixar-sv/core/antibot";

export interface GateFields {
  hp_website?: unknown;
  website?: unknown;
  ts?: unknown;
  te?: unknown;
}

/** The gate's fields off a parsed JSON body, whatever shape it arrived in. */
export function gateFieldsFromJson(body: unknown): GateFields {
  if (!body || typeof body !== "object") return {};
  const b = body as Record<string, unknown>;
  return { hp_website: b.hp_website, website: b.website, ts: b.ts, te: b.te };
}

/** The gate's fields off a multipart body. An absent field is undefined, not
 *  null, because core treats a present `ts` as a claim to check. */
export function gateFieldsFromForm(form: FormData): GateFields {
  const get = (k: string) => form.get(k) ?? undefined;
  return { hp_website: get("hp_website"), website: get("website"), ts: get("ts"), te: get("te") };
}

/** Run the gate. Logs the reason on a trip; the caller answers the silent
 *  success and never tells the client which check tripped. */
export function gateLeadForm(
  fields: GateFields,
  bot: BotIdVerdict | null,
  route: string,
): AntiBotResult {
  // Either honeypot name counts. An empty `hp_website` must not hide a filled
  // `website`, so this is not a plain `??`.
  const honeypot =
    fields.hp_website !== undefined && fields.hp_website !== "" ? fields.hp_website : fields.website;
  const result = checkAntiBot({ hp_website: honeypot, ts: fields.ts, te: fields.te }, bot, {
    onBotIdFlag: () =>
      console.warn(`[${route}] botid flagged as bot; warn-only mode, allowing through`),
  });
  if (!result.ok) console.warn(`[${route}] anti-bot gate tripped: ${result.reason}`);
  return result;
}
