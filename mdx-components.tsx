import type { MDXComponents } from "mdx/types";
import { mdxComponents } from "@/content/mdx";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return { ...components, ...mdxComponents };
}
