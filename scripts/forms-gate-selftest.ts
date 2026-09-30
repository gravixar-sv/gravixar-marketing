// Build-time gate for the anti-bot gate on the four public lead forms
// (src/lib/form-gate.ts). Runs in prebuild. Every case calls the real route
// handler in-process with the network stubbed (./route-harness.ts), so nothing
// is sent and nothing is stored.
//
// What must hold, per route:
//   - a filled honeypot, a too-fast form and a stale form all get the silent
//     `{ ok: true }`, even when the rest of the body is junk. That proves the
//     gate runs BEFORE the schema, which is the point: every schema caps
//     `website` at zero characters, so the old post-parse honeypot check could
//     never run and a bot got a 400 naming the field;
//   - a form rendered a few seconds ago, and a client that sends no `ts` at
//     all (a cached old bundle, or Bosun's chat handoff), still reach the
//     schema;
//   - `te`, how long the form was open on the browser's own clock, decides
//     the time trap when it is usable: a device clock 10 minutes fast no
//     longer drops a real fill, and an instant `te` trips even with an old
//     `ts`. An unusable `te` is ignored and `ts` decides;
//   - a trip sends no email and writes nothing.

import {
  call,
  check,
  finish,
  isolateEnv,
  jsonRequest,
  multipartRequest,
  net,
  stubNetwork,
  type Outcome,
} from "./route-harness";

isolateEnv();
stubNetwork();

type Handler = (req: Request) => Promise<Response>;

async function main() {
  const routes: { name: string; path: string; POST: Handler; multipart: boolean }[] = [
    { name: "lead", path: "/api/lead", POST: (await import("../src/app/api/lead/route")).POST, multipart: false },
    {
      name: "service-inquiry",
      path: "/api/service-inquiry",
      POST: (await import("../src/app/api/service-inquiry/route")).POST,
      multipart: false,
    },
    {
      name: "early-access",
      path: "/api/early-access",
      POST: (await import("../src/app/api/early-access/route")).POST,
      multipart: false,
    },
    {
      name: "job-application",
      path: "/api/job-application",
      POST: (await import("../src/app/api/job-application/route")).POST,
      multipart: true,
    },
  ];

  const HOUR = 3_600_000;

  for (const r of routes) {
    // Junk on purpose: an empty `email` fails every one of these schemas, so a
    // 200 can only come from the gate, and a 400 means the schema was reached.
    const send = (extra: Record<string, string | number>): Promise<Outcome> => {
      const fields = { email: "", ...extra };
      const req = r.multipart
        ? multipartRequest(r.path, Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, String(v)])))
        : jsonRequest(r.path, fields);
      return call(r.POST, req);
    };
    const silent = (o: Outcome) => o.status === 200 && o.json?.ok === true && !("id" in (o.json ?? {}));
    const tripped = (o: Outcome, reason: string) => o.logs.some((l) => l.includes(`[${r.name}] anti-bot gate tripped: ${reason}`));
    const reachedSchema = (o: Outcome) => o.status === 400 && o.json?.error === "invalid";

    const sends = net.resendCalls;

    const honeypot = await send({ website: "https://spam.example", ts: Date.now() - 10_000 });
    check(silent(honeypot) && tripped(honeypot, "honeypot_filled"), `${r.name}: filled website honeypot -> silent 200 before the schema`, honeypot);

    const hp = await send({ hp_website: "https://spam.example", website: "", ts: Date.now() - 10_000 });
    check(silent(hp) && tripped(hp, "honeypot_filled"), `${r.name}: filled hp_website honeypot -> silent 200`, hp);

    const both = await send({ hp_website: "", website: "https://spam.example", ts: Date.now() - 10_000 });
    check(silent(both) && tripped(both, "honeypot_filled"), `${r.name}: an empty hp_website does not hide a filled website`, both);

    const fast = await send({ website: "", ts: Date.now() });
    check(silent(fast) && tripped(fast, "ts_too_fast"), `${r.name}: form sent under 2s after render -> silent 200`, fast);

    const stale = await send({ website: "", ts: Date.now() - 25 * HOUR });
    check(silent(stale) && tripped(stale, "ts_stale"), `${r.name}: form rendered over 24h ago -> silent 200`, stale);

    const junkTs = await send({ website: "", ts: "yesterday" });
    check(silent(junkTs) && tripped(junkTs, "ts_invalid"), `${r.name}: unreadable ts -> silent 200`, junkTs);

    const human = await send({ website: "", ts: Date.now() - 10_000 });
    check(reachedSchema(human), `${r.name}: form rendered 10s ago -> passes the gate, reaches the schema`, human);

    const legacy = await send({});
    check(reachedSchema(legacy), `${r.name}: no ts and no honeypot (old bundle, Bosun) -> reaches the schema`, legacy);

    // `te`. The forms send it from the kit's createFormClock(). A device
    // clock 10 minutes fast puts `ts` in the server's future, so `ts` alone
    // reads a 30-second fill as too fast and drops the lead.
    const aheadTs = Date.now() + 10 * 60_000;
    const skewTsOnly = await send({ website: "", ts: aheadTs });
    check(silent(skewTsOnly) && tripped(skewTsOnly, "ts_too_fast"), `${r.name}: clock 10 min fast, ts alone -> dropped (why te exists)`, skewTsOnly);

    const skew = await send({ website: "", ts: aheadTs, te: 30_000 });
    check(reachedSchema(skew), `${r.name}: clock 10 min fast, te 30s -> reaches the schema`, skew);

    const instant = await send({ website: "", ts: Date.now() - 10_000, te: 400 });
    check(silent(instant) && tripped(instant, "ts_too_fast"), `${r.name}: te under 2s -> silent 200, even with a 10s-old ts`, instant);

    const oldTab = await send({ website: "", ts: Date.now() - 72 * HOUR, te: 72 * HOUR });
    check(reachedSchema(oldTab), `${r.name}: a tab open for 3 days -> reaches the schema (no staleness on te)`, oldTab);

    const teOnly = await send({ website: "", te: 500 });
    check(silent(teOnly) && tripped(teOnly, "ts_too_fast"), `${r.name}: te alone arms the trap`, teOnly);

    const badTe = await send({ website: "", ts: Date.now(), te: "-5" });
    check(silent(badTe) && tripped(badTe, "ts_too_fast"), `${r.name}: an unusable te is ignored and ts decides`, badTe);

    check(net.resendCalls === sends, `${r.name}: no email sent by any of these`);
  }

  // The forms send `ts` and `te`, as strings (the kit's createFormClock()).
  // The JSON schemas are plain z.object, which strips unknown keys, so a real
  // submission still validates and neither reaches the stored record or HQ.
  // (/api/job-application builds its payload field by field, so they never
  // reach its schema at all.)
  const { leadSchema } = await import("../src/lib/lead");
  const { serviceInquirySchema } = await import("../src/lib/service-inquiry");
  const { earlyAccessSchema } = await import("../src/lib/early-access");
  const gateKeys = { website: "", hp_website: "", ts: String(Date.now() - 10_000), te: "10000" };
  const message = "Client approvals live in three email threads and nobody knows which one was signed off.";
  const real = [
    { name: "lead", schema: leadSchema, body: { name: "Test Visitor", email: "visitor@example.com", message } },
    {
      name: "service-inquiry",
      schema: serviceInquirySchema,
      body: { name: "Test Visitor", email: "visitor@example.com", message, sourcePage: "/services/ai-tooling" },
    },
    { name: "early-access", schema: earlyAccessSchema, body: { email: "visitor@example.com" } },
  ];
  for (const { name, schema, body } of real) {
    const parsed = schema.safeParse({ ...body, ...gateKeys });
    check(
      parsed.success && !("ts" in parsed.data) && !("te" in parsed.data) && !("hp_website" in parsed.data),
      `${name}: a real submission with ts and te validates, and neither is kept`,
      parsed.success ? Object.keys(parsed.data) : parsed.error.issues,
    );
  }
}

main()
  .then(() => finish("forms gate selftest"))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
