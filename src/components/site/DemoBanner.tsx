// Top-of-site banner pointing visitors at the demo subdomain.
// Currently dialled down — demo.gravixar.com is in a polish pass and
// shows a coming-soon page. Copy reflects that until we unpause.
// When the demo is back, restore the active "live" framing (see
// commit history for the previous copy).

import { SITE } from "@/lib/seo";

export function DemoBanner() {
  return (
    <div className="border-y border-brand/20 bg-zinc-950">
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-6 py-2 text-xs text-zinc-300 md:text-sm">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-500" />
        <span className="hidden md:inline">Demo being polished — back online soon at</span>
        <span className="md:hidden">Demo soon at</span>
        <a
          href={SITE.demoUrl}
          className="font-medium text-brand-soft underline-offset-4 hover:underline"
          rel="noreferrer"
        >
          demo.gravixar.com
        </a>
      </div>
    </div>
  );
}
