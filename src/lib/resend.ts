import { createResendMailer } from "@gravixar-sv/core/email";
import { env } from "./env";

// The client comes from the fleet mailer (@gravixar-sv/core/email): a lazy
// singleton that fails open, so with no RESEND_API_KEY getResend() returns
// null and each caller decides what that means (request-code answers 503; the
// lead routes skip the notification). Core reads the key itself, under the
// SDK's own name, which env.ts still declares and validates.
//
// The addresses are this site's policy, so they still come through env.ts,
// the one place this repo reads process.env, rather than through core's
// fromEnv override. The result is the same sender as before.
//
// The client is the plain Resend SDK, and a send that fails RETURNS
// `{ error }` rather than throwing. Read it where the send matters (see
// src/app/api/book/request-code/route.ts).
const mailer = createResendMailer({
  // Default From: address uses the verified mail.gravixar.com subdomain.
  // Override via RESEND_FROM_EMAIL env if a different sender is needed.
  from: env.RESEND_FROM_EMAIL ?? "Gravixar <leads@mail.gravixar.com>",
});

export const getResend = mailer.getResend;
export const FROM_EMAIL = mailer.fromEmail;
export const NOTIFY_EMAIL = env.LEAD_NOTIFY_EMAIL ?? "gravixar@gmail.com";
