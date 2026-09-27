// The private lead-PII store (gravixar-pii), and the only way this site
// writes personal data to Blob.
//
// Why a second store: gravixar-blob is PUBLIC. Its month files sit at fixed
// paths, so anyone holding the store's base URL could read every lead (HQ
// decision hq-blob-pii-dedicated-private-store). A public store also refuses
// private writes outright ("Cannot use private access on a public store"),
// which is why every CV attached since 2026-07-31 was dropped.
//
// Auth is Vercel OIDC. The store is connected to this project with the prefix
// PII_BLOB, which provides PII_BLOB_STORE_ID, and the deployment's own
// short-lived token does the rest: there is no long-lived secret for it. Every
// call passes the store id AND a freshly fetched OIDC token, because when the
// SDK cannot find a token it swallows the failure and falls back to
// BLOB_READ_WRITE_TOKEN, the PUBLIC store's. A private write there is refused,
// so that fails safe, but a read would quietly see an empty store. piiAuth
// throws instead. getVercelOidcToken reads the per-request header, so a
// per-call fetch is never stale.

import {
  BlobNotFoundError,
  get,
  head,
  list,
  put,
  type ListBlobResultBlob,
  type PutCommandOptions,
} from "@vercel/blob";
import { getVercelOidcToken } from "@vercel/oidc";
import { env } from "./env";

export class PiiStoreUnavailable extends Error {}

interface PiiAuth {
  storeId: string;
  oidcToken: string;
}

/** Credentials for one private-store call. Throws; never falls back. */
async function piiAuth(): Promise<PiiAuth> {
  const storeId = env.PII_BLOB_STORE_ID?.trim();
  if (!storeId) throw new PiiStoreUnavailable("PII_BLOB_STORE_ID unset");
  let oidcToken = "";
  try {
    oidcToken = (await getVercelOidcToken()).trim();
  } catch (err) {
    const reason = err instanceof Error ? err.message.split("\n")[0] : String(err);
    throw new PiiStoreUnavailable(`no Vercel OIDC token (${reason})`);
  }
  if (!oidcToken) throw new PiiStoreUnavailable("no Vercel OIDC token");
  return { storeId, oidcToken };
}

// ── The append, over any store that can do conditional writes ───────────────

/**
 * What the append needs from a store: read a file with its version tag, and
 * write it back only if nothing changed since (or only if it does not exist
 * yet). Kept as an interface so scripts/pii-blob-selftest.ts can run the
 * append against a store that misbehaves on purpose.
 */
export interface ConditionalStore {
  read(pathname: string): Promise<{ text: string; etag: string } | null>;
  /** `ifMatch` null means "create only". Throws when the condition fails. */
  write(pathname: string, body: string, ifMatch: string | null): Promise<{ url: string }>;
}

// Ten, not six: the selftest showed six writers racing through stale reads
// could exhaust six. The backoff caps at 0.8s, so the worst case is ~5s of
// retrying, and only under a pile-up this site has never seen.
const MAX_ATTEMPTS = 10;

function backoff(attempt: number): Promise<void> {
  const ms = Math.min(800, 40 * 2 ** attempt) * (0.5 + Math.random());
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Append one JSONL line without losing anyone else's.
 *
 * The old append on the public store read the month file, added a line and
 * PUT the whole file back, so two submissions that read the same version
 * overwrote each other and the first lead vanished. Here the write only lands
 * if the file is still the version that was read; otherwise it re-reads and
 * tries again. On a retry, a line already present means an earlier attempt
 * landed and only its response was lost, so the retry does not duplicate it.
 * The first attempt never skips: two visitors can send identical chat-miss
 * lines, which carry no id.
 */
export async function appendLineWith(
  store: ConditionalStore,
  pathname: string,
  line: string,
  // Only the selftest passes this, to run the same retries in milliseconds.
  wait: (attempt: number) => Promise<void> = backoff,
): Promise<{ url: string }> {
  for (let attempt = 1; ; attempt++) {
    const cur = await store.read(pathname);
    if (attempt > 1 && cur && cur.text.split("\n").some((l) => l.trim() === line)) {
      return { url: pathname };
    }
    const base = cur?.text ?? "";
    const next = `${base}${base && !base.endsWith("\n") ? "\n" : ""}${line}\n`;
    try {
      return await store.write(pathname, next, cur ? cur.etag : null);
    } catch (err) {
      if (attempt >= MAX_ATTEMPTS) throw err;
      await wait(attempt);
    }
  }
}

// ── The real store ──────────────────────────────────────────────────────────

async function privateOptions(): Promise<{ access: "private" } & PiiAuth> {
  return { access: "private", ...(await piiAuth()) };
}

/**
 * The private store as a ConditionalStore.
 *
 * The version tag comes from head(), NOT from get()'s response. On a month
 * file past a few hundred bytes, the ETag get() returns does not match the one
 * put()'s ifMatch compares against (the response is served in another
 * encoding), so every append to a real month file was refused ten times and
 * dropped. This shipped in #179 and a robonamix preview test caught it: the
 * platform selftest had only appended to tiny files. head() reads the
 * store's own metadata, which is what Vercel's conditional-write example uses.
 *
 * Order matters: the tag first, the body second. A write landing in between
 * can only make the body NEWER than the tag, which makes the conditional put
 * refuse and retry. The reverse order could pair an old body with a new tag
 * and overwrite the line that landed. The body is read from origin
 * (`useCache: false`), because a CDN copy can trail the last write.
 */
const privateStore = (contentType: string): ConditionalStore => ({
  async read(pathname) {
    let etag: string;
    try {
      etag = (await head(pathname, await privateOptions())).etag;
    } catch (err) {
      if (err instanceof BlobNotFoundError) return null;
      throw err;
    }
    const res = await get(pathname, { ...(await privateOptions()), useCache: false });
    if (!res) return null;
    if (res.statusCode !== 200) throw new Error(`private get ${pathname} -> ${res.statusCode}`);
    return { text: await new Response(res.stream).text(), etag };
  },
  async write(pathname, body, ifMatch) {
    const options: PutCommandOptions = {
      ...(await privateOptions()),
      contentType,
      addRandomSuffix: false,
      ...(ifMatch === null ? { allowOverwrite: false } : { allowOverwrite: true, ifMatch }),
    };
    const blob = await put(pathname, body, options);
    return { url: blob.url };
  },
});

/** Append one JSONL line to a private month file. */
export function appendPrivateLine(pathname: string, line: string): Promise<{ url: string }> {
  return appendLineWith(privateStore("application/x-ndjson"), pathname, line);
}

/**
 * Create a private file only if nothing is at that pathname yet. Resolves
 * false when something already is. The store refusing the second write is the
 * whole concurrency story for booking slots; see claimSlot in ./blob.ts.
 */
export async function createPrivateOnce(pathname: string, body: string): Promise<boolean> {
  try {
    await privateStore("application/json").write(pathname, body, null);
    return true;
  } catch (err) {
    if (err instanceof PiiStoreUnavailable) throw err;
    return false;
  }
}

/** Upload a private file under a random suffix (CVs). */
export async function putPrivateFile(
  pathname: string,
  body: File,
  contentType: string,
): Promise<{ url: string }> {
  const blob = await put(pathname, body, {
    ...(await privateOptions()),
    addRandomSuffix: true,
    contentType,
  });
  return { url: blob.url };
}

/** Every private object under a prefix. */
export async function listPrivate(prefix: string): Promise<ListBlobResultBlob[]> {
  const out: ListBlobResultBlob[] = [];
  let cursor: string | undefined;
  do {
    const { storeId, oidcToken } = await piiAuth();
    const page = await list({ prefix, cursor, limit: 1000, storeId, oidcToken });
    out.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out;
}

/** A private JSON file, parsed; null when it does not exist. */
export async function readPrivateJson<T>(pathname: string): Promise<T | null> {
  const cur = await privateStore("application/json").read(pathname);
  return cur ? (JSON.parse(cur.text) as T) : null;
}
