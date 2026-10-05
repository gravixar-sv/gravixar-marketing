// IndexNow: tell Bing (and the other IndexNow engines) which gravixar.com URLs
// changed, on every production deploy. Run by .github/workflows/indexnow.yml.
//
// Why: ChatGPT search and Copilot answer from Bing's index, and without a ping
// a changed page waits for Bing's next crawl. IndexNow gets it there in
// minutes. Bing Webmaster recommended it for this site on 2026-10-05.
//
// Plain Node (built-ins only, no install step) so the workflow needs neither
// pnpm nor the GitHub Packages token the app's dependencies need.
//
// The key lives in ONE place: public/<key>.txt, served at
// https://gravixar.com/<key>.txt with the key as its only content. The key is
// public by design (the engines fetch that file to check that whoever submits
// controls the host), so it is not a secret. This script finds it by its file
// name and refuses to run if there is not exactly one such file or its content
// does not match its name. scripts/indexnow-selftest.mjs checks the same thing
// on every build.
//
// Which URLs: the live sitemap's URLs whose <lastmod> falls on or after the UTC
// day the previous successful production deployment went live (from GitHub's
// deployments API, which Vercel writes to). The sitemap's lastmod values are
// dates, not times (2026-10-05T00:00:00.000Z, from the content's YYYY-MM-DD),
// so a page changed today carries midnight, which is EARLIER than a deploy made
// at noon. Comparing instants would miss every same-day change; comparing days
// re-sends the few pages dated the previous deploy's day, which is harmless.
// URLs with no lastmod (home, about, contact and the other pages whose content
// holds no date) cannot be judged changed, so an incremental run skips them and
// says how many; a full run sends them. Everything is sent when there is no
// previous production deployment, when the sitemap carries no lastmod at all,
// or when FULL=true (the workflow_dispatch input).
//
// Env:
//   SITE_URL                 https://gravixar.com (the sitemap's host; IndexNow
//                            refuses URLs on any other host with a 422)
//   PRODUCTION_ENVIRONMENT   the GitHub deployment environment Vercel uses for
//                            production ("Production")
//   GITHUB_REPOSITORY        owner/repo (set by Actions)
//   GITHUB_TOKEN             read access to deployments
//   DEPLOYMENT_ID            the deployment that triggered the run (unset on a
//                            manual run: the newest successful one stands in)
//   FULL                     "true" submits every URL in the sitemap
//   DRY_RUN                  "true" does everything except the POST, and only
//                            warns if the key file is not live yet

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
export const MAX_URLS_PER_REQUEST = 10_000;
const KEY_FILE = /^[0-9a-f]{32}\.txt$/;

/** The one IndexNow key in `publicDir`, checked against its file's content. */
export function findKey(publicDir) {
  const files = readdirSync(publicDir).filter((f) => KEY_FILE.test(f));
  if (files.length !== 1) {
    throw new Error(
      `expected exactly one IndexNow key file (public/<32 lowercase hex>.txt), found ${files.length}` +
        (files.length ? `: ${files.join(", ")}` : ""),
    );
  }
  const file = files[0];
  const key = file.slice(0, -".txt".length);
  const body = readFileSync(join(publicDir, file), "utf8").trim();
  if (body !== key) {
    throw new Error(`public/${file} must contain exactly its own key, and it does not`);
  }
  return key;
}

function decodeXml(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function tagText(block, name) {
  const m = block.match(
    new RegExp(`<${name}>\\s*(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?\\s*</${name}>`, "i"),
  );
  return m ? decodeXml(m[1].trim()) : undefined;
}

/**
 * A sitemap's entries. A <urlset> gives page URLs with their lastmod; a
 * <sitemapindex> gives the child sitemaps' URLs, which the caller fetches.
 */
export function parseSitemap(xml) {
  const isIndex = /<sitemapindex[\s>]/i.test(xml);
  const block = isIndex
    ? /<sitemap(?:\s[^>]*)?>([\s\S]*?)<\/sitemap>/gi
    : /<url(?:\s[^>]*)?>([\s\S]*?)<\/url>/gi;
  const entries = [];
  for (const m of xml.matchAll(block)) {
    const loc = tagText(m[1], "loc");
    if (!loc) continue;
    const lastmod = tagText(m[1], "lastmod");
    entries.push(lastmod ? { loc, lastmod } : { loc });
  }
  return { kind: isIndex ? "sitemapindex" : "urlset", entries };
}

/** The URLs whose host is not `host`. IndexNow answers 422 to any of these. */
export function foreignUrls(urls, host) {
  return urls.filter((u) => {
    try {
      return new URL(u).host !== host;
    } catch {
      return true;
    }
  });
}

function startOfUtcDay(ms) {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * Which sitemap entries to submit. `previousLiveAt` is when the previous
 * successful production deployment went live (ISO string), or null if there
 * was none. See the header for why the comparison is by UTC day.
 */
export function selectUrls(entries, previousLiveAt, { full = false } = {}) {
  const all = entries.map((e) => e.loc);
  const dated = entries.filter((e) => e.lastmod && !Number.isNaN(Date.parse(e.lastmod)));
  const undated = entries.length - dated.length;
  if (full) return { urls: all, reason: "full run requested", undatedSkipped: 0 };
  if (!previousLiveAt) {
    return { urls: all, reason: "no previous successful production deployment", undatedSkipped: 0 };
  }
  if (dated.length === 0) {
    return { urls: all, reason: "the sitemap carries no lastmod", undatedSkipped: 0 };
  }
  const since = startOfUtcDay(Date.parse(previousLiveAt));
  const sinceDay = new Date(since).toISOString().slice(0, 10);
  return {
    urls: dated.filter((e) => Date.parse(e.lastmod) >= since).map((e) => e.loc),
    reason: `lastmod on or after ${sinceDay}, the UTC day the previous production deployment went live (${previousLiveAt})`,
    undatedSkipped: undated,
  };
}

/** IndexNow request bodies, at most MAX_URLS_PER_REQUEST URLs each. */
export function buildPayloads({ host, key, keyLocation, urls }) {
  const payloads = [];
  for (let i = 0; i < urls.length; i += MAX_URLS_PER_REQUEST) {
    payloads.push({ host, key, keyLocation, urlList: urls.slice(i, i + MAX_URLS_PER_REQUEST) });
  }
  return payloads;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url, { attempts = 3, delayMs = 10_000 } = {}) {
  let last;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000), redirect: "manual" });
      const body = await res.text();
      if (res.status === 200) return body;
      last = new Error(`GET ${url} answered HTTP ${res.status}`);
    } catch (err) {
      last = new Error(`GET ${url} failed: ${err.message}`);
    }
    if (i < attempts) await sleep(delayMs);
  }
  throw last;
}

async function githubJson(path, token) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`GitHub API ${path} answered HTTP ${res.status}`);
  return res.json();
}

/**
 * The production deployment before `currentId` that reached `success`, as
 * { id, sha, liveAt }, or null. With no `currentId` (a manual run) the newest
 * successful production deployment is treated as the current one.
 */
async function previousProductionDeploy({ repo, token, environment, currentId }) {
  const env = encodeURIComponent(environment);
  const deployments = await githubJson(`/repos/${repo}/deployments?environment=${env}&per_page=30`, token);
  // Newest first. Skip everything up to and including the current deployment,
  // so a deploy that lands while this run is going is never mistaken for the
  // previous one.
  let i = 0;
  if (currentId) {
    const at = deployments.findIndex((d) => String(d.id) === String(currentId));
    if (at === -1) throw new Error(`deployment ${currentId} is not among the newest 30 ${environment} deployments`);
    i = at + 1;
  }
  let skippedCurrent = Boolean(currentId);
  for (; i < deployments.length; i++) {
    const d = deployments[i];
    const statuses = await githubJson(`/repos/${repo}/deployments/${d.id}/statuses?per_page=100`, token);
    const success = statuses.filter((s) => s.state === "success").at(-1); // the earliest success
    if (!success) continue;
    if (!skippedCurrent) {
      skippedCurrent = true;
      console.log(`Manual run: deployment ${d.id} (${d.sha.slice(0, 7)}) stands in as the current one`);
      continue;
    }
    return { id: d.id, sha: d.sha, liveAt: success.created_at };
  }
  return null;
}

async function main() {
  const env = process.env;
  const siteUrl = env.SITE_URL;
  if (!siteUrl) throw new Error("SITE_URL is not set");
  const origin = new URL(siteUrl).origin;
  const host = new URL(siteUrl).host;
  const full = env.FULL === "true";
  const dryRun = env.DRY_RUN === "true";

  const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
  const key = findKey(publicDir);
  const keyLocation = `${origin}/${key}.txt`;

  // The engines fetch this file to accept the submission, so check it first:
  // a 403 from IndexNow says much less than "the key file is not live".
  try {
    const live = (await fetchText(keyLocation)).trim();
    if (live !== key) throw new Error(`${keyLocation} is live but does not hold the key`);
    console.log(`Key file live: ${keyLocation}`);
  } catch (err) {
    if (!dryRun) throw err;
    console.log(`DRY RUN, key file check failed (expected before the first deploy): ${err.message}`);
  }

  // The live sitemap, following a <sitemapindex> one level.
  const top = parseSitemap(await fetchText(`${origin}/sitemap.xml`));
  let entries = top.entries;
  if (top.kind === "sitemapindex") {
    entries = [];
    for (const child of top.entries) entries.push(...parseSitemap(await fetchText(child.loc)).entries);
  }
  const seen = new Set();
  entries = entries.filter((e) => !seen.has(e.loc) && seen.add(e.loc));
  if (entries.length === 0) throw new Error(`${origin}/sitemap.xml lists no URLs`);
  const foreign = foreignUrls(entries.map((e) => e.loc), host);
  if (foreign.length) {
    throw new Error(`${foreign.length} sitemap URLs are not on ${host}, so IndexNow would refuse them: ${foreign.slice(0, 5).join(", ")}`);
  }
  console.log(`Sitemap: ${entries.length} URLs on ${host}, ${entries.filter((e) => e.lastmod).length} with a lastmod`);

  let previous = null;
  if (!full) {
    const repo = env.GITHUB_REPOSITORY;
    const token = env.GITHUB_TOKEN;
    if (!repo || !token) throw new Error("GITHUB_REPOSITORY and GITHUB_TOKEN are needed to find the previous deployment");
    previous = await previousProductionDeploy({
      repo,
      token,
      environment: env.PRODUCTION_ENVIRONMENT || "Production",
      currentId: env.DEPLOYMENT_ID || undefined,
    });
    console.log(
      previous
        ? `Previous production deployment: ${previous.id} (${previous.sha.slice(0, 7)}), live at ${previous.liveAt}`
        : "Previous production deployment: none found",
    );
  }

  const { urls, reason, undatedSkipped } = selectUrls(entries, previous?.liveAt ?? null, { full });
  console.log(`Selected ${urls.length} URLs: ${reason}`);
  if (undatedSkipped) console.log(`Skipped ${undatedSkipped} URLs with no lastmod (a full run sends them)`);
  for (const u of urls) console.log(`  ${u}`);
  if (urls.length === 0) {
    console.log("IndexNow: nothing changed, nothing submitted");
    return;
  }

  for (const payload of buildPayloads({ host, key, keyLocation, urls })) {
    if (dryRun) {
      console.log(`DRY RUN, would POST ${payload.urlList.length} URLs to ${INDEXNOW_ENDPOINT} for ${host}`);
      continue;
    }
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });
    const body = (await res.text()).trim();
    console.log(`IndexNow: HTTP ${res.status} for ${payload.urlList.length} URLs on ${host}${body ? `: ${body.slice(0, 500)}` : ""}`);
    // 200 accepted, 202 accepted while the key is being checked. 400 bad
    // request, 403 key not valid, 422 URLs not on the host, 429 too many.
    if (res.status !== 200 && res.status !== 202) {
      throw new Error(`IndexNow refused the submission with HTTP ${res.status}`);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(`::error::${err.message}`);
    process.exitCode = 1;
  });
}
