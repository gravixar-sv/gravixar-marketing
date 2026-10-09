// Build-time gate for the IndexNow submit (scripts/indexnow-submit.mjs, run by
// .github/workflows/indexnow.yml after each production deploy). Runs in
// prebuild through `pnpm test`.
//
// The workflow only runs after a merge, so a mistake in it shows up as a red
// run after the fact, or worse as a green run that sent the wrong URLs. This
// checks the parts that decide what is sent, before the merge:
//   1. public/ holds exactly one key file and its content is its own key. A
//      second key, or an edited one, would make the live file disagree with
//      what the workflow sends, and IndexNow answers 403.
//   2. Sitemap parsing: urlset, sitemapindex, entities, a missing lastmod.
//   3. URL selection: lastmod is a date, so a page changed on the day of the
//      previous deploy carries midnight and must still count as changed; a
//      page with no lastmod goes when the deploy changed the site.
//   4. Host check and the 10,000-URL request limit.

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MAX_URLS_PER_REQUEST,
  buildPayloads,
  findKey,
  foreignUrls,
  parseSitemap,
  selectUrls,
  siteMayHaveChanged,
} from "./indexnow-submit.mjs";

const failures = [];
function check(ok, name, detail) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) {
    if (detail !== undefined) console.log(`      ${JSON.stringify(detail)}`);
    failures.push(name);
  }
}
function throws(fn) {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
}

// 1. The real key file.
const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
let keyError;
try {
  findKey(publicDir);
} catch (err) {
  keyError = err.message;
}
check(!keyError, "public/ holds exactly one IndexNow key file whose content is its key", keyError);

const tmp = mkdtempSync(join(tmpdir(), "indexnow-"));
try {
  const a = "0123456789abcdef0123456789abcdef";
  const b = "fedcba9876543210fedcba9876543210";
  writeFileSync(join(tmp, `${a}.txt`), `${a}\n`);
  check(findKey(tmp) === a, "a trailing newline in the key file is tolerated");
  writeFileSync(join(tmp, `${b}.txt`), b);
  check(throws(() => findKey(tmp)), "two key files are refused");
  rmSync(join(tmp, `${b}.txt`));
  writeFileSync(join(tmp, `${a}.txt`), b);
  check(throws(() => findKey(tmp)), "a key file whose content is another key is refused");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

// 2. Parsing.
const urlset = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url>
<loc>https://gravixar.com/</loc>
</url>
<url>
<loc>https://gravixar.com/blog</loc>
<lastmod>2026-10-05T00:00:00.000Z</lastmod>
</url>
<url><loc>https://gravixar.com/search?a=1&amp;b=2</loc><lastmod>2026-09-01T00:00:00.000Z</lastmod></url>
</urlset>`;
const parsed = parseSitemap(urlset);
check(parsed.kind === "urlset" && parsed.entries.length === 3, "a urlset gives one entry per <url>", parsed);
check(parsed.entries[0].lastmod === undefined, "a <url> with no <lastmod> has none", parsed.entries[0]);
check(parsed.entries[1].lastmod === "2026-10-05T00:00:00.000Z", "lastmod is read", parsed.entries[1]);
check(parsed.entries[2].loc === "https://gravixar.com/search?a=1&b=2", "XML entities in <loc> are decoded", parsed.entries[2]);

const index = parseSitemap(`<?xml version="1.0"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<sitemap><loc>https://gravixar.com/sitemap-1.xml</loc></sitemap>
<sitemap><loc>https://gravixar.com/sitemap-2.xml</loc><lastmod>2026-10-01</lastmod></sitemap>
</sitemapindex>`);
check(
  index.kind === "sitemapindex" && index.entries.map((e) => e.loc).join() === "https://gravixar.com/sitemap-1.xml,https://gravixar.com/sitemap-2.xml",
  "a sitemapindex gives its child sitemaps",
  index,
);

// 3. Selection.
const entries = [
  { loc: "https://gravixar.com/" },
  { loc: "https://gravixar.com/blog", lastmod: "2026-10-05T00:00:00.000Z" },
  { loc: "https://gravixar.com/blog/new", lastmod: "2026-10-06T00:00:00.000Z" },
  { loc: "https://gravixar.com/services", lastmod: "2026-09-26T00:00:00.000Z" },
];
const sameDay = selectUrls(entries, "2026-10-05T11:49:31Z", { sendUndated: false });
check(
  sameDay.urls.join() === "https://gravixar.com/blog,https://gravixar.com/blog/new",
  "lastmod on the previous deploy's day counts as changed, older does not",
  sameDay,
);
check(
  sameDay.undatedSkipped === 1,
  "a URL with no lastmod is skipped, and counted, when the deploy changed nothing the site is built from",
  sameDay,
);
const siteChanged = selectUrls(entries, "2026-10-05T11:49:31Z", { sendUndated: true });
check(
  siteChanged.urls.join() === "https://gravixar.com/,https://gravixar.com/blog,https://gravixar.com/blog/new" &&
    siteChanged.undatedSkipped === 0,
  "a URL with no lastmod is sent when the deploy changed the site",
  siteChanged,
);
check(
  selectUrls(entries, "2026-10-05T11:49:31Z").urls.includes("https://gravixar.com/"),
  "sending URLs with no lastmod is the default, so an unknown answer errs toward sending",
);
check(selectUrls(entries, null).urls.length === 4, "no previous deployment sends every URL");
check(selectUrls(entries, "2026-10-05T11:49:31Z", { full: true }).urls.length === 4, "a full run sends every URL");
check(
  selectUrls([{ loc: "https://gravixar.com/" }, { loc: "https://gravixar.com/about" }], "2026-10-05T11:49:31Z").urls.length === 2,
  "a sitemap with no lastmod at all sends every URL",
);
check(
  selectUrls(entries, "2026-10-07T00:00:01Z", { sendUndated: false }).urls.length === 0,
  "nothing dated on or after the previous deploy, on a deploy that left the site alone, sends nothing",
);

// 3b. Which deploys can have changed a page with no lastmod.
check(siteMayHaveChanged(["src/app/page.tsx"]), "site inputs: a page's source changed");
check(siteMayHaveChanged(["content/services/ops-leak-audit.mdx"]), "site inputs: content changed");
check(siteMayHaveChanged(["CLAUDE.md", "vercel.ts"]), "site inputs: vercel.ts counts as the site");
check(siteMayHaveChanged(["pnpm-lock.yaml"]), "site inputs: dependencies changed");
check(siteMayHaveChanged(["emails/welcome.tsx"]), "site inputs: an unlisted path counts as the site");
check(siteMayHaveChanged(null), "site inputs: unknown counts as changed");
check(
  !siteMayHaveChanged([".github/workflows/indexnow.yml", "scripts/indexnow-submit.mjs", "CHANGELOG.md", "renovate.json"]),
  "site inputs: only workflows, scripts and root notes",
);
check(!siteMayHaveChanged([]), "site inputs: a same-commit redeploy changes nothing");
check(siteMayHaveChanged(["content/blog/post.md"]), "site inputs: a nested .md file is not a root note");

// 4. Host and request size.
check(
  foreignUrls(["https://gravixar.com/a", "https://www.gravixar.com/b", "not a url"], "gravixar.com").length === 2,
  "URLs on another host (www included) are caught before IndexNow's 422",
);
const many = Array.from({ length: MAX_URLS_PER_REQUEST + 1 }, (_, i) => `https://gravixar.com/p/${i}`);
const payloads = buildPayloads({ host: "gravixar.com", key: "k", keyLocation: "https://gravixar.com/k.txt", urls: many });
check(
  payloads.length === 2 && payloads[0].urlList.length === MAX_URLS_PER_REQUEST && payloads[1].urlList.length === 1,
  "more than 10,000 URLs split into several requests",
);
check(
  Object.keys(payloads[0]).join() === "host,key,keyLocation,urlList",
  "the request body carries host, key, keyLocation and urlList",
);

if (failures.length) {
  console.log(`\n${failures.length} IndexNow check(s) failed`);
  process.exit(1);
}
console.log("\nIndexNow selftest passed");
