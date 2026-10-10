// Build-time gate: every route that calls checkBotId() is in the list BotID's
// browser script protects (src/lib/botid-routes.ts), and every listed route
// exists and calls it. Runs in prebuild.
//
// The failure this stops: a route with the server check and no client entry
// gets no BotID signals, so every request to it is flagged as a bot. On a route
// that blocks on BotID that drops every real visitor, silently.

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { BOTID_PROTECTED } from "../src/lib/botid-routes";

const ROOT = join(__dirname, "..");
const API = join(ROOT, "src", "app", "api");
const failures: string[] = [];

function check(ok: boolean, name: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failures.push(name);
}

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) return routeFiles(p);
    return entry === "route.ts" ? [p] : [];
  });
}

const toPath = (file: string) => "/api/" + relative(API, file).split(sep).slice(0, -1).join("/");

const checked = routeFiles(API)
  .filter((f) => /\bcheckBotId\s*\(/.test(readFileSync(f, "utf8")))
  .map(toPath);
const listed = BOTID_PROTECTED.map((p) => p.path);

for (const path of checked) {
  check(listed.includes(path), `${path} calls checkBotId() and is protected in the browser`);
}
for (const { path, method } of BOTID_PROTECTED) {
  const file = join(API, ...path.replace(/^\/api\//, "").split("/"), "route.ts");
  const src = existsSync(file) ? readFileSync(file, "utf8") : "";
  check(src.includes("checkBotId("), `${path} is listed and its route calls checkBotId()`);
  check(new RegExp(`export async function ${method}\\b`).test(src), `${path} exports the listed method ${method}`);
}
check(
  existsSync(join(ROOT, "src", "instrumentation-client.ts")) &&
    readFileSync(join(ROOT, "src", "instrumentation-client.ts"), "utf8").includes("initBotId({ protect: BOTID_PROTECTED })"),
  "src/instrumentation-client.ts starts BotID with the list",
);

if (failures.length > 0) {
  console.error(`\nbotid routes selftest: ${failures.length} failure(s)`);
  process.exit(1);
}
console.log("\nbotid routes selftest: ok");
