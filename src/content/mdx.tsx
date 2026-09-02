// MDX component map + a thin compile helper.
//
// Pages render MDX bodies via <MDXRemote source={body} components={mdxComponents} />.
// Custom components for callouts/proof can be added here and used inline in
// any .mdx file.

import { MDXRemote, type MDXRemoteProps } from "next-mdx-remote/rsc";
import type { ComponentProps } from "react";

function H1(props: ComponentProps<"h1">) {
  return <h1 className="text-4xl font-semibold tracking-tight md:text-page" {...props} />;
}
function H2(props: ComponentProps<"h2">) {
  return <h2 className="mt-12 text-2xl font-semibold tracking-tight md:text-subsection" {...props} />;
}
function H3(props: ComponentProps<"h3">) {
  return <h3 className="mt-8 text-xl font-semibold tracking-tight" {...props} />;
}
function P(props: ComponentProps<"p">) {
  return <p className="mt-4 leading-relaxed text-zinc-300" {...props} />;
}
function UL(props: ComponentProps<"ul">) {
  return <ul className="mt-4 list-disc space-y-1 pl-5 text-zinc-300" {...props} />;
}
function A(props: ComponentProps<"a">) {
  return (
    <a
      className="font-medium text-brand-soft underline-offset-4 hover:underline"
      {...props}
    />
  );
}

export function Callout({
  tone = "note",
  children,
}: {
  tone?: "note" | "warn";
  children: React.ReactNode;
}) {
  const palette =
    tone === "warn"
      ? "border-brand-deep/30 bg-brand-deep/10 text-brand-soft"
      : "border-zinc-700 bg-zinc-900 text-zinc-200";
  return (
    <div className={`mt-6 rounded-md border p-4 text-sm ${palette}`}>{children}</div>
  );
}

export const mdxComponents = {
  h1: H1,
  h2: H2,
  h3: H3,
  p: P,
  ul: UL,
  a: A,
  Callout,
};

export function MDX({ source }: { source: string }) {
  const props: MDXRemoteProps = {
    source,
    components: mdxComponents,
  };
  return <MDXRemote {...props} />;
}
