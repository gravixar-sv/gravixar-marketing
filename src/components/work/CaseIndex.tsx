import Link from "next/link";
import { ViewTransition } from "react";
import { Arrow } from "@/components/ui/Button";
import type { CaseStudy } from "@/content/schema";
import { cn } from "@/lib/cn";
import { CaseCover } from "./CaseCover";
import { keepCompounds } from "./model";
import styles from "./CaseIndex.module.css";

// The /work index in three tiers, by curated order: the lead study as a wide
// feature, the next two as a pair, the rest as editorial rows. Card titles
// carry the same morph name as the study's h1, so the title glides into place
// on the way in and back out again.

type Study = { meta: CaseStudy; broke: boolean };

function Meta({ meta }: { meta: CaseStudy }) {
  return (
    <p className="text-caption text-ink-400">
      {keepCompounds(meta.client)}{" "}
      {/* On phones the period takes its own line rather than wrapping with a
          stranded separator at its head. */}
      <span className="mt-0.5 block sm:mt-0 sm:inline sm:whitespace-nowrap">
        <span aria-hidden className="hidden pl-1 pr-2 text-ink-600 sm:inline">
          ·
        </span>
        {meta.period}
      </span>
    </p>
  );
}

function BrokeMark() {
  return <span className="text-caption text-ink-400">Includes what broke</span>;
}

function ReadMore() {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium text-ink-100">
      <span className="link-draw">Read the case study</span>
      <Arrow />
    </span>
  );
}

function Title({ slug, as: Tag = "h2", className, children }: {
  slug: string;
  as?: "h2" | "h3";
  className?: string;
  children: string;
}) {
  return (
    <ViewTransition name={`case-${slug}`} share="morph-title" default="none">
      <Tag className={className}>{keepCompounds(children)}</Tag>
    </ViewTransition>
  );
}

export function FeaturedCase({ study }: { study: Study }) {
  const { meta } = study;
  return (
    <Link href={`/work/${meta.slug}`} className="group grid gap-7 lg:grid-cols-12 lg:items-end lg:gap-12">
      <CaseCover slug={meta.slug} variant="card" className="card-hover-glow lg:col-span-7" />
      <div className="lg:col-span-5 lg:pb-1">
        <Meta meta={meta} />
        <Title slug={meta.slug} className="mt-3 max-w-[20ch] text-section font-semibold text-ink-50">
          {meta.title}
        </Title>
        <p className="mt-4 max-w-[44ch] text-ink-300">{meta.homeLine ?? meta.summary}</p>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          <ReadMore />
          {study.broke ? <BrokeMark /> : null}
        </div>
      </div>
    </Link>
  );
}

export function PairCase({ study }: { study: Study }) {
  const { meta } = study;
  return (
    <Link href={`/work/${meta.slug}`} className="group block">
      <CaseCover slug={meta.slug} variant="card" className="card-hover-glow" />
      <div className="mt-6">
        <Meta meta={meta} />
        <Title slug={meta.slug} className="mt-3 max-w-[26ch] text-[1.625rem] font-semibold leading-[1.15] tracking-[-0.02em] text-ink-50 md:text-subsection">
          {meta.title}
        </Title>
        <p className="mt-3 max-w-[48ch] text-ink-300">{meta.homeLine ?? meta.summary}</p>
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
          <ReadMore />
          {study.broke ? <BrokeMark /> : null}
        </div>
      </div>
    </Link>
  );
}

export function CaseRow({ study }: { study: Study }) {
  const { meta } = study;
  return (
    <li>
      <Link
        href={`/work/${meta.slug}`}
        className={cn(
          "group relative grid gap-3 border-t border-line py-8 md:grid-cols-12 md:gap-8 md:py-10",
          styles.row,
        )}
      >
        <div className="md:col-span-3">
          <p className="text-caption text-ink-300">{keepCompounds(meta.client)}</p>
          <p className="mt-1 text-caption text-ink-500">{meta.period}</p>
        </div>
        <div className="md:col-span-6">
          <Title
            slug={meta.slug}
            as="h3"
            className="max-w-[30ch] text-reference font-semibold text-ink-50 md:text-[1.625rem] md:leading-[1.18]"
          >
            {meta.title}
          </Title>
          <p className="mt-3 max-w-[52ch] text-[0.9375rem] leading-relaxed text-ink-400">
            {meta.homeLine ?? meta.summary}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-ink-200">
              <span className="link-draw">Read</span>
              <Arrow />
            </span>
            {study.broke ? <BrokeMark /> : null}
          </div>
        </div>
        <div className="hidden md:col-span-3 md:block">
          <CaseCover slug={meta.slug} variant="thumb" />
        </div>
      </Link>
    </li>
  );
}
