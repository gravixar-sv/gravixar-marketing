import { MDX } from "@/content/mdx";
import type { HomeBlock } from "@/content/schema";
import { Clients } from "./Clients";

export function Proof({ meta, body }: { meta: HomeBlock; body: string }) {
  return (
    <section>
      {meta.eyebrow ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">
          {meta.eyebrow}
        </p>
      ) : null}
      {/* Reference rank: this is a logo rail, not an argument, so the heading
          stays a step under the act-openers instead of matching their volume. */}
      <h2 className="mt-3 text-xl font-medium tracking-[-0.01em] text-zinc-300 md:text-reference">
        {meta.title}
      </h2>
      {/* No margin here: this div has no border or padding, so its margin-top
          would collapse with the MDX <P>'s own mt-4 rather than add to it. The
          gap is the <P>'s either way, so declaring one here is inert. */}
      <div className="max-w-3xl text-zinc-300">
        <MDX source={body} />
      </div>
      <Clients />
    </section>
  );
}
