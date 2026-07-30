// Filesystem readers for MDX content. All loaders return parsed
// frontmatter + raw MDX body. Rendering is the page's job.
//
// Drafts: any path under a `_drafts/` segment is excluded from listings.
// AI-drafted posts land in `_drafts/`; approval = move the file out.

import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import {
  blogPostSchema,
  caseStudySchema,
  compareSchema,
  graphicsItemSchema,
  homeBlockSchema,
  moduleSchema,
  pageSchema,
  serviceSchema,
  type BlogPost,
  type CaseStudy,
  type Compare,
  type GraphicsItem,
  type HomeBlock,
  type Module,
  type Page,
  type Service,
} from "./schema";

const CONTENT_ROOT = path.join(process.cwd(), "content");

const inDraftsFolder = (relPath: string) =>
  relPath.split(path.sep).some((segment) => segment === "_drafts");

async function listMdxFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(current: string) {
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(current, e.name);
      if (e.isDirectory()) await walk(full);
      else if (e.isFile() && /\.mdx?$/.test(e.name)) out.push(full);
    }
  }
  await walk(dir);
  return out;
}

export type Loaded<T> = {
  meta: T;
  body: string;
  filepath: string;
};

async function loadDir<T>(
  subdir: string,
  parse: (data: unknown, file: string) => T,
  { includeDrafts = false }: { includeDrafts?: boolean } = {},
): Promise<Loaded<T>[]> {
  const dir = path.join(CONTENT_ROOT, subdir);
  const files = await listMdxFiles(dir);
  const items: Loaded<T>[] = [];
  for (const file of files) {
    const rel = path.relative(CONTENT_ROOT, file);
    if (!includeDrafts && inDraftsFolder(rel)) continue;
    const raw = await fs.readFile(file, "utf-8");
    const { data, content } = matter(raw);
    const meta = parse(data, file);
    items.push({ meta, body: content, filepath: file });
  }
  return items;
}

export async function loadServices(): Promise<Loaded<Service>[]> {
  const items = await loadDir("services", (data, file) => {
    const result = serviceSchema.safeParse(data);
    if (!result.success) {
      throw new Error(
        `Invalid frontmatter in ${file}:\n${result.error.message}`,
      );
    }
    return result.data;
  });
  return items.sort((a, b) => a.meta.order - b.meta.order);
}

export async function loadBlogPosts({
  includeDrafts = false,
}: { includeDrafts?: boolean } = {}): Promise<Loaded<BlogPost>[]> {
  const items = await loadDir(
    "blog",
    (data, file) => {
      const result = blogPostSchema.safeParse(data);
      if (!result.success) {
        throw new Error(`Invalid frontmatter in ${file}:\n${result.error.message}`);
      }
      return result.data;
    },
    { includeDrafts },
  );
  return items
    .filter((i) => includeDrafts || !i.meta.draft)
    .sort((a, b) => b.meta.publishedAt.localeCompare(a.meta.publishedAt));
}

export async function loadCaseStudies({
  includeDrafts = false,
}: { includeDrafts?: boolean } = {}): Promise<Loaded<CaseStudy>[]> {
  const items = await loadDir(
    "case-studies",
    (data, file) => {
      const result = caseStudySchema.safeParse(data);
      if (!result.success) {
        throw new Error(`Invalid frontmatter in ${file}:\n${result.error.message}`);
      }
      return result.data;
    },
    { includeDrafts },
  );
  return items
    .filter((i) => includeDrafts || !i.meta.draft)
    .sort((a, b) => b.meta.publishedAt.localeCompare(a.meta.publishedAt));
}

export async function loadModules({
  includeDrafts = false,
}: { includeDrafts?: boolean } = {}): Promise<Loaded<Module>[]> {
  const items = await loadDir(
    "modules",
    (data, file) => {
      const result = moduleSchema.safeParse(data);
      if (!result.success) {
        throw new Error(`Invalid frontmatter in ${file}:\n${result.error.message}`);
      }
      return result.data;
    },
    { includeDrafts },
  );
  return items
    .filter((i) => includeDrafts || !i.meta.draft)
    .sort((a, b) => a.meta.order - b.meta.order);
}

export async function loadCompares({
  includeDrafts = false,
}: { includeDrafts?: boolean } = {}): Promise<Loaded<Compare>[]> {
  const items = await loadDir(
    "compare",
    (data, file) => {
      const result = compareSchema.safeParse(data);
      if (!result.success) {
        throw new Error(`Invalid frontmatter in ${file}:\n${result.error.message}`);
      }
      return result.data;
    },
    { includeDrafts },
  );
  return items
    .filter((i) => includeDrafts || !i.meta.draft)
    .sort((a, b) => b.meta.publishedAt.localeCompare(a.meta.publishedAt));
}

export async function loadGraphics({
  includeDrafts = false,
}: { includeDrafts?: boolean } = {}): Promise<Loaded<GraphicsItem>[]> {
  const items = await loadDir(
    "graphics",
    (data, file) => {
      const result = graphicsItemSchema.safeParse(data);
      if (!result.success) {
        throw new Error(`Invalid frontmatter in ${file}:\n${result.error.message}`);
      }
      return result.data;
    },
    { includeDrafts },
  );
  return items
    .filter((i) => includeDrafts || !i.meta.draft)
    .sort((a, b) => a.meta.order - b.meta.order || b.meta.year - a.meta.year);
}

export async function loadHomeBlock(name: "hero" | "proof"): Promise<Loaded<HomeBlock>> {
  const file = path.join(CONTENT_ROOT, "home", `${name}.mdx`);
  const raw = await fs.readFile(file, "utf-8");
  const { data, content } = matter(raw);
  const result = homeBlockSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`Invalid frontmatter in ${file}:\n${result.error.message}`);
  }
  return { meta: result.data, body: content, filepath: file };
}

export async function loadPage(name: string): Promise<Loaded<Page>> {
  const file = path.join(CONTENT_ROOT, "pages", `${name}.mdx`);
  const raw = await fs.readFile(file, "utf-8");
  const { data, content } = matter(raw);
  const result = pageSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`Invalid frontmatter in ${file}:\n${result.error.message}`);
  }
  return { meta: result.data, body: content, filepath: file };
}
