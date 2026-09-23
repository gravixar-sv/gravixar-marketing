import Image from "next/image";
import Link from "next/link";
import type { TagInfo } from "./blog";

// The close of a post: who wrote it, how it was written, and where the topic
// continues. The AI disclosure is plain text in the author's own words, not a
// coral flag: it is a fact about the post, not a decision.
export function AuthorNote({
  name,
  aiAssisted,
  topics,
}: {
  name: string;
  aiAssisted: boolean;
  topics: TagInfo[];
}) {
  return (
    <section aria-label="About this post" className="card-surface max-w-[68ch] rounded-2xl p-6 text-prose md:p-7">
      <div className="flex items-start gap-4">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-full bg-ink-800 ring-1 ring-line">
          {/* Cropped to the face from the About portrait: the source is a
              square half-length shot, so the crop scales about the face. */}
          <Image
            src="/about/qamar.jpg"
            alt=""
            fill
            sizes="112px"
            className="origin-[57%_32%] scale-[2.1] object-cover"
          />
        </div>
        <div className="min-w-0">
          <p className="text-[0.9375rem] font-semibold text-ink-100">{name}</p>
          <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-400">
            {aiAssisted
              ? "Written with an AI draft, edited and approved by Qamar."
              : "Written by Qamar."}{" "}
            <Link href="/about" className="link-quiet whitespace-nowrap">
              About Qamar
            </Link>
          </p>
        </div>
      </div>
      {topics.length > 0 ? (
        <div className="mt-6 border-t border-line-soft pt-5 text-caption md:flex md:items-baseline md:gap-4">
          <p className="text-ink-500">Filed under</p>
          <ul className="mt-1 flex flex-wrap gap-x-5 md:mt-0 md:gap-x-4">
            {topics.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/blog/tag/${t.slug}`}
                  className="inline-flex min-h-11 items-center text-ink-300 transition-colors hover:text-ink-50 pointer-fine:min-h-0"
                >
                  {t.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
