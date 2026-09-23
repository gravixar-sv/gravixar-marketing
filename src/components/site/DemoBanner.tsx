// Top-of-site banner pointing visitors at the live demo subdomain.
// demo.gravixar.com is live: five interactive scenes you can click through, no
// sign-in and no accounts. Scene count is read from DEMO_SCENES so it cannot
// drift when a sixth scene lands.
//
// Quiet on purpose (2026-09-23). It used to wear a coral border, a coral link
// and an emerald dot, three colours in the first 40px of every page, and it
// repeated the nav's own tag. Now the only colour is the live dot, which
// breathes three times and rests, because demo.gravixar.com really is live.

import { DEMO_SCENES } from "@/lib/demos";
import { SITE } from "@/lib/seo";

const SCENE_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight"] as const;
const sceneCount: string = SCENE_WORDS[DEMO_SCENES.length] ?? String(DEMO_SCENES.length);
const sceneCountCap = sceneCount.charAt(0).toUpperCase() + sceneCount.slice(1);

export function DemoBanner() {
  return (
    <div className="border-b border-line-soft bg-ink-950/60">
      <a
        href={SITE.demoUrl}
        rel="noreferrer"
        className="group mx-auto flex max-w-6xl items-center justify-center gap-2.5 px-6 py-2 text-[0.8125rem] text-ink-400 transition-colors hover:text-ink-100"
      >
        <span aria-hidden className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 text-emerald-400" />
        <span className="hidden md:inline">
          {sceneCountCap} working apps with sample data. No sign-in, click anything.
        </span>
        <span className="md:hidden">Try {sceneCount} live demos</span>
        <span className="font-medium text-ink-100 underline decoration-ink-600 underline-offset-[3px] transition-colors group-hover:decoration-brand">
          demo.gravixar.com
        </span>
      </a>
    </div>
  );
}
