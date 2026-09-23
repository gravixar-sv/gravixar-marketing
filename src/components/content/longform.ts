import { headingId } from "@/content/mdx";

// Server-side helpers for the long-form pages (posts, comparisons, modules,
// graphics, privacy). Everything here reads the RAW MDX string, before it is
// compiled, so a table of contents and a reading time cost nothing at runtime.

export type TocItem = { id: string; text: string };

// Inline markdown to the text a reader sees. Only the syntax that can appear in
// a heading matters: links keep their label, emphasis and code markers drop,
// entities drop (the rendered "&" is stripped by headingId anyway).
function plain(md: string): string {
  return md
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(\*|_)(.+?)\1/g, "$2")
    .replace(/&[a-z]+;/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// The h2s of an MDX body, in order, with the SAME ids the MDX map stamps on
// them. headingId is imported rather than copied, so the rail can never point
// at an anchor the page does not have. Headings inside fenced code are skipped.
export function extractToc(source: string): TocItem[] {
  const items: TocItem[] = [];
  let fenced = false;
  for (const line of source.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const m = /^##\s+(.+?)\s*#*\s*$/.exec(line);
    if (!m?.[1]) continue;
    const text = plain(m[1]);
    const id = headingId(text);
    if (id) items.push({ id, text });
  }
  return items;
}

// Minutes at 230 words a minute, never less than one. Counted on the body only,
// so frontmatter and the title do not inflate it.
export function readingMinutes(source: string): number {
  const words = source
    .replace(/```[\s\S]*?```/g, " ")
    .split(/\s+/)
    .filter((w) => /[A-Za-z0-9]/.test(w)).length;
  return Math.max(1, Math.round(words / 230));
}

const LONG_DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

// "2026-09-11" to "11 September 2026". UTC on both sides, so the date a reader
// sees never shifts by a day with the server's timezone.
export function longDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : LONG_DATE.format(d);
}
