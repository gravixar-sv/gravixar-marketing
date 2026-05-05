"use server";

// Server actions for the /admin login + sign-out forms.

import { redirect } from "next/navigation";
import { env } from "./env";
import { setAdminCookie, clearAdminCookie } from "./admin-auth";

export async function adminSignInAction(formData: FormData) {
  const submitted = formData.get("token");
  if (typeof submitted !== "string") return;
  if (!env.ADMIN_TOKEN) return;
  if (submitted !== env.ADMIN_TOKEN) {
    redirect("/admin?error=invalid");
  }
  await setAdminCookie();
  redirect("/admin");
}

export async function adminSignOutAction() {
  await clearAdminCookie();
  redirect("/admin");
}
