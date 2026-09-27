// Build-time gate for the lead append (src/lib/pii-blob.ts). Runs in prebuild
// and fails the build rather than losing a lead in production.
//
// The append is the one piece of the private-store move that decides whether
// a lead survives two people submitting at once. The old one read the month
// file, added a line and wrote the whole file back, so a second writer that
// had read the same version erased the first writer's lead. This runs the new
// one against a store that misbehaves on purpose:
//   1. writers interleave, so reads and writes race;
//   2. reads sometimes come back STALE, the way a CDN copy trails a write;
//   3. a write can land and still throw, the way a lost response looks;
//   4. a store that refuses every write must make the append give up loudly.
// Every run is seeded, so a failure here is a real regression, not a flake.
// The platform's side of the bargain (ETag checks, create-only writes, origin
// reads) is proved on the real store by HQ's /settings/pii-blob self-test.

import { appendLineWith, type ConditionalStore } from "../src/lib/pii-blob";

// Seeded PRNG (mulberry32), installed over Math.random so the append's own
// backoff jitter is deterministic too.
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Version {
  text: string;
  etag: string;
}

// Yield to the event loop a seeded number of times. setImmediate has no clock
// in it, so with Math.random seeded the whole interleaving replays exactly:
// a seed that fails here fails every time, on every machine.
async function yieldTurns(max: number): Promise<void> {
  const turns = Math.floor(Math.random() * (max + 1));
  for (let i = 0; i < turns; i++) await new Promise<void>((r) => setImmediate(r));
}

class FlakyStore implements ConditionalStore {
  files = new Map<string, Version[]>();
  staleRate = 0;
  loseNextResponse = false;
  refuseAll = false;

  private tick() {
    return yieldTurns(3);
  }

  async read(pathname: string) {
    await this.tick();
    const versions = this.files.get(pathname);
    if (!versions || versions.length === 0) return null;
    if (versions.length > 1 && Math.random() < this.staleRate) {
      return versions[Math.floor(Math.random() * (versions.length - 1))]!;
    }
    return versions[versions.length - 1]!;
  }

  async write(pathname: string, body: string, ifMatch: string | null) {
    await this.tick();
    if (this.refuseAll) throw new Error("precondition failed (refuseAll)");
    const versions = this.files.get(pathname) ?? [];
    const current = versions[versions.length - 1];
    if (ifMatch === null && current) throw new Error("blob already exists");
    if (ifMatch !== null && current?.etag !== ifMatch) throw new Error("precondition failed");
    versions.push({ text: body, etag: `v${versions.length + 1}` });
    this.files.set(pathname, versions);
    if (this.loseNextResponse) {
      this.loseNextResponse = false;
      throw new Error("response lost after the write landed");
    }
    return { url: pathname };
  }

  lines(pathname: string): string[] {
    const versions = this.files.get(pathname) ?? [];
    return (versions[versions.length - 1]?.text ?? "").split("\n").filter((l) => l.length > 0);
  }
}

const failures: string[] = [];

// The append's own backoff, scaled from hundreds of milliseconds to a few
// event-loop turns, and growing with the attempt the same way, so contention
// still spreads out the way it does in production.
const fastWait = (attempt: number) => yieldTurns(Math.min(16, 2 ** attempt));
function check(ok: boolean, name: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failures.push(name);
}

const lead = (i: number) => JSON.stringify({ id: `lead-${i}`, email: `p${i}@example.com` });

async function run(seed: number): Promise<void> {
  Math.random = seeded(seed);

  {
    const s = new FlakyStore();
    await appendLineWith(s, "leads/2026-10.jsonl", lead(1), fastWait);
    await appendLineWith(s, "leads/2026-10.jsonl", lead(2), fastWait);
    check(s.lines("leads/2026-10.jsonl").join("|") === `${lead(1)}|${lead(2)}`, `seed ${seed}: sequential appends keep order`);
  }

  {
    const s = new FlakyStore();
    const n = 6;
    await Promise.all(Array.from({ length: n }, (_, i) => appendLineWith(s, "leads/2026-10.jsonl", lead(i), fastWait)));
    const got = s.lines("leads/2026-10.jsonl");
    check(got.length === n && new Set(got).size === n, `seed ${seed}: ${n} racing first-of-month writers all land once`);
  }

  {
    const s = new FlakyStore();
    await appendLineWith(s, "leads/2026-10.jsonl", lead(0), fastWait);
    s.staleRate = 0.5;
    const n = 6;
    await Promise.all(Array.from({ length: n }, (_, i) => appendLineWith(s, "leads/2026-10.jsonl", lead(i + 1), fastWait)));
    const got = s.lines("leads/2026-10.jsonl");
    check(got.length === n + 1 && new Set(got).size === n + 1, `seed ${seed}: stale reads never erase a lead`);
  }

  {
    const s = new FlakyStore();
    await appendLineWith(s, "leads/2026-10.jsonl", lead(0), fastWait);
    s.loseNextResponse = true;
    await appendLineWith(s, "leads/2026-10.jsonl", lead(1), fastWait);
    const got = s.lines("leads/2026-10.jsonl");
    check(got.length === 2, `seed ${seed}: a lost response does not duplicate the lead`);
  }

  {
    const s = new FlakyStore();
    const miss = JSON.stringify({ day: "2026-10-01", sourcePage: "/", misses: ["price?"], turns: 1 });
    await appendLineWith(s, "chat-misses/2026-10.jsonl", miss, fastWait);
    await appendLineWith(s, "chat-misses/2026-10.jsonl", miss, fastWait);
    check(s.lines("chat-misses/2026-10.jsonl").length === 2, `seed ${seed}: identical chat misses from two visitors both count`);
  }

  {
    const s = new FlakyStore();
    await appendLineWith(s, "leads/2026-10.jsonl", lead(0), fastWait);
    s.refuseAll = true;
    let threw = false;
    try {
      await appendLineWith(s, "leads/2026-10.jsonl", lead(1), fastWait);
    } catch {
      threw = true;
    }
    check(threw, `seed ${seed}: a store that refuses every write makes the append throw`);
  }
}

async function main() {
  const realRandom = Math.random;
  for (const seed of [1, 7, 42, 2026]) await run(seed);
  Math.random = realRandom;
  if (failures.length > 0) {
    console.error(`\npii-blob selftest: ${failures.length} failure(s)`);
    process.exit(1);
  }
  console.log("\npii-blob selftest: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
