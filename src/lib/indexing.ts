// Google Indexing API client. Notifies Google when a JobPosting URL is added,
// updated, or removed so roles appear in (and drop out of) Google for Jobs
// quickly instead of waiting on the normal crawl.
//
// Auth is a service-account JWT (RS256) exchanged for a short-lived OAuth2
// access token, signed with Node's built-in crypto so this adds no dependency.
// Credentials live in GOOGLE_INDEXING_CREDENTIALS as base64-encoded service-
// account JSON (base64 keeps the multiline private key intact in a Vercel env
// var). The service account must be an Owner of the gravixar.com property in
// Google Search Console.
//
// Fail-open by contract: unset/invalid credentials or any network error make
// every call a logged no-op. Indexing is never in the critical path (same rule
// as the AI integrations).

import crypto from "node:crypto";
import { env } from "@/lib/env";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const PUBLISH_ENDPOINT =
  "https://indexing.googleapis.com/v3/urlNotifications:publish";
const SCOPE = "https://www.googleapis.com/auth/indexing";

export type NotificationType = "URL_UPDATED" | "URL_DELETED";

export interface UrlNotification {
  url: string;
  type: NotificationType;
}

export interface PublishResult extends UrlNotification {
  ok: boolean;
  status?: number;
}

interface ServiceAccount {
  clientEmail: string;
  privateKey: string;
  tokenUri: string;
}

function loadCredentials(): ServiceAccount | null {
  const raw = env.GOOGLE_INDEXING_CREDENTIALS;
  if (!raw) return null;
  try {
    const json = Buffer.from(raw, "base64").toString("utf8");
    const sa = JSON.parse(json) as {
      client_email?: string;
      private_key?: string;
      token_uri?: string;
    };
    if (!sa.client_email || !sa.private_key) return null;
    return {
      clientEmail: sa.client_email,
      privateKey: sa.private_key,
      tokenUri: sa.token_uri ?? TOKEN_ENDPOINT,
    };
  } catch {
    return null;
  }
}

/** True when valid credentials are present (lets callers skip cleanly). */
export function isIndexingConfigured(): boolean {
  return loadCredentials() !== null;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function safeBody(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "<no body>";
  }
}

// Mint a signed JWT and exchange it for an OAuth2 access token (valid ~1h).
async function getAccessToken(sa: ServiceAccount): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: sa.clientEmail,
      scope: SCOPE,
      aud: sa.tokenUri,
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${claims}`;

  let assertion: string;
  try {
    const signature = base64url(
      crypto.sign("RSA-SHA256", Buffer.from(unsigned), sa.privateKey),
    );
    assertion = `${unsigned}.${signature}`;
  } catch (err) {
    console.warn("[indexing] JWT signing failed:", err);
    return null;
  }

  try {
    const res = await fetch(sa.tokenUri, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });
    if (!res.ok) {
      console.warn(
        "[indexing] token exchange failed:",
        res.status,
        await safeBody(res),
      );
      return null;
    }
    const data = (await res.json()) as { access_token?: string };
    return data.access_token ?? null;
  } catch (err) {
    console.warn("[indexing] token exchange error:", err);
    return null;
  }
}

/**
 * Notify Google about a batch of URL changes. The v3 publish endpoint is
 * single-URL, so this issues one request per notification and returns one
 * result each. No-ops to [] when credentials are absent or the token can't
 * be obtained (each notification is then marked ok: false).
 */
export async function publishUrls(
  notifications: UrlNotification[],
): Promise<PublishResult[]> {
  const sa = loadCredentials();
  if (!sa) {
    console.warn(
      "[indexing] GOOGLE_INDEXING_CREDENTIALS unset/invalid, skipping.",
    );
    return [];
  }
  if (notifications.length === 0) return [];

  const token = await getAccessToken(sa);
  if (!token) return notifications.map((n) => ({ ...n, ok: false }));

  const results: PublishResult[] = [];
  for (const n of notifications) {
    try {
      const res = await fetch(PUBLISH_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: n.url, type: n.type }),
      });
      if (!res.ok) {
        console.warn(
          `[indexing] publish failed (${n.type} ${n.url}):`,
          res.status,
          await safeBody(res),
        );
      }
      results.push({ ...n, ok: res.ok, status: res.status });
    } catch (err) {
      console.warn(`[indexing] publish error (${n.type} ${n.url}):`, err);
      results.push({ ...n, ok: false });
    }
  }
  return results;
}
