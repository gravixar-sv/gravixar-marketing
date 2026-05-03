import { MDX } from "@/content/mdx";
import type { HomeBlock } from "@/content/schema";
import { Clients } from "./Clients";

export function Proof({ meta, body }: { meta: HomeBlock; body: string }) {
  return (
    <section>
      {meta.eyebrow ? (
        <p className="font-mono text-xs uppercase tracking-widest text-brand">
          {meta.eyebrow}
        </p>
      ) : null}
      <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
        {meta.title}
      </h2>
      <div className="mt-4 max-w-3xl text-zinc-300">
        <MDX source={body} />
      </div>
      <Clients />
    </section>
  );
}
