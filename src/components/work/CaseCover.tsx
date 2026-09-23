import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";
import styles from "./CaseCover.module.css";

// The cover for a case study. There is no product photography, and client
// screens never leave the building, so a cover is a crafted, honest drawing
// instead: a lit frame with the ember light falling in from above, a fine
// grid, and a schematic line drawing that abstracts the shape of the work (a
// 12-step funnel, a two-lane queue, a review loop). It says "schematic" on the
// detail page so nobody reads it as a screen.
//
// One key figure or phrase rides on top in display type. Every figure here is
// already printed in its study (frontmatter or body), in the same number; the
// cover only re-sets it. Change the study, change this map.
//
// The figure names what the DRAWING shows, not the headline: the h1 and the
// lede already carry the headline number, and a cover that repeats it reads as
// padding. So the funnel cover says "12 fixed steps", not "~10 min".
//
// Variants:
//   detail  full width under the case-study header: client, figure, caption,
//           schematic with annotations (annotations from sm up)
//   card    index tiers: figure plus schematic, no annotations
//   thumb   rows and the next-study handoff: schematic only, heavier strokes
//
// Coral appears in exactly one drawing, the agency OS review loop, and only
// on the detail cover from sm up, where the "client approval" label sits on
// it: that node IS the human decision. Unlabelled (cards, thumbs, phones) it
// is ink like everything else, so it never competes with the page's one
// primary action.

type Variant = "detail" | "card" | "thumb";

type Note = { x: number; y: number; text: string; align?: "start" | "middle" | "end" };

type ArtProps = { variant: Variant };

type Spec = {
  /** the one figure or phrase, set in display type */
  figure: string;
  /** a plain line under the figure (detail only) */
  caption: string;
  art: (p: ArtProps) => ReactNode;
  /** annotations in viewBox units (1600 x 600), detail only */
  notes?: Note[];
  /** the vertical slice [top, bottom] of the 1600 x 600 space that holds the
   *  drawing and its notes. The detail cover crops to it, so the drawing sits
   *  a steady distance under the caption instead of behind an empty band. */
  box: [number, number];
};

// Art box is 16:6. All coordinates below live in a 1600 x 600 viewBox, and the
// HTML annotations are placed by the same numbers as percentages, which is
// exact because the box carries the viewBox's own aspect ratio.
const VB_W = 1600;
const VB_H = 600;

const line = "stroke-ink-600";
const lineSoft = "stroke-ink-700";
const ns = { vectorEffect: "non-scaling-stroke" } as const;

function Funnel() {
  // bs-hub: every inquiry moves through 12 fixed steps, first inquiry to a
  // live project. The dashed arc is the revision branch back into the loop.
  const xs = Array.from({ length: 12 }, (_, i) => 90 + i * (1420 / 11));
  const y = 340;
  return (
    <>
      {xs.map((x, i) => (
        <line key={`g${i}`} x1={x} x2={x} y1={70} y2={560} className={lineSoft} strokeWidth={1} strokeDasharray="2 6" {...ns} />
      ))}
      <line x1={90} x2={1510} y1={y} y2={y} className="stroke-ink-500" strokeWidth={1.25} {...ns} />
      <path
        d={`M${xs[9]} ${y - 30} C${xs[9]} 150 ${xs[7]} 150 ${xs[7]} ${y - 30}`}
        fill="none"
        className="stroke-ink-500"
        strokeWidth={1.25}
        strokeDasharray="6 7"
        {...ns}
      />
      <path d={`M${xs[7]! - 9} ${y - 44} L${xs[7]} ${y - 30} L${xs[7]! + 9} ${y - 44}`} fill="none" className="stroke-ink-500" strokeWidth={1.25} {...ns} />
      {xs.map((x, i) => {
        const last = i === xs.length - 1;
        // Nodes brighten along the path: the eye reads left to right.
        const tone = i < 4 ? "stroke-ink-500" : i < 8 ? "stroke-ink-400" : "stroke-ink-300";
        return (
          <g key={x}>
            {last ? <circle cx={x} cy={y} r={48} className="fill-none stroke-ink-500" strokeWidth={1} {...ns} /> : null}
            <circle
              cx={x}
              cy={y}
              r={last ? 30 : 22}
              className={last ? "fill-ink-100 stroke-ink-100" : cn("fill-ink-950", tone)}
              strokeWidth={1.5}
              {...ns}
            />
          </g>
        );
      })}
    </>
  );
}

function TwoLanes() {
  // beeline: 125 applications waiting on the team, 1,560 waiting on payers.
  // One square is about 20 applications: 6 in the team's lane, 78 (three
  // rows of 26) in the payers' lane. The imbalance is the point.
  const cols = 26;
  const pitch = 1420 / cols;
  const size = 38;
  const x0 = 90;
  const sq = (c: number, y: number, cls: string, key: string) => (
    <rect key={key} x={x0 + c * pitch} y={y} width={size} height={size} rx={7} className={cls} />
  );
  return (
    <>
      {Array.from({ length: 6 }, (_, c) => sq(c, 96, "fill-ink-100", `t${c}`))}
      {[0, 1, 2].flatMap((r) =>
        Array.from({ length: cols }, (_, c) => sq(c, 296 + r * 56, "fill-ink-700", `p${r}-${c}`)),
      )}
    </>
  );
}

function ReviewLoop({ variant }: ArtProps) {
  // agency OS: submitted, reviewed inside the agency, sent for client
  // approval. Every version is kept (the ghost outlines), and a recall pulls a
  // draft back (the dashed return). The approval node is the human decision,
  // so it takes coral only where its label is visible (detail, sm up).
  const pill = (cx: number) => ({ x: cx - 150, y: 258, width: 300, height: 84, rx: 42 });
  const decided =
    variant === "detail" ? "fill-ink-900 stroke-ink-300 sm:fill-brand/10 sm:stroke-brand" : "fill-ink-900 stroke-ink-300";
  return (
    <>
      <rect {...pill(328)} className="fill-none stroke-ink-700" strokeWidth={1} {...ns} />
      <rect {...pill(314)} y={272} className="fill-none stroke-ink-700" strokeWidth={1} {...ns} />
      <rect {...pill(300)} y={286} className="fill-ink-950 stroke-ink-500" strokeWidth={1.25} {...ns} />
      <rect {...pill(800)} y={286} className="fill-ink-950 stroke-ink-500" strokeWidth={1.25} {...ns} />
      <rect {...pill(1300)} y={286} className={decided} strokeWidth={1.5} {...ns} />
      <path d="M460 328 H630" className="stroke-ink-500" strokeWidth={1} {...ns} />
      <path d="M622 320 L632 328 L622 336" fill="none" className="stroke-ink-500" strokeWidth={1} {...ns} />
      <path d="M960 328 H1130" className="stroke-ink-500" strokeWidth={1} {...ns} />
      <path d="M1122 320 L1132 328 L1122 336" fill="none" className="stroke-ink-500" strokeWidth={1} {...ns} />
      <path
        d="M1300 380 C1300 540 300 540 300 380"
        fill="none"
        className="stroke-ink-500"
        strokeWidth={1}
        strokeDasharray="5 6"
        {...ns}
      />
      <path d="M292 390 L300 378 L308 390" fill="none" className="stroke-ink-500" strokeWidth={1} {...ns} />
    </>
  );
}

function Week() {
  // Driving school: a course is a run of consecutive lesson days at one hour,
  // and a slot is offered only when ONE instructor covers every day of it.
  // Row 2 can (the bar). Row 1 has a day off, row 3 a booked day. Sunday is
  // closed (hatched).
  const cols = 7;
  const w = 176;
  const gap = 24;
  const x0 = 104;
  const rows = [150, 280, 410];
  const h = 104;
  const cx = (c: number) => x0 + c * (w + gap);
  return (
    <>
      <defs>
        <pattern id="cc-hatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="14" className="stroke-ink-700" strokeWidth={2} />
        </pattern>
      </defs>
      {rows.map((y) =>
        Array.from({ length: cols }, (_, c) => (
          <rect
            key={`${y}-${c}`}
            x={cx(c)}
            y={y}
            width={w}
            height={h}
            rx={10}
            fill={c === 6 ? "url(#cc-hatch)" : "none"}
            className={c === 6 ? "stroke-ink-700" : lineSoft}
            strokeWidth={1}
            {...ns}
          />
        )),
      )}
      {/* row 1: a day off, so this instructor cannot cover the run */}
      <path
        d={`M${cx(3) + 58} ${rows[0]! + 32} L${cx(3) + 118} ${rows[0]! + 72} M${cx(3) + 118} ${rows[0]! + 32} L${cx(3) + 58} ${rows[0]! + 72}`}
        className="stroke-ink-500"
        strokeWidth={1}
        {...ns}
      />
      {/* row 3: a day already booked */}
      <rect x={cx(2) + 14} y={rows[2]! + 30} width={w - 28} height={44} rx={8} className="fill-ink-700" />
      {/* row 2: one instructor covers every lesson day, Tuesday to Saturday */}
      <rect x={cx(1) + 14} y={rows[1]! + 30} width={cx(5) + w - 14 - (cx(1) + 14)} height={44} rx={22} className="fill-ink-200" />
    </>
  );
}

function Growth() {
  // monday.com rollout: 10 users to 50+, rolled out in four phases.
  return (
    <>
      <defs>
        <linearGradient id="cc-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-ink-100)" stopOpacity="0.1" />
          <stop offset="1" stopColor="var(--color-ink-100)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[100, 450, 800, 1150, 1500].map((x) => (
        <line key={x} x1={x} x2={x} y1={96} y2={500} className={lineSoft} strokeWidth={1} strokeDasharray="2 6" {...ns} />
      ))}
      <line x1={100} x2={1500} y1={500} y2={500} className={line} strokeWidth={1} {...ns} />
      <path d="M100 452 C520 444 860 330 1120 236 S1420 146 1500 132 V500 H100 Z" fill="url(#cc-area)" />
      <path
        d="M100 452 C520 444 860 330 1120 236 S1420 146 1500 132"
        fill="none"
        className="stroke-ink-300"
        strokeWidth={2}
        {...ns}
      />
      <circle cx={100} cy={452} r={14} className="fill-ink-950 stroke-ink-400" strokeWidth={1.5} {...ns} />
      <circle cx={1500} cy={132} r={48} className="fill-none stroke-ink-500" strokeWidth={1} {...ns} />
      <circle cx={1500} cy={132} r={20} className="fill-ink-100" />
    </>
  );
}

function Stream() {
  // LucidLink + Wasabi: three seats stream live projects from one filespace,
  // and finished work flows on to a cheaper archive.
  const seats = [170, 300, 430];
  return (
    <>
      {seats.map((y) => (
        <g key={y}>
          <rect x={96} y={y - 34} width={120} height={68} rx={10} className="fill-ink-950 stroke-ink-500" strokeWidth={1.25} {...ns} />
          <path d={`M216 ${y} C330 ${y} 380 300 470 300`} fill="none" className="stroke-ink-500" strokeWidth={1} {...ns} />
        </g>
      ))}
      <circle cx={520} cy={300} r={50} className="fill-ink-950 stroke-ink-300" strokeWidth={1.5} {...ns} />
      <circle cx={520} cy={300} r={16} className="fill-ink-300" />
      {[-72, -36, 0, 36, 72].map((d, i) => (
        <path
          key={d}
          d={`M572 ${300 + d * 0.3} C780 ${300 + d * 1.6} 960 ${300 - d * 0.6} 1176 ${300 + d}`}
          fill="none"
          className={i === 2 ? "stroke-ink-400" : "stroke-ink-600"}
          strokeWidth={1}
          strokeDasharray={i === 2 ? undefined : "3 9"}
          {...ns}
        />
      ))}
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={1190 + i * 18}
          y={176 + i * 22}
          width={280}
          height={210}
          rx={14}
          className={i === 2 ? "fill-ink-900 stroke-ink-500" : "fill-ink-950 stroke-ink-600"}
          strokeWidth={1}
          {...ns}
        />
      ))}
      {[0, 1, 2].map((i) => (
        <line key={`s${i}`} x1={1256} x2={1470} y1={286 + i * 36} y2={286 + i * 36} className="stroke-ink-600" strokeWidth={1} {...ns} />
      ))}
    </>
  );
}

function FilmStrip() {
  // Motion-design portfolio: a reel. A ball travels through five frames the
  // way a keyframed animation does, then the strip runs out of the frame:
  // handed over.
  const frames = [80, 370, 660, 950, 1240];
  const ball = [
    { x: 70, y: 110 },
    { x: 120, y: 60 },
    { x: 140, y: 42 },
    { x: 160, y: 60 },
    { x: 210, y: 110 },
  ];
  const holes = Array.from({ length: 26 }, (_, i) => 70 + i * 58);
  return (
    <>
      <line x1={40} x2={1560} y1={150} y2={150} className={line} strokeWidth={1} {...ns} />
      <line x1={40} x2={1560} y1={450} y2={450} className={line} strokeWidth={1} {...ns} />
      {holes.map((x) => (
        <g key={x}>
          <rect x={x} y={166} width={26} height={16} rx={4} className="fill-none stroke-ink-700" strokeWidth={1} {...ns} />
          <rect x={x} y={418} width={26} height={16} rx={4} className="fill-none stroke-ink-700" strokeWidth={1} {...ns} />
        </g>
      ))}
      {frames.map((x, i) => (
        <g key={x}>
          <rect
            x={x}
            y={206}
            width={270}
            height={188}
            rx={8}
            className={i === 2 ? "fill-ink-900 stroke-ink-400" : "fill-ink-950 stroke-ink-600"}
            strokeWidth={1}
            {...ns}
          />
          <line x1={x + 24} x2={x + 246} y1={206 + 160} y2={206 + 160} className="stroke-ink-700" strokeWidth={1} {...ns} />
          <circle
            cx={x + ball[i]!.x}
            cy={206 + ball[i]!.y}
            r={22}
            className={i === 2 ? "fill-ink-100" : "fill-none stroke-ink-500"}
            strokeWidth={1.25}
            {...ns}
          />
        </g>
      ))}
    </>
  );
}

function Plain() {
  return <line x1={100} x2={1500} y1={300} y2={300} className={line} strokeWidth={1} {...ns} />;
}

const COVERS: Record<string, Spec> = {
  "bs-hub": {
    figure: "12 fixed steps",
    caption: "Every inquiry takes the same path to a live project, and every step is logged.",
    art: Funnel,
    box: [110, 490],
    notes: [
      { x: 68, y: 420, text: "first inquiry", align: "start" },
      { x: 1510, y: 446, text: "live project", align: "end" },
      { x: 1123, y: 150, text: "revision", align: "middle" },
    ],
  },
  beeline: {
    figure: "125 vs 1,560",
    caption: "Applications waiting on the team, against applications waiting on insurers. The workbook could not tell them apart.",
    art: TwoLanes,
    box: [40, 520],
    notes: [
      { x: 90, y: 62, text: "waiting on the team", align: "start" },
      { x: 90, y: 262, text: "waiting on insurers", align: "start" },
      { x: 1510, y: 500, text: "1 square ≈ 20 applications", align: "end" },
    ],
  },
  "agency-operations-platform": {
    figure: "Every version kept",
    caption: "So which draft a client approved is a lookup, not an argument.",
    art: ReviewLoop,
    box: [230, 570],
    notes: [
      { x: 300, y: 328, text: "submitted", align: "middle" },
      { x: 800, y: 328, text: "internal review", align: "middle" },
      { x: 1300, y: 328, text: "client approval", align: "middle" },
      { x: 800, y: 548, text: "recall", align: "middle" },
    ],
  },
  "driving-school-booking-pwa": {
    figure: "Whole course, or no slot",
    caption: "A slot only appears when one instructor is free for every lesson day of the course.",
    art: Week,
    box: [95, 570],
    notes: [
      ...["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d, c) => ({
        x: 104 + c * 200 + 88,
        y: 118,
        text: d,
        align: "middle" as const,
      })),
      { x: 1392, y: 548, text: "closed", align: "middle" },
      { x: 700, y: 548, text: "one instructor, every lesson day", align: "middle" },
    ],
  },
  "monday-rollout-agency": {
    figure: "Four phases",
    caption: "Delivery teams first, then Ops, then the Dubai managers, then the wider teams.",
    art: Growth,
    box: [70, 570],
    notes: [
      { x: 275, y: 548, text: "phase 1", align: "middle" },
      { x: 625, y: 548, text: "phase 2", align: "middle" },
      { x: 975, y: 548, text: "phase 3", align: "middle" },
      { x: 1325, y: 548, text: "phase 4", align: "middle" },
    ],
  },
  "lucidlink-wasabi": {
    figure: "Like a local drive",
    caption: "Each seat streams only the files it opens. Finished work moves on to a cheaper archive.",
    art: Stream,
    box: [110, 490],
    notes: [
      { x: 520, y: 390, text: "live projects", align: "middle" },
      { x: 1348, y: 470, text: "archive", align: "middle" },
    ],
  },
  "motion-design-portfolio": {
    figure: "Fast, clean, and theirs",
    caption: "A motion studio is judged on how its work looks the moment it loads.",
    art: FilmStrip,
    box: [130, 470],
  },
};

const FALLBACK: Spec = { figure: "", caption: "", art: Plain, box: [250, 350] };

export function coverFor(slug: string): Spec {
  return COVERS[slug] ?? FALLBACK;
}

export function CaseCover({
  slug,
  client,
  variant = "card",
  animate = false,
  className,
}: {
  slug: string;
  /** the client descriptor, shown on the detail cover only */
  client?: string;
  variant?: Variant;
  /** page-arrival draw-in, for the detail cover above the fold */
  animate?: boolean;
  className?: string;
}) {
  const spec = coverFor(slug);
  const Art = spec.art;
  const detail = variant === "detail";
  const thumb = variant === "thumb";
  // Cards and thumbs keep the full 16:6 box: the card figure sits in its
  // empty top. The detail cover crops to the drawing.
  const [y0, y1] = detail ? spec.box : [0, VB_H];
  const vh = y1 - y0;

  return (
    <figure
      aria-hidden={detail ? undefined : true}
      className={cn(
        "frame-lit relative isolate m-0 overflow-hidden",
        // The detail cover is laid out in flow, caption above drawing, so the
        // caption can show at every width without ever sitting on the art.
        detail ? "rounded-2xl" : "aspect-[16/10] rounded-xl",
        className,
      )}
    >
      {/* Light and material: the ember falls in from above, over a fine grid
          that fades out before the edges. */}
      <div aria-hidden className={cn("ember-horizon pointer-events-none absolute inset-0", styles.ember)} />
      <div aria-hidden className={cn("pointer-events-none absolute inset-0", styles.grid)} />

      {detail ? (
        <figcaption className="relative flex items-start justify-between gap-6 px-5 pt-5 sm:px-8 sm:pt-8 lg:px-10 lg:pt-10">
          <span className={cn("block min-w-0", animate && "hero-enter [animation-delay:160ms]")}>
            {client ? <span className="block max-w-[40ch] text-caption text-ink-300">{client}</span> : null}
            {spec.figure ? (
              <span className="mt-3 block font-display text-[clamp(2.5rem,1.4rem+3.6vw,4.75rem)] font-semibold leading-[0.95] tracking-[-0.035em] text-ink-50 [font-stretch:94%] sm:mt-4">
                {spec.figure}
              </span>
            ) : null}
            {spec.caption ? (
              <span className="mt-3 block max-w-[34ch] text-caption text-ink-400">{spec.caption}</span>
            ) : null}
          </span>
          <span className="shrink-0 pt-0.5 font-mono text-label-xs uppercase text-ink-500">schematic</span>
        </figcaption>
      ) : null}

      {!detail && !thumb && spec.figure ? (
        <span
          aria-hidden
          className="absolute left-0 top-0 p-5 font-display text-[clamp(1.75rem,1.2rem+1.6vw,2.75rem)] font-semibold leading-none tracking-[-0.03em] text-ink-50 [font-stretch:94%] sm:p-6"
        >
          {spec.figure}
        </span>
      ) : null}

      <div
        aria-hidden
        className={cn(
          detail
            ? "relative mx-[5%] mb-[5%] mt-8 sm:mt-10"
            : thumb
              ? // centred by arithmetic, not translate: the hover drift owns `translate`
                "absolute inset-x-[7%] top-[24%] aspect-[16/6]"
              : "absolute inset-x-[6%] bottom-[9%] aspect-[16/6]",
          styles.art,
          animate && styles.draw,
        )}
        style={detail ? { aspectRatio: `${VB_W} / ${vh}` } : undefined}
      >
        <svg
          viewBox={`0 ${y0} ${VB_W} ${vh}`}
          className={cn(
            "absolute inset-0 h-full w-full",
            detail ? "overflow-hidden" : "overflow-visible",
            thumb && styles.thumb,
          )}
          fill="none"
          focusable="false"
        >
          <Art variant={variant} />
        </svg>
        {detail && spec.notes
          ? spec.notes.map((n) => (
              <span
                key={n.text}
                className="absolute hidden whitespace-nowrap font-mono text-label-xs text-ink-400 sm:block"
                style={
                  {
                    left: `${(n.x / VB_W) * 100}%`,
                    top: `${((n.y - y0) / vh) * 100}%`,
                    transform: `translate(${n.align === "end" ? "-100%" : n.align === "middle" ? "-50%" : "0"}, -50%)`,
                  } as CSSProperties
                }
              >
                {n.text}
              </span>
            ))
          : null}
      </div>
    </figure>
  );
}
