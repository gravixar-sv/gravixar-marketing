// Minimal single-user admin gate. Compares a cookie against
// process.env.ADMIN_TOKEN. If the cookie is missing or doesn't match,
// the page returns null and renders a sign-in form. Set the token in
// Vercel → Environment Variables → ADMIN_TOKEN (Production scope).
//
// This is intentionally simple; for multi-user admin auth, swap to
// NextAuth + an allowlist later. Sufficient for a sole operator.

import { cookies } from "next/headers";
import { env } from "./env";

const COOKIE_NAME = "gravixar_admin";
// 30 days. The cookie is HttpOnly + Secure; rotating ADMIN_TOKEN in
// Vercel invalidates all existing cookies immediately.
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export async function isAdmin(): Promise<boolean> {
  const token = env.ADMIN_TOKEN;
  if (!token) return false;
  const jar = await cookies();
  const stored = jar.get(COOKIE_NAME)?.value;
  return stored === token;
}

export async function setAdminCookie() {
  const token = env.ADMIN_TOKEN;
  if (!token) throw new Error("ADMIN_TOKEN not configured");
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function clearAdminCookie() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export function adminEnabled() {
  return Boolean(env.ADMIN_TOKEN);
}
