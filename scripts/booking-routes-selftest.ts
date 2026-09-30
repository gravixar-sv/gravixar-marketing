// Build-time gate for the booking routes (src/app/api/book/*). Runs in
// prebuild. Every case calls the real route handler in-process with the
// network stubbed (./route-harness.ts), so no email is sent.
//
// request-code: the Resend SDK (v6) reports a failed send as `{ error }` and
//   never throws. A rejected or unreachable send must answer 502 send_failed.
//   Before 2026-09-29 it answered `{ ok: true, token }`, and the visitor
//   waited on the verify step for a code that had never been sent.
//   The time trap in front of the send reads `te`, how long the form was open
//   on the browser's own clock, so a device clock running fast no longer
//   gets the silent empty token.
// confirm: a filled honeypot gets the silent success. Before 2026-09-29 the
//   schema rejected it first, so a bot got a 422 naming the field instead.

import { call, check, finish, isolateEnv, jsonRequest, net, stubNetwork } from "./route-harness";

isolateEnv();
stubNetwork();

async function main() {
  // Imported after the env is set: src/lib/env.ts parses process.env on load.
  const requestCode = await import("../src/app/api/book/request-code/route");
  const confirm = await import("../src/app/api/book/confirm/route");

  // A real visitor: an address, and a form rendered ten seconds ago, so the
  // anti-bot time trap in front of the send lets it through.
  const visitor = () => ({ email: "visitor@example.com", name: "Test Visitor", website: "", ts: Date.now() - 10_000 });

  {
    net.reply = () =>
      Response.json(
        { statusCode: 403, name: "validation_error", message: "The gravixar.com domain is not verified." },
        { status: 403 },
      );
    const before = net.resendCalls;
    const r = await call(requestCode.POST, jsonRequest("/api/book/request-code", visitor()));
    check(net.resendCalls === before + 1, "request-code: the send reached Resend");
    check(r.status === 502 && r.json?.error === "send_failed", "request-code: Resend rejects the send -> 502 send_failed", r);
    check(!r.json?.token, "request-code: no token handed out for an unsent code", r.json);
    check(
      r.logs.some((l) => l.includes("verification email not sent") && l.includes("validation_error")),
      "request-code: the rejection is logged with Resend's reason",
      r.logs,
    );
    check(!r.logs.some((l) => l.includes("visitor@example.com")), "request-code: the log line carries no address", r.logs);
  }

  {
    net.reply = () => {
      throw new TypeError("fetch failed");
    };
    const r = await call(requestCode.POST, jsonRequest("/api/book/request-code", visitor()));
    check(r.status === 502 && r.json?.error === "send_failed", "request-code: Resend unreachable -> 502 send_failed", r);
  }

  {
    net.reply = () => Response.json({ id: "selftest-email-id" }, { status: 200 });
    const r = await call(requestCode.POST, jsonRequest("/api/book/request-code", visitor()));
    check(
      r.status === 200 && r.json?.ok === true && typeof r.json.token === "string" && r.json.token.length > 10,
      "request-code: an accepted send still answers { ok, token }",
      r,
    );
    // src/lib/resend.ts builds its client with core's createResendMailer.
    // With RESEND_FROM_EMAIL unset, the sender is the site default, as it was
    // before the move.
    check(
      net.lastResendBody?.from === "Gravixar <leads@mail.gravixar.com>",
      "mailer: the code goes out from the default sender",
      net.lastResendBody?.from,
    );
  }

  {
    // BookCall sends `te` from the kit's createFormClock(). With a device
    // clock 10 minutes fast, `ts` alone reads a real fill as too fast: the
    // gate answers `{ ok: true, token: "" }`, no code is sent, and the
    // visitor waits on the verify step for nothing.
    net.reply = () => Response.json({ id: "selftest-email-id" }, { status: 200 });
    const ahead = { ...visitor(), ts: Date.now() + 10 * 60_000 };
    const before = net.resendCalls;
    const tsOnly = await call(requestCode.POST, jsonRequest("/api/book/request-code", ahead));
    check(
      tsOnly.json?.token === "" && net.resendCalls === before && tsOnly.logs.some((l) => l.includes("ts_too_fast")),
      "request-code: clock 10 min fast, ts alone -> empty token, no send (why te exists)",
      tsOnly,
    );
    const withTe = await call(requestCode.POST, jsonRequest("/api/book/request-code", { ...ahead, te: 30_000 }));
    check(
      withTe.status === 200 && typeof withTe.json?.token === "string" && withTe.json.token.length > 10 && net.resendCalls === before + 1,
      "request-code: clock 10 min fast, te 30s -> the code is sent",
      withTe,
    );
    const instant = await call(requestCode.POST, jsonRequest("/api/book/request-code", { ...visitor(), te: 400 }));
    check(
      instant.json?.ok === true && instant.json?.token === "" && net.resendCalls === before + 1,
      "request-code: te under 2s -> silent empty token, no send, even with a 10s-old ts",
      instant,
    );
  }

  {
    // Fail open: with no key, getResend() is null and the route says so,
    // rather than issuing a token for a code nobody will send.
    const env = process.env as Record<string, string | undefined>;
    const key = env.RESEND_API_KEY;
    delete env.RESEND_API_KEY;
    const before = net.resendCalls;
    const r = await call(requestCode.POST, jsonRequest("/api/book/request-code", visitor()));
    env.RESEND_API_KEY = key;
    check(
      r.status === 503 && r.json?.error === "email_unavailable" && net.resendCalls === before,
      "mailer: no RESEND_API_KEY -> 503 email_unavailable, nothing sent",
      r,
    );
  }

  const booking = () => ({
    name: "Test Visitor",
    email: "visitor@example.com",
    code: "123456",
    token: "selftest-not-a-real-token",
    startUtc: new Date(Date.now() + 2 * 86_400_000).toISOString(),
    website: "",
  });

  {
    const before = net.resendCalls;
    const r = await call(confirm.POST, jsonRequest("/api/book/confirm", { website: "https://spam.example" }));
    check(r.status === 200 && r.json?.ok === true, "confirm: filled honeypot on a junk body -> silent 200, not a 422", r);
    const r2 = await call(confirm.POST, jsonRequest("/api/book/confirm", { ...booking(), website: "https://spam.example" }));
    check(r2.status === 200 && r2.json?.ok === true, "confirm: filled honeypot on a full body -> silent 200 before the code check", r2);
    check(net.resendCalls === before, "confirm: a honeypot hit sends no email");
  }

  {
    const r = await call(confirm.POST, jsonRequest("/api/book/confirm", { website: "" }));
    check(r.status === 422 && r.json?.error === "invalid_input", "confirm: empty honeypot still goes through validation", r);
    const r2 = await call(confirm.POST, jsonRequest("/api/book/confirm", booking()));
    check(r2.status === 401 && r2.json?.error === "bad_code", "confirm: empty honeypot on a real body reaches the code check", r2);
  }
}

main()
  .then(() => finish("booking routes selftest"))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
