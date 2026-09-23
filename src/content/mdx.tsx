// MDX component map + a thin compile helper.
//
// Pages render MDX bodies via <MDX source={body} />. Tailwind's preflight
// strips every element this map does not style, which is how ordered lists
// shipped with no numbers on all five compare pages and code blocks shipped
// unstyled. So the map is COMPLETE on purpose: every element markdown can
// emit has an entry, and long form reads at a set measure (put `.prose-g` or
// `max-w-[68ch]` on the wrapper; the elements carry their own rhythm).
//
// Links are ivory with an underline (never colour alone: coral on body text
// measured 1.6:1, well under the 3:1 a colour-only link needs). On hover the
// underline brightens; coral never appears on a link.

import { MDXRemote, type MDXRemoteProps } from "next-mdx-remote/rsc";
import { Children, isValidElement, type ComponentProps, type ReactNode } from "react";

// Heading anchors, so long pages can deep-link and carry a table of contents.
function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}
export function headingId(children: ReactNode): string {
  return textOf(children)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 64);
}

function H1(props: ComponentProps<"h1">) {
  return <h1 className="text-page font-semibold text-ink-50" {...props} />;
}
function H2({ children, ...props }: ComponentProps<"h2">) {
  return (
    <h2
      id={headingId(children)}
      className="mt-14 scroll-mt-28 text-[1.625rem] font-semibold leading-[1.18] tracking-[-0.02em] text-ink-50 first:mt-0 md:text-subsection"
      {...props}
    >
      {children}
    </h2>
  );
}
function H3({ children, ...props }: ComponentProps<"h3">) {
  return (
    <h3
      id={headingId(children)}
      className="mt-10 scroll-mt-28 text-xl font-semibold leading-snug text-ink-100"
      {...props}
    >
      {children}
    </h3>
  );
}
function H4(props: ComponentProps<"h4">) {
  return <h4 className="mt-8 text-base font-semibold text-ink-100" {...props} />;
}
function P(props: ComponentProps<"p">) {
  return <p className="mt-5 text-prose text-ink-300 first:mt-0" {...props} />;
}
function UL(props: ComponentProps<"ul">) {
  return (
    <ul
      className="mt-5 list-disc space-y-2.5 pl-5 text-prose text-ink-300 marker:text-ink-600"
      {...props}
    />
  );
}
function OL(props: ComponentProps<"ol">) {
  return (
    <ol
      className="mt-5 list-decimal space-y-3 pl-6 text-prose text-ink-300 marker:font-sans marker:font-medium marker:tabular-nums marker:text-ink-400"
      {...props}
    />
  );
}
function LI(props: ComponentProps<"li">) {
  return <li className="pl-1.5 [&>ol]:mt-2.5 [&>p]:mt-2 [&>ul]:mt-2.5" {...props} />;
}
function A({ href = "", ...props }: ComponentProps<"a">) {
  const external = /^https?:\/\//.test(href) && !href.includes("gravixar.com");
  return (
    <a
      href={href}
      className="link-quiet font-medium"
      {...(external ? { rel: "noreferrer" } : {})}
      {...props}
    />
  );
}
function Strong(props: ComponentProps<"strong">) {
  return <strong className="font-semibold text-ink-100" {...props} />;
}
function Em(props: ComponentProps<"em">) {
  // Real italics exist only in the serif; the sans has no italic loaded, so a
  // synthesised oblique would be a fake. Emphasis in running text stays upright
  // and brighter instead.
  return <em className="not-italic text-ink-100" {...props} />;
}
// A pull quote: the serif human voice, no side stripe. A hanging open-quote
// sits in the margin so the text column stays flush.
function Blockquote({ children, ...props }: ComponentProps<"blockquote">) {
  return (
    <blockquote
      className="relative my-10 pl-7 font-serif text-[1.375rem] italic leading-[1.4] text-ink-100 md:text-[1.5rem] [&_p]:text-inherit [&_p]:[font-size:inherit] [&_p]:leading-[inherit]"
      {...props}
    >
      <span aria-hidden className="absolute -top-2 left-0 font-serif text-[2.5rem] leading-none text-ink-600">
        &ldquo;
      </span>
      {children}
    </blockquote>
  );
}
function Code(props: ComponentProps<"code">) {
  return (
    <code
      className="rounded-md border border-line-soft bg-ink-900 px-1.5 py-0.5 font-mono text-[0.84em] text-ink-200 [pre_&]:border-0 [pre_&]:bg-transparent [pre_&]:p-0 [pre_&]:text-[0.8125rem]"
      {...props}
    />
  );
}
function Pre(props: ComponentProps<"pre">) {
  return (
    <pre
      className="mt-6 max-w-full overflow-x-auto rounded-xl border border-line bg-ink-950 p-5 font-mono text-[0.8125rem] leading-relaxed text-ink-200"
      {...props}
    />
  );
}
function HR() {
  return <hr className="my-12 border-0 border-t border-line" />;
}
function Table(props: ComponentProps<"table">) {
  return (
    <div className="mt-6 overflow-x-auto rounded-xl border border-line">
      <table className="w-full border-collapse text-left text-sm text-ink-300" {...props} />
    </div>
  );
}
function TH(props: ComponentProps<"th">) {
  return <th className="border-b border-line bg-ink-900/60 px-4 py-3 font-medium text-ink-100" {...props} />;
}
function TD(props: ComponentProps<"td">) {
  return <td className="border-b border-line-soft px-4 py-3 align-top" {...props} />;
}
function Img({ alt = "", ...props }: ComponentProps<"img">) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt={alt} loading="lazy" className="mt-8 w-full rounded-xl border border-line" {...props} />;
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
      ? "border-danger/30 bg-danger/[0.06] text-ink-200"
      : "border-line bg-ink-900/60 text-ink-200";
  return (
    <div className={`mt-6 rounded-xl border px-5 py-4 text-[0.9375rem] leading-relaxed ${palette}`}>
      {Children.toArray(children)}
    </div>
  );
}

export const mdxComponents = {
  h1: H1,
  h2: H2,
  h3: H3,
  h4: H4,
  p: P,
  ul: UL,
  ol: OL,
  li: LI,
  a: A,
  strong: Strong,
  em: Em,
  blockquote: Blockquote,
  code: Code,
  pre: Pre,
  hr: HR,
  table: Table,
  th: TH,
  td: TD,
  img: Img,
  Callout,
};

export function MDX({ source }: { source: string }) {
  const props: MDXRemoteProps = {
    source,
    components: mdxComponents,
  };
  return <MDXRemote {...props} />;
}
