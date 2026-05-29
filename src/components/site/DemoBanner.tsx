// Top-of-site banner pointing visitors at the live demo subdomain.
// demo.gravixar.com is live — four interactive scenes you can click
// through. Keep the framing active.

import { SITE } from "@/lib/seo";

export function DemoBanner() {
  return (
    <div className="border-y border-brand/20 bg-zinc-950">
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-6 py-2 text-xs text-zinc-300 md:text-sm">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
        <span className="hidden md:inline">Live interactive demo — click through real working software at</span>
        <span className="md:hidden">Live demo at</span>
        <a
          href={SITE.demoUrl}
          className="font-medium text-brand-soft underline-offset-4 hover:underline"
          rel="noreferrer"
        >
          demo.gravixar.com →
        </a>
      </div>
    </div>
  );
}
