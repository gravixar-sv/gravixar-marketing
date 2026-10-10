// The routes BotID's browser script protects. BotID has two halves: the server
// check (`checkBotId()` in each route) and this list, which
// src/instrumentation-client.ts hands to `initBotId()` so the browser attaches
// BotID's signals to these requests. A route with only the server half gets
// no signals, so BotID flags every request to it, real people included.
//
// Until 2026-10-10 this site had `checkBotId()` on six routes and no client
// half at all. Production logged Vercel's "Possible misconfiguration of Vercel
// BotId" on them. The four lead routes are warn-only, so they logged a flag on
// each submission and kept the lead. The two routes that BLOCK on BotID
// (/api/book/request-code and /api/ops-leak-calculator) answer a flagged
// request with a silent success and send nothing. Found by the calculator's
// first live test send, which said "on its way" and sent nothing.
//
// scripts/botid-routes-selftest.ts fails the build if a route calls
// checkBotId() and is missing here.

export const BOTID_PROTECTED: { path: string; method: string }[] = [
  { path: "/api/book/request-code", method: "POST" },
  { path: "/api/ops-leak-calculator", method: "POST" },
  { path: "/api/lead", method: "POST" },
  { path: "/api/service-inquiry", method: "POST" },
  { path: "/api/early-access", method: "POST" },
  { path: "/api/job-application", method: "POST" },
];
