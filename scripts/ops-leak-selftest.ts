// Build-time gate for the Ops Leak calculator. Runs in prebuild.
//
// What must hold:
//   - the arithmetic: rows round to 10 and the total is their sum, so the
//     column adds up by hand; the range sits either side of the total; the
//     top leaks are the costliest, largest first, at most three;
//   - the schema refuses what the page cannot send (more people on a leak
//     than on the team, a 41-hour leak, a tool not on the list);
//   - the PDF renders in every currency, including a team with no hours and
//     one with every tool ticked;
//   - the route, in-process with the network stubbed (./route-harness.ts):
//     a real submission emails the visitor a PDF and notifies me; the
//     visitor's email and PDF carry nothing the visitor typed; a failed send
//     is a 502 the visitor sees, never a false success;
//   - no em or en dash in anything the calculator writes.

import { call, check, finish, isolateEnv, jsonRequest, net, stubNetwork } from "./route-harness";

isolateEnv();
stubNetwork();

const DASH = /[\u2013\u2014]/;

async function main() {
  const {
    EXAMPLE,
    CURRENCY_CODES,
    TOOLS,
    calcInputSchema,
    calculatorRequestSchema,
    compute,
    roundNice,
    summarise,
  } = await import("../src/lib/ops-leak");
  const { renderBreakdownPdf } = await import("../src/lib/ops-leak-pdf");

  // ---- Arithmetic
  const r = compute(EXAMPLE);
  check(r.rows.every((row) => row.monthlyCost % 10 === 0), "every row rounds to 10", r.rows);
  check(r.monthlyCost === r.rows.reduce((s, row) => s + row.monthlyCost, 0), "the total is the sum of the rounded rows", r);
  check(r.low < r.monthlyCost && r.monthlyCost < r.high, "the range sits either side of the total", r);
  check(
    r.top.length <= 3 && r.top.every((row, i) => i === 0 || (r.top[i - 1]?.monthlyCost ?? 0) >= row.monthlyCost),
    "top leaks: at most three, largest first",
    r.top,
  );
  // 3 people x 2h = 6h; 6 x 52/12 x 35 = 910 exactly.
  check(r.rows.find((row) => row.key === "status")?.monthlyCost === 910, "status row: 3 x 2h at £35 is £910 a month", r.rows);

  const zero = compute({
    ...EXAMPLE,
    leaks: {
      status: { people: 0, hours: 0 },
      approvals: { people: 4, hours: 0 },
      rekeying: { people: 0, hours: 3 },
      searching: { people: 0, hours: 0 },
    },
  });
  check(zero.monthlyCost === 0 && zero.top.length === 0 && zero.low === 0, "no hours: no cost, no top leaks", zero);

  check(roundNice(3099.75) === 3100 && roundNice(5166) === 5200 && roundNice(64) === 60 && roundNice(0) === 0, "roundNice keeps two significant figures");
  check(roundNice(123456) === 120000, "roundNice on a large figure", roundNice(123456));

  // ---- Schema
  check(calcInputSchema.safeParse(EXAMPLE).success, "the example team validates");
  const tooMany = { ...EXAMPLE, leaks: { ...EXAMPLE.leaks, status: { people: 13, hours: 2 } } };
  check(!calcInputSchema.safeParse(tooMany).success, "refuses more people on a leak than on the team");
  const tooLong = { ...EXAMPLE, leaks: { ...EXAMPLE.leaks, status: { people: 2, hours: 41 } } };
  check(!calcInputSchema.safeParse(tooLong).success, "refuses a leak over 40 hours a person");
  check(!calcInputSchema.safeParse({ ...EXAMPLE, tools: ["Click here: spam.example"] }).success, "refuses a tool not on the list");
  check(!calcInputSchema.safeParse({ ...EXAMPLE, currency: "EUR" }).success, "refuses a currency not offered");

  // ---- Copy
  const summary = summarise(EXAMPLE, r);
  check(!DASH.test(summary), "the HQ summary has no em or en dash", summary);
  check(summary.length >= 20 && summary.length <= 4000, "the HQ summary fits the service-inquiry message bounds", summary.length);

  // ---- PDF
  for (const currency of CURRENCY_CODES) {
    const pdf = await renderBreakdownPdf({ ...EXAMPLE, currency, tools: [...TOOLS] }, new Date("2026-10-10T09:00:00Z"));
    const head = Buffer.from(pdf.slice(0, 5)).toString("latin1");
    check(head === "%PDF-" && pdf.length < 200_000, `PDF renders in ${currency} with every tool ticked`, { head, bytes: pdf.length });
  }
  const empty = await renderBreakdownPdf(
    { ...EXAMPLE, leaks: { status: { people: 0, hours: 0 }, approvals: { people: 0, hours: 0 }, rekeying: { people: 0, hours: 0 }, searching: { people: 0, hours: 0 } } },
    new Date(),
  );
  check(Buffer.from(empty.slice(0, 5)).toString("latin1") === "%PDF-", "PDF renders for a team with no hours");

  // ---- Route
  const { POST } = await import("../src/app/api/ops-leak-calculator/route");
  const NAME = "Visit spam.example now";
  const COMPANY = "Cheap pills Ltd";
  const body = {
    name: NAME,
    email: "visitor@example.com",
    company: COMPANY,
    inputs: EXAMPLE,
    website: "",
    ts: String(Date.now() - 60_000),
    te: "60000",
    source: "calculator:linkedin",
  };

  net.reply = () => Response.json({ id: "selftest-email-id" }, { status: 200 });
  net.resendBodies = [];
  const ok = await call(POST, jsonRequest("/api/ops-leak-calculator", body));
  check(ok.status === 200 && ok.json?.ok === true && typeof ok.json?.id === "string", "a real submission answers ok with an id", ok);
  check(net.resendBodies.length === 2, "two emails: the visitor's PDF and my notification", net.resendBodies.length);

  const toVisitor = net.resendBodies.find((b) => JSON.stringify(b.to).includes("visitor@example.com"));
  const toMe = net.resendBodies.find((b) => b !== toVisitor);
  const attachments = (toVisitor?.attachments ?? []) as { filename?: string; content?: string }[];
  check(attachments.length === 1 && attachments[0]?.filename === "ops-leak-estimate.pdf", "the visitor's email carries the PDF", attachments.map((a) => a.filename));

  const pdfText = attachments[0]?.content ? Buffer.from(attachments[0].content, "base64").toString("latin1") : "";
  const visitorText = JSON.stringify({ subject: toVisitor?.subject, html: toVisitor?.html, text: toVisitor?.text });
  check(
    !visitorText.includes(NAME) && !visitorText.includes(COMPANY) && !pdfText.includes("spam.example") && !pdfText.includes("pills"),
    "nothing the visitor typed reaches their email or the PDF",
  );
  check(!DASH.test(visitorText), "the visitor's email has no em or en dash");
  check(
    JSON.stringify(toMe ?? {}).includes(NAME) && String(toMe?.subject ?? "").startsWith("Calculator:"),
    "my notification names the visitor",
    toMe?.subject,
  );

  net.reply = () => Response.json({ name: "validation_error", message: "selftest rejection" }, { status: 422 });
  net.resendBodies = [];
  const failed = await call(POST, jsonRequest("/api/ops-leak-calculator", body));
  check(failed.status === 502 && failed.json?.error === "send_failed", "a rejected send is a 502 the visitor sees, not a false success", failed);

  const bad = await call(POST, jsonRequest("/api/ops-leak-calculator", { ...body, inputs: tooMany }));
  check(bad.status === 400 && bad.json?.error === "invalid", "inputs the page could not send are a 400", bad.status);

  const parsed = calculatorRequestSchema.safeParse({ ...body, hp_website: "" });
  check(
    parsed.success && !("ts" in parsed.data) && !("te" in parsed.data) && !("hp_website" in parsed.data),
    "a real submission validates, and the gate fields are not kept",
  );
}

main()
  .then(() => finish("ops leak selftest"))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
