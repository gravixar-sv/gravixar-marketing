"use client";

// Thin client wrapper so the marketing layout can stay a server component.
// The only thing Bosun needs from the router is the route it was opened from,
// which is both the opener selector and the one field on the miss row.

import { usePathname } from "next/navigation";
import { Bosun } from "./Bosun";

export function BosunMount() {
  const pathname = usePathname();
  return <Bosun sourcePage={pathname ?? "/"} />;
}
