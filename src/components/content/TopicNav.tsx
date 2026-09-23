import Link from "next/link";
import { TAG_HUB_MAX_SHARE, type TagHub } from "@/lib/blog-tags";
import { cn } from "@/lib/cn";
import { TopicStrip } from "./TopicStrip";

// The topics row that opens /blog and every tag hub. One pattern for both, so
// moving between them never changes the page's shape: "All" is current on the
// index, the hub's own topic is current on a hub.
//
// Human labels with counts ("Client portals · 5"), never raw slugs. The
// current item is marked by weight and an underline, not coral: coral on this
// site means a person deciding something, and a filter is wayfinding.
//
// ONLY TOPICS THAT FILTER. A topic on nearly every post (the same share rule
// that keeps its hub out of the search index) is left out of the row:
// clicking it showed almost the same list as "All", and two of them sat next
// to a near-synonym ("Operations", "Agency operations", "Ops infrastructure"),
// so the row offered three ways to narrow nothing. Rows and a post's "Filed
// under" line drop them for the same reason. The hub routes still exist
// (noindex), and on a common hub's own page its item stays in the row, so the
// reader can still see where they are. Order is by size, as loadTagHubs gives.
//
// On a phone the row scrolls sideways inside its own strip rather than
// wrapping into four rows of 44px targets above the first post. The strip
// bleeds to the screen edges and fades on the right, which says "more this
// way" without an arrow; TopicStrip brings the current topic into view. The
// left edge fades over the 24px gutter too, which is empty until the row is
// scrolled, so a topic scrolled past never shows as a clipped stray glyph.
export function TopicNav({
  hubs,
  total,
  current,
}: {
  hubs: TagHub[];
  total: number;
  /** Tag slug of the hub being viewed; omit on /blog. */
  current?: string;
}) {
  const common = (h: TagHub) => total > 0 && h.posts.length / total > TAG_HUB_MAX_SHARE;
  const shown = hubs.filter((h) => !common(h) || h.slug === current);
  const items = [
    { href: "/blog", label: "All", count: total, active: !current },
    ...shown.map((h) => ({
      href: `/blog/tag/${h.slug}`,
      label: h.label,
      count: h.posts.length,
      active: h.slug === current,
    })),
  ];
  return (
    <nav aria-label="Topics" className="-mx-6 md:mx-0">
      <TopicStrip
        current={current ?? ""}
        className="flex gap-x-5 overflow-x-auto whitespace-nowrap px-6 [mask-image:linear-gradient(90deg,transparent,#000_1.5rem,#000_82%,transparent)] [scrollbar-width:none] md:flex-wrap md:gap-x-6 md:gap-y-0.5 md:overflow-visible md:px-0 md:[mask-image:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((it) => (
          <li key={it.href} className="shrink-0">
            <Link
              href={it.href}
              aria-current={it.active ? "page" : undefined}
              className={cn(
                "group inline-flex min-h-11 items-center gap-2 text-[0.9375rem] transition-colors pointer-fine:min-h-9",
                it.active ? "text-ink-50" : "text-ink-400 hover:text-ink-100",
              )}
            >
              <span
                className={cn(
                  it.active &&
                    "font-medium underline decoration-line-strong decoration-1 underline-offset-[0.45em]",
                )}
              >
                {it.label}
              </span>
              <span aria-hidden className="text-ink-600">
                ·
              </span>
              <span className="text-caption tabular-nums text-ink-500">{it.count}</span>
            </Link>
          </li>
        ))}
        {/* Keeps the last item clear of the fade on a phone. */}
        <li aria-hidden className="w-6 shrink-0 md:hidden" />
      </TopicStrip>
    </nav>
  );
}
