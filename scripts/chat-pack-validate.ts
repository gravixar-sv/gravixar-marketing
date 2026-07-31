// Build-time gate for Bosun's answer bank. Runs in prebuild, after the content
// validator, and fails the build rather than the request.
//
// It checks three things that are cheap here and expensive in production:
//   1. The pack assembles at all, which means every frontmatter key in every
//      content file is CLASSIFIED. An unclassified key throws with the file
//      name, so adding a field nobody meant Bosun to read cannot ship quietly.
//   2. Pack invariants: unique ids, no empty answers, real internal hrefs, and
//      no em dashes in anything Bosun will repeat verbatim.
//   3. The fixture table. Every case is a phrasing somebody will actually type
//      and an expectation about what Bosun does with it. This is where the
//      mandate stops being prose and starts being a test.

import { getPack, validatePack } from "../src/lib/chat/pack";
import { classify, assertSendable, ROUTE_COPY } from "../src/lib/chat/gate";
import {
  DEFAULT_OPENER,
  DISCLOSURE,
  HANDOFF,
  IDENTITY_ANSWER,
  OPENERS,
} from "../src/lib/chat/persona";
import { REFUSALS } from "../src/lib/chat/refusals";
import cases from "../src/lib/chat/fixtures.json";

type Fixture = {
  input: string;
  expect: string;
  detail?: string;
  why: string;
};

async function main() {
  const { entries, terms } = await validatePack();
  console.log(`[chat-pack] assembled ${entries} entries, ${terms} in-domain terms.`);

  const pack = await getPack();
  const failures: string[] = [];

  for (const f of cases as Fixture[]) {
    const result = classify(f.input, pack, { consecutiveMisses: 0 });

    if (result.kind !== f.expect) {
      failures.push(
        `  "${f.input}"\n    expected ${f.expect}, got ${result.kind}\n    why it matters: ${f.why}`,
      );
      continue;
    }

    if (f.detail) {
      const actual =
        result.kind === "refusal"
          ? result.reason
          : result.kind === "escalate"
            ? result.trigger
            : result.kind === "route"
              ? result.route
              : result.kind === "answer"
                ? result.entryId
                : "";
      // Answer ids are checked by prefix, so adding a service does not churn
      // the fixture table.
      const ok = f.expect === "answer" ? actual.startsWith(f.detail) : actual === f.detail;
      if (!ok) {
        failures.push(
          `  "${f.input}"\n    expected ${f.expect}:${f.detail}, got ${f.expect}:${actual}\n    why it matters: ${f.why}`,
        );
        continue;
      }
    }

    // Everything Bosun would send has to survive the outgoing filter.
    try {
      assertSendable(result.text, pack);
    } catch (err) {
      failures.push(`  "${f.input}"\n    outgoing text rejected: ${(err as Error).message}`);
    }
  }

  // Every published answer must also be sendable, or the pack contains
  // something Bosun can never actually say.
  for (const entry of pack.entries) {
    try {
      assertSendable(entry.answer, pack);
    } catch (err) {
      failures.push(`  pack entry ${entry.id}\n    ${(err as Error).message}`);
    }
  }

  // MANDATE CLAUSE 4, as a test rather than a hope. Bosun's OWN words are only
  // ever the constants in persona.ts and refusals.ts, so those are the strings
  // that must never impersonate Qamar or speak for the business. Published copy
  // is exempt because it is rendered attributed, as a quotation, which is what
  // makes its first person safe.
  const OWN_WORDS: [string, string][] = [
    ["DISCLOSURE", DISCLOSURE],
    ["IDENTITY_ANSWER", IDENTITY_ANSWER],
    ["DEFAULT_OPENER", DEFAULT_OPENER],
    ...Object.entries(OPENERS),
    ...Object.entries(REFUSALS),
    ...Object.entries(HANDOFF),
    ...Object.entries(ROUTE_COPY),
  ];

  // "we/our/us" in the business sense, and any claim to have done the work.
  const PLURAL = /\b(we|our|ours|us)\b/i;
  const BUILD_CLAIM =
    /\bI\s+(built|build|made|make|run|ran|shipped|ship|deliver|delivered|maintain|own|manage)\b/i;

  for (const [name, text] of OWN_WORDS) {
    if (PLURAL.test(text)) {
      failures.push(
        `  constant ${name}\n    uses first person plural, which this site does not: ${text.slice(0, 90)}`,
      );
    }
    if (BUILD_CLAIM.test(text)) {
      failures.push(
        `  constant ${name}\n    claims to have done the work, which is Qamar's, not Bosun's: ${text.slice(0, 90)}`,
      );
    }
  }

  if (failures.length > 0) {
    console.error(`\n[chat-pack] ${failures.length} failing case(s):\n`);
    console.error(failures.join("\n\n"));
    console.error(
      `\nThe fixtures are the mandate. If a change here is intentional, change the`,
      `\nfixture and say why in the same commit.\n`,
    );
    process.exit(1);
  }

  console.log(`[chat-pack] OK, ${(cases as Fixture[]).length} gate fixtures passed.`);
}

main().catch((err) => {
  console.error(`[chat-pack] ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
