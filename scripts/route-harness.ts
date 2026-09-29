// Shared harness for the route selftests (scripts/*-selftest.ts). It runs a
// real Next route handler in-process, with the network stubbed so that
// nothing leaves the machine: no email is sent and no store is written.
//
// Three fences, any one of which is enough on its own:
//   1. RESEND_BASE_URL points at a `.invalid` host, which never resolves.
//   2. RESEND_API_KEY is a made-up key, so a real Resend would refuse it.
//   3. fetch is replaced. A Resend call gets the reply the case sets up; any
//      other URL is recorded and throws, and every selftest asserts that list
//      is empty.
// The store credentials are deleted, so a write that slips past a gate fails
// instead of landing. NODE_ENV is forced to "test", where botid returns HUMAN
// without a network call, even inside a Vercel production build.

export const RESEND_BASE_URL = "https://resend.selftest.invalid";

export function isolateEnv(): void {
  const env = process.env as Record<string, string | undefined>;
  env.NODE_ENV = "test";
  env.RESEND_API_KEY = "re_selftest_not_a_real_key";
  env.RESEND_BASE_URL = RESEND_BASE_URL;
  env.BOOKING_HMAC_SECRET = "selftest-hmac-secret";
  env.BOOKING_MEET_URL = "https://meet.google.com/selftest";
  for (const key of [
    "BLOB_READ_WRITE_TOKEN",
    "PII_BLOB_STORE_ID",
    "VERCEL_OIDC_TOKEN",
    "RESEND_FROM_EMAIL",
    "LEAD_NOTIFY_EMAIL",
  ]) {
    delete env[key];
  }
}

type Reply = () => Response | Promise<Response>;

export const net = {
  /** Calls that reached the stubbed Resend API. */
  resendCalls: 0,
  /** Any other URL a handler tried to reach. Must stay empty. */
  unexpected: [] as string[],
  /** What the stubbed Resend API answers. Throw to simulate a network failure. */
  reply: (() => {
    throw new Error("selftest: no Resend reply set for this case");
  }) as Reply,
};

export function stubNetwork(): void {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith(RESEND_BASE_URL)) {
      net.resendCalls += 1;
      return net.reply();
    }
    net.unexpected.push(url);
    throw new Error(`selftest: unexpected network call to ${url}`);
  }) as typeof fetch;
}

export function jsonRequest(path: string, body: unknown): Request {
  return new Request(`http://localhost:3300${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export interface Outcome {
  status: number;
  json: Record<string, unknown> | null;
  /** Everything the handler (and botid) wrote to the console. */
  logs: string[];
}

/** Call a handler with the console captured, so route logs can be asserted on
 *  and botid's development warnings stay out of the build output. */
export async function call(
  handler: (req: Request) => Promise<Response>,
  req: Request,
): Promise<Outcome> {
  const logs: string[] = [];
  const saved = { error: console.error, warn: console.warn, log: console.log, info: console.info };
  const grab = (...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  };
  console.error = grab;
  console.warn = grab;
  console.log = grab;
  console.info = grab;
  try {
    const res = await handler(req);
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    return { status: res.status, json, logs };
  } finally {
    Object.assign(console, saved);
  }
}

const failures: string[] = [];

export function check(ok: boolean, name: string, detail?: unknown): void {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) {
    if (detail !== undefined) console.log(`      got: ${JSON.stringify(detail)}`);
    failures.push(name);
  }
}

export function finish(label: string): void {
  check(net.unexpected.length === 0, "no network call left the process", net.unexpected);
  if (failures.length > 0) {
    console.error(`\n${label}: ${failures.length} failure(s)`);
    process.exit(1);
  }
  console.log(`\n${label}: ok`);
}
