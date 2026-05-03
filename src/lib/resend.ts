import { Resend } from "resend";
import { env } from "./env";

let _client: Resend | null = null;

export function getResend(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (!_client) _client = new Resend(env.RESEND_API_KEY);
  return _client;
}

export const FROM_EMAIL = env.RESEND_FROM_EMAIL ?? "hello@gravixar.com";
export const NOTIFY_EMAIL = env.LEAD_NOTIFY_EMAIL ?? "gravixar@gmail.com";
