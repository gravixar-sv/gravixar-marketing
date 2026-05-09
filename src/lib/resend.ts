import { Resend } from "resend";
import { env } from "./env";

let _client: Resend | null = null;

export function getResend(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (!_client) _client = new Resend(env.RESEND_API_KEY);
  return _client;
}

// Default From: address uses the verified mail.gravixar.com subdomain.
// Override via RESEND_FROM_EMAIL env if a different sender is needed.
export const FROM_EMAIL =
  env.RESEND_FROM_EMAIL ?? "Gravixar <leads@mail.gravixar.com>";
export const NOTIFY_EMAIL = env.LEAD_NOTIFY_EMAIL ?? "gravixar@gmail.com";
