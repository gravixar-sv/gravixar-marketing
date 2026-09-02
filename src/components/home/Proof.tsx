import { MDX } from "@/content/mdx";
import type { HomeBlock } from "@/content/schema";
import { Clients } from "./Clients";

export function Proof({ meta, body }: { meta: HomeBlock; body: string }) {
  return (
    <section>
      {meta.eyebrow ? (
        <p className="font-mono text-label uppercase text-brand">
          {meta.eyebrow}
        </p>
      ) : null}
      {/* Reference rank: this is a logo rail, not an argument, so the heading
          stays a step under the act-openers instead of matching their volume.
          Unprefixed on purpose, 24px at every width; the rank table in
          globals.css carries the reason this one rank does not scale.
          zinc-200 rather than zinc-300 because the MDX body directly below is
          zinc-300 as well: at the old colour the heading matched its own lede
          and size was carrying the entire split. zinc-200 still sits under the
          zinc-100 the card h3s take and the #fafafa the act-openers inherit, so
          it buys a step without promoting the rank. font-medium stays for the
          same reason: weight is what keeps this a reference heading. */}
      <h2 className="mt-3 text-reference font-medium tracking-[-0.01em] text-zinc-200">
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
