// Top-of-site banner pointing visitors at the live demo subdomain.
// demo.gravixar.com is live: five interactive scenes you can click
// through, no sign-in and no accounts. Scene count is read from
// DEMO_SCENES so it cannot drift when a sixth scene lands.
// Keep the framing active.

import { DEMO_SCENES } from "@/lib/demos";
import { SITE } from "@/lib/seo";

const SCENE_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight"] as const;
const sceneCount: string = SCENE_WORDS[DEMO_SCENES.length] ?? String(DEMO_SCENES.length);
const sceneCountCap = sceneCount.charAt(0).toUpperCase() + sceneCount.slice(1);

export function DemoBanner() {
  return (
    <div className="border-y border-brand/20 bg-zinc-950">
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-6 py-2 text-xs text-zinc-300 md:text-sm">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
        <span className="hidden md:inline">{sceneCountCap} working apps, not a walkthrough. Sample data, no sign-in, click anything at</span>
        <span className="md:hidden">Try {sceneCount} live demos at</span>
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
