import type { CSSProperties, ReactNode } from "react";
import { SetFigure } from "@/components/site/SetFigure";
import { cn } from "@/lib/cn";
import { keepCompounds } from "./model";
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
//   detail  full width under the case-study header: figure, caption, and the
//           schematic with annotations. The annotations need sm and up; on a
//           phone they would collide, so a short key under the drawing
//           says the same thing in words, one item per line.
//   card    index tiers: figure, a short plain caption, schematic, no
//           annotations
//   thumb   rows and the next-study handoff: schematic only, heavier strokes
//
// Coral appears in exactly one drawing, the agency OS review loop, and only
// on the detail cover from sm up, where the "client approval" label sits on
// it: that node IS the human decision. Unlabelled (cards, thumbs, phones) it
// is ink like everything else, so it never competes with the page's one
// primary action.
//
// THE BUILD. Each drawing is laid down in the order its story is told, not
// wiped on as one picture: the funnel's steps in sequence and its revision arc
// running back, the payers' queue still filling long after the team's is done,
// the one instructor's bar landing last. Every moving element names a role
// (how it arrives) plus a start and a duration in ms (see `at`), and one of two
// drivers on the frame turns those numbers into motion (CaseCover.module.css):
//   arrival  `animate`: page-load keyframes, for a cover in the first viewport
//            (the detail cover, the lead card on /work). The figure sets in
//            type just ahead of the drawing.
//   scroll   every other card and thumb: the same numbers on the frame's view
//            timeline, so the build assembles as the cover scrolls in and is
//            done by the time the whole frame is in view.
// THE BASE STATE IS THE FINISHED DRAWING. All hiding lives in the backwards
// fill of a running animation, so no driver, an inactive timeline, print and
// reduced motion all show the complete drawing. No JS: this stays a server
// component (ledger: ui-css-first-reveals-no-ticker-gated-visibility).

type Variant = "detail" | "card" | "thumb";

type Note = {
  x: number;
  y: number;
  text: string;
  align?: "start" | "middle" | "end";
  /** ms into the arrival build when the label fades in, beside what it names */
  t?: number;
};

type ArtProps = { variant: Variant };

type Spec = {
  /** the one figure or phrase, set in display type */
  figure: string;
  /** a plain line under the figure (detail only) */
  caption: string;
  /** a few words under the figure on index cards, so the figure means
   *  something before the study has been read. Restates the study, adds
   *  nothing. */
  cardCaption?: string;
  /** the notes as a key, one short item per line, for phones, where the
   *  notes are hidden. Each item fits one line at 320px. */
  legend?: string[];
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

// How an element arrives. The keyframes live in the module CSS.
//   pop      scales up from its centre (small nodes, squares, arrowheads)
//   popSoft  a larger shape: fades in from 86% scale
//   ring     an outer ring expanding into place
//   rise     fades up into place from below
//   growX    a horizontal line growing from its left end
//   growY    a vertical line growing up from its bottom end
//   fade     opacity only
//   blink    appears at once, like a keyframe landing
//   wipeLtr  clip reveal, left to right (see Wipe)
//   wipeRtl  clip reveal, right to left
type Role = "pop" | "popSoft" | "ring" | "rise" | "growX" | "growY" | "fade" | "blink" | "wipeLtr" | "wipeRtl";

/** One step of the build: a role, a start t and a duration d, in ms after the
 *  arrival build begins. Spread after the element's own attributes.
 *  KEEP EVERY t + d AT OR UNDER 1600: the scroll driver maps 1600ms onto the
 *  end of the frame's entry range (.spanCard / .spanThumb in the module CSS),
 *  so a later step would still be building when the frame is fully in view. */
function at(role: Role, t: number, d: number, className?: string) {
  return {
    className: cn(className, styles[role]),
    style: { "--t": t, "--d": d } as CSSProperties,
  };
}

/** A clip reveal. The clip's reference box is the group's bounding box, and a
 *  flat stroke has no height, so an inset() on the path alone would clip the
 *  stroke away even at rest. The invisible rect gives the group a real box,
 *  padded past every stroke so the finished drawing is never trimmed. Dashed
 *  strokes stay dashed: the clip moves, the dashes do not. */
function Wipe({
  dir,
  t,
  d,
  box: [x, y, w, h],
  children,
}: {
  dir: "ltr" | "rtl";
  t: number;
  d: number;
  box: [number, number, number, number];
  children: ReactNode;
}) {
  return (
    <g {...at(dir === "ltr" ? "wipeLtr" : "wipeRtl", t, d)}>
      <rect x={x} y={y} width={w} height={h} fill="none" stroke="none" />
      {children}
    </g>
  );
}

function Funnel() {
  // bs-hub: every inquiry moves through 12 fixed steps, first inquiry to a
  // live project. The dashed arc is the revision branch back into the loop.
  // Build: the grid, the line, the 12 steps in order; the revision arc runs
  // back from step 10 to step 8, arrowhead last; the live project's ring
  // lands at the very end.
  const xs = Array.from({ length: 12 }, (_, i) => 90 + i * (1420 / 11));
  const y = 340;
  const x7 = xs[7]!;
  const x9 = xs[9]!;
  return (
    <>
      {xs.map((x, i) => (
        <line
          key={`g${i}`}
          x1={x}
          x2={x}
          y1={70}
          y2={560}
          strokeWidth={1}
          strokeDasharray="2 6"
          {...ns}
          {...at("fade", i * 24, 520, lineSoft)}
        />
      ))}
      <line x1={90} x2={1510} y1={y} y2={y} strokeWidth={1.25} {...ns} {...at("growX", 60, 760, "stroke-ink-500")} />
      <Wipe dir="rtl" t={740} d={460} box={[x7 - 24, 170, x9 - x7 + 48, 160]}>
        <path
          d={`M${x9} ${y - 30} C${x9} 150 ${x7} 150 ${x7} ${y - 30}`}
          fill="none"
          className="stroke-ink-500"
          strokeWidth={1.25}
          strokeDasharray="6 7"
          {...ns}
        />
      </Wipe>
      <path
        d={`M${x7 - 9} ${y - 44} L${x7} ${y - 30} L${x7 + 9} ${y - 44}`}
        fill="none"
        strokeWidth={1.25}
        {...ns}
        {...at("pop", 1080, 320, "stroke-ink-500")}
      />
      {xs.map((x, i) => {
        const last = i === xs.length - 1;
        // Nodes brighten along the path: the eye reads left to right.
        const tone = i < 4 ? "stroke-ink-500" : i < 8 ? "stroke-ink-400" : "stroke-ink-300";
        return (
          <g key={x}>
            {last ? (
              <circle cx={x} cy={y} r={48} strokeWidth={1} {...ns} {...at("ring", 1140, 460, "fill-none stroke-ink-500")} />
            ) : null}
            <circle
              cx={x}
              cy={y}
              r={last ? 30 : 22}
              strokeWidth={1.5}
              {...ns}
              {...at("pop", 150 + i * 48, 460, last ? "fill-ink-100 stroke-ink-100" : cn("fill-ink-950", tone))}
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
  // rows of 26) in the payers' lane. The imbalance is the point, so the build
  // shows it in time as well as space: the team's six are down in half a
  // second, and the payers' wave is still rolling a second later.
  const cols = 26;
  const pitch = 1420 / cols;
  const size = 38;
  const x0 = 90;
  const sq = (c: number, y: number, cls: string, key: string, t: number) => (
    <rect key={key} x={x0 + c * pitch} y={y} width={size} height={size} rx={7} {...at("pop", t, 340, cls)} />
  );
  return (
    <>
      {Array.from({ length: 6 }, (_, c) => sq(c, 96, "fill-ink-100", `t${c}`, c * 50))}
      {[0, 1, 2].flatMap((r) =>
        Array.from({ length: cols }, (_, c) => sq(c, 296 + r * 56, "fill-ink-700", `p${r}-${c}`, 200 + c * 40 + r * 28)),
      )}
    </>
  );
}

function ReviewLoop({ variant }: ArtProps) {
  // agency OS: submitted, reviewed inside the agency, sent for client
  // approval. Every version is kept (the ghost outlines), and a recall pulls a
  // draft back (the dashed return). The approval node is the human decision,
  // so it takes coral only where its label is visible (detail, sm up).
  // Build: the versions and the submitted draft, then each hop in turn, the
  // client's approval, and last the recall running back, arrowhead last.
  const pill = (cx: number) => ({ x: cx - 150, y: 258, width: 300, height: 84, rx: 42 });
  const decided =
    variant === "detail" ? "fill-ink-900 stroke-ink-300 sm:fill-brand/10 sm:stroke-brand" : "fill-ink-900 stroke-ink-300";
  return (
    <>
      <rect {...pill(328)} strokeWidth={1} {...ns} {...at("fade", 0, 480, "fill-none stroke-ink-700")} />
      <rect {...pill(314)} y={272} strokeWidth={1} {...ns} {...at("fade", 50, 480, "fill-none stroke-ink-700")} />
      <rect {...pill(300)} y={286} strokeWidth={1.25} {...ns} {...at("popSoft", 90, 520, "fill-ink-950 stroke-ink-500")} />
      <rect {...pill(800)} y={286} strokeWidth={1.25} {...ns} {...at("popSoft", 480, 520, "fill-ink-950 stroke-ink-500")} />
      <rect {...pill(1300)} y={286} strokeWidth={1.5} {...ns} {...at("popSoft", 880, 560, decided)} />
      <path d="M460 328 H630" strokeWidth={1} {...ns} {...at("growX", 260, 340, "stroke-ink-500")} />
      <path d="M622 320 L632 328 L622 336" fill="none" strokeWidth={1} {...ns} {...at("pop", 470, 280, "stroke-ink-500")} />
      <path d="M960 328 H1130" strokeWidth={1} {...ns} {...at("growX", 660, 340, "stroke-ink-500")} />
      <path d="M1122 320 L1132 328 L1122 336" fill="none" strokeWidth={1} {...ns} {...at("pop", 870, 280, "stroke-ink-500")} />
      <Wipe dir="rtl" t={1040} d={520} box={[276, 366, 1048, 150]}>
        <path
          d="M1300 380 C1300 540 300 540 300 380"
          fill="none"
          className="stroke-ink-500"
          strokeWidth={1}
          strokeDasharray="5 6"
          {...ns}
        />
      </Wipe>
      <path d="M292 390 L300 378 L308 390" fill="none" strokeWidth={1} {...ns} {...at("pop", 1380, 220, "stroke-ink-500")} />
    </>
  );
}

function Week() {
  // Driving school: a course is a run of consecutive lesson days at one hour,
  // and a slot is offered only when ONE instructor covers every day of it.
  // Row 2 can (the bar). Row 1 has a day off, row 3 a booked day. Sunday is
  // closed (hatched).
  // Build: the week fills in day by day, the day off and the booked day show
  // up, and only then does row 2's bar run from Tuesday to Saturday: the
  // answer arrives after the question is on the page.
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
      {rows.map((y, r) =>
        Array.from({ length: cols }, (_, c) => (
          <rect
            key={`${y}-${c}`}
            x={cx(c)}
            y={y}
            width={w}
            height={h}
            rx={10}
            fill={c === 6 ? "url(#cc-hatch)" : "none"}
            strokeWidth={1}
            {...ns}
            {...at("fade", c * 70 + r * 24, 420, c === 6 ? "stroke-ink-700" : lineSoft)}
          />
        )),
      )}
      {/* row 1: a day off, so this instructor cannot cover the run */}
      <path
        d={`M${cx(3) + 58} ${rows[0]! + 32} L${cx(3) + 118} ${rows[0]! + 72} M${cx(3) + 118} ${rows[0]! + 32} L${cx(3) + 58} ${rows[0]! + 72}`}
        strokeWidth={1}
        {...ns}
        {...at("pop", 560, 360, "stroke-ink-500")}
      />
      {/* row 3: a day already booked */}
      <rect x={cx(2) + 14} y={rows[2]! + 30} width={w - 28} height={44} rx={8} {...at("popSoft", 620, 420, "fill-ink-700")} />
      {/* row 2: one instructor covers every lesson day, Tuesday to Saturday.
          A clip, not a scaleX, so the rounded ends never squash. */}
      <rect
        x={cx(1) + 14}
        y={rows[1]! + 30}
        width={cx(5) + w - 14 - (cx(1) + 14)}
        height={44}
        rx={22}
        {...at("wipeLtr", 820, 700, "fill-ink-200")}
      />
    </>
  );
}

function Growth() {
  // monday.com rollout: 10 users to 50+, rolled out in four phases.
  // Build: the phase lines grow up, the baseline runs out, the start dot
  // lands, then the curve climbs left to right with its fill rising under it,
  // and the end dot and its ring land last.
  return (
    <>
      <defs>
        <linearGradient id="cc-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-ink-100)" stopOpacity="0.1" />
          <stop offset="1" stopColor="var(--color-ink-100)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[100, 450, 800, 1150, 1500].map((x, i) => (
        // Drawn bottom to top, so the dash pattern is anchored at the end the
        // line grows from and the dashes hold still while it extends.
        <line
          key={x}
          x1={x}
          x2={x}
          y1={500}
          y2={96}
          strokeWidth={1}
          strokeDasharray="2 6"
          {...ns}
          {...at("growY", i * 60, 520, lineSoft)}
        />
      ))}
      <line x1={100} x2={1500} y1={500} y2={500} strokeWidth={1} {...ns} {...at("growX", 80, 680, line)} />
      <Wipe dir="ltr" t={320} d={760} box={[80, 112, 1440, 408]}>
        <path d="M100 452 C520 444 860 330 1120 236 S1420 146 1500 132 V500 H100 Z" fill="url(#cc-area)" {...at("fade", 420, 820)} />
        <path
          d="M100 452 C520 444 860 330 1120 236 S1420 146 1500 132"
          fill="none"
          className="stroke-ink-300"
          strokeWidth={2}
          {...ns}
        />
      </Wipe>
      <circle cx={100} cy={452} r={14} strokeWidth={1.5} {...ns} {...at("pop", 240, 420, "fill-ink-950 stroke-ink-400")} />
      <circle cx={1500} cy={132} r={48} strokeWidth={1} {...ns} {...at("ring", 1060, 520, "fill-none stroke-ink-500")} />
      <circle cx={1500} cy={132} r={20} {...at("pop", 980, 440, "fill-ink-100")} />
    </>
  );
}

function Stream() {
  // LucidLink + Wasabi: three seats stream live projects from one filespace,
  // and finished work flows on to a cheaper archive.
  // Build: the seats, their links into the hub, the hub, the streams running
  // out left to right, and the archive stacking up one sheet at a time.
  const seats = [170, 300, 430];
  return (
    <>
      {seats.map((y, i) => (
        <g key={y}>
          <rect
            x={96}
            y={y - 34}
            width={120}
            height={68}
            rx={10}
            strokeWidth={1.25}
            {...ns}
            {...at("popSoft", i * 70, 440, "fill-ink-950 stroke-ink-500")}
          />
          <Wipe dir="ltr" t={150 + i * 70} d={420} box={[204, Math.min(y, 300) - 14, 280, Math.abs(y - 300) + 28]}>
            <path d={`M216 ${y} C330 ${y} 380 300 470 300`} fill="none" className="stroke-ink-500" strokeWidth={1} {...ns} />
          </Wipe>
        </g>
      ))}
      <circle cx={520} cy={300} r={50} strokeWidth={1.5} {...ns} {...at("pop", 470, 480, "fill-ink-950 stroke-ink-300")} />
      <circle cx={520} cy={300} r={16} {...at("pop", 560, 380, "fill-ink-300")} />
      {[-72, -36, 0, 36, 72].map((dy, i) => {
        // The curve stays inside its control points' hull, so their span
        // (padded) bounds the reveal.
        const ys = [300 + dy * 0.3, 300 + dy * 1.6, 300 - dy * 0.6, 300 + dy];
        const top = Math.min(...ys) - 14;
        const bottom = Math.max(...ys) + 14;
        return (
          <Wipe key={dy} dir="ltr" t={640 + i * 70} d={520} box={[560, top, 630, bottom - top]}>
            <path
              d={`M572 ${300 + dy * 0.3} C780 ${300 + dy * 1.6} 960 ${300 - dy * 0.6} 1176 ${300 + dy}`}
              fill="none"
              className={i === 2 ? "stroke-ink-400" : "stroke-ink-600"}
              strokeWidth={1}
              strokeDasharray={i === 2 ? undefined : "3 9"}
              {...ns}
            />
          </Wipe>
        );
      })}
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={1190 + i * 18}
          y={176 + i * 22}
          width={280}
          height={210}
          rx={14}
          strokeWidth={1}
          {...ns}
          {...at("rise", 820 + i * 110, 520, i === 2 ? "fill-ink-900 stroke-ink-500" : "fill-ink-950 stroke-ink-600")}
        />
      ))}
      {[0, 1, 2].map((i) => (
        <line
          key={`s${i}`}
          x1={1256}
          x2={1470}
          y1={286 + i * 36}
          y2={286 + i * 36}
          strokeWidth={1}
          {...ns}
          {...at("growX", 1060 + i * 70, 360, "stroke-ink-600")}
        />
      ))}
    </>
  );
}

function FilmStrip() {
  // Motion-design portfolio: a reel. A ball travels through five frames the
  // way a keyframed animation does, then the strip runs out of the frame:
  // handed over.
  // Build: the rails run out, the sprocket holes follow them, the frames rise
  // in sequence, and the ball lands frame by frame, like keyframes.
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
      <line x1={40} x2={1560} y1={150} y2={150} strokeWidth={1} {...ns} {...at("growX", 0, 700, line)} />
      <line x1={40} x2={1560} y1={450} y2={450} strokeWidth={1} {...ns} {...at("growX", 60, 700, line)} />
      {holes.map((x, i) => (
        <g key={x} {...at("fade", 140 + i * 22, 320)}>
          <rect x={x} y={166} width={26} height={16} rx={4} className="fill-none stroke-ink-700" strokeWidth={1} {...ns} />
          <rect x={x} y={418} width={26} height={16} rx={4} className="fill-none stroke-ink-700" strokeWidth={1} {...ns} />
        </g>
      ))}
      {frames.map((x, i) => (
        <g key={x}>
          <g {...at("rise", 280 + i * 110, 560)}>
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
          </g>
          <circle
            cx={x + ball[i]!.x}
            cy={206 + ball[i]!.y}
            r={22}
            strokeWidth={1.25}
            {...ns}
            {...at("blink", 720 + i * 140, 120, i === 2 ? "fill-ink-100" : "fill-none stroke-ink-500")}
          />
        </g>
      ))}
    </>
  );
}

function Plain() {
  return <line x1={100} x2={1500} y1={300} y2={300} strokeWidth={1} {...ns} {...at("growX", 0, 700, line)} />;
}

const COVERS: Record<string, Spec> = {
  "bs-hub": {
    figure: "12 fixed steps",
    caption: "Every inquiry takes the same path to a live project, and every step is logged.",
    cardCaption: "First inquiry to live project",
    legend: ["first inquiry → live project", "dashed: revision loop"],
    art: Funnel,
    box: [110, 490],
    notes: [
      { x: 68, y: 420, text: "first inquiry", align: "start", t: 150 },
      { x: 1510, y: 446, text: "live project", align: "end", t: 700 },
      { x: 1123, y: 150, text: "revision", align: "middle", t: 860 },
    ],
  },
  beeline: {
    figure: "125 vs 1,560",
    caption: "Applications waiting on the team, against applications waiting on insurers. The workbook could not tell them apart.",
    cardCaption: "Waiting on the team vs on insurers",
    legend: ["top: waiting on the team", "below: waiting on insurers", "1 square ≈ 20 applications"],
    art: TwoLanes,
    box: [40, 520],
    notes: [
      { x: 90, y: 62, text: "waiting on the team", align: "start", t: 0 },
      { x: 90, y: 262, text: "waiting on insurers", align: "start", t: 200 },
      { x: 1510, y: 500, text: "1 square ≈ 20 applications", align: "end", t: 1160 },
    ],
  },
  "agency-operations-platform": {
    figure: "Every version kept",
    caption: "So which draft a client approved is a lookup, not an argument.",
    cardCaption: "Draft to client approval, with recall",
    legend: ["submitted → internal review", "→ client approval", "dashed: recall"],
    art: ReviewLoop,
    box: [230, 570],
    notes: [
      { x: 300, y: 328, text: "submitted", align: "middle", t: 90 },
      { x: 800, y: 328, text: "internal review", align: "middle", t: 480 },
      { x: 1300, y: 328, text: "client approval", align: "middle", t: 880 },
      { x: 800, y: 548, text: "recall", align: "middle", t: 1120 },
    ],
  },
  "driving-school-booking-pwa": {
    figure: "Whole course, or no slot",
    caption: "A slot only appears when one instructor is free for every lesson day of the course.",
    cardCaption: "One instructor for every lesson day",
    legend: ["columns: mon to sun", "bar: one instructor throughout", "hatched: closed"],
    art: Week,
    box: [95, 570],
    notes: [
      ...["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d, c) => ({
        x: 104 + c * 200 + 88,
        y: 118,
        text: d,
        align: "middle" as const,
        t: c * 70,
      })),
      { x: 1392, y: 548, text: "closed", align: "middle", t: 440 },
      { x: 700, y: 548, text: "one instructor, every lesson day", align: "middle", t: 1000 },
    ],
  },
  "monday-rollout-agency": {
    figure: "Four phases",
    caption: "Delivery teams first, then Ops, then the Dubai managers, then the wider teams.",
    cardCaption: "The rollout, team by team",
    legend: ["phases 1 to 4, left to right"],
    art: Growth,
    box: [70, 570],
    notes: [
      { x: 275, y: 548, text: "phase 1", align: "middle", t: 300 },
      { x: 625, y: 548, text: "phase 2", align: "middle", t: 490 },
      { x: 975, y: 548, text: "phase 3", align: "middle", t: 680 },
      { x: 1325, y: 548, text: "phase 4", align: "middle", t: 870 },
    ],
  },
  "lucidlink-wasabi": {
    figure: "Like a local drive",
    caption: "Each seat streams only the files it opens. Finished work moves on to a cheaper archive.",
    cardCaption: "Live projects, streamed to every seat",
    legend: ["3 seats → live projects", "→ archive"],
    art: Stream,
    box: [110, 490],
    notes: [
      { x: 520, y: 390, text: "live projects", align: "middle", t: 520 },
      { x: 1348, y: 470, text: "archive", align: "middle", t: 1000 },
    ],
  },
  "motion-design-portfolio": {
    figure: "Fast, clean, and theirs",
    // Describes the drawing (a reel running out of the frame) and the
    // handoff; the study's own opening line stays in the study.
    caption: "Built, then handed over whole: code and hosting.",
    cardCaption: "Built, then handed over whole",
    art: FilmStrip,
    box: [130, 470],
  },
};

const FALLBACK: Spec = { figure: "", caption: "", art: Plain, box: [250, 350] };

export function coverFor(slug: string): Spec {
  return COVERS[slug] ?? FALLBACK;
}

// The card figure sits in the frame's top band, which enters the window
// first, so it sets over the first half of the frame's entry (starting once
// its line is in view) and the drawing builds over the rest. It reads the
// frame's timeline: the frame is overflow-hidden, a scroll container, so a
// timeline of the figure's own would watch the frame and never run.
const CARD_FIGURE = { timeline: "--cc", from: 16, to: 56 } as const;

export function CaseCover({
  slug,
  client,
  variant = "card",
  animate = false,
  delay = 300,
  className,
}: {
  slug: string;
  /** the client descriptor, shown on the detail cover only */
  client?: string;
  variant?: Variant;
  /** build on page arrival (time based), for a cover in the first viewport.
   *  Without it, cards and thumbs build on scroll and a detail cover is still. */
  animate?: boolean;
  /** with `animate`: ms after load before the drawing starts to build. The
   *  figure sets in type 120ms ahead of it. */
  delay?: number;
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
  const build = animate ? "arrival" : detail ? null : "scroll";
  const figureDelay = Math.max(0, delay - 120);

  return (
    <figure
      aria-hidden={detail ? undefined : true}
      className={cn(
        "frame-lit relative isolate m-0 overflow-hidden",
        // The detail cover is laid out in flow, caption above drawing, so the
        // caption can show at every width without ever sitting on the art.
        // Cards run a touch taller below lg, so the caption under the figure
        // clears the bottom-anchored drawing on a 320px phone.
        detail
          ? "rounded-2xl"
          : thumb
            ? "aspect-[16/10] rounded-xl"
            : "aspect-[16/11] rounded-xl lg:aspect-[16/10]",
        build === "arrival" && styles.arrive,
        build === "scroll" && styles.scrub,
        build === "scroll" && (thumb ? styles.spanThumb : styles.spanCard),
        className,
      )}
      style={build === "arrival" ? ({ "--b0": delay } as CSSProperties) : undefined}
    >
      {/* Light and material: the ember falls in from above, over a fine grid
          that fades out before the edges. */}
      <div aria-hidden className={cn("ember-horizon pointer-events-none absolute inset-0", styles.ember)} />
      <div aria-hidden className={cn("pointer-events-none absolute inset-0", styles.grid)} />

      {detail ? (
        // The chip sits out of flow in the corner, so on a phone the figure
        // gets the full width instead of wrapping into a stack beside it. The
        // phone's top padding clears the chip; from sm up the figure keeps a
        // chip-wide gutter on its right instead.
        <figcaption className="relative block px-5 pt-12 sm:px-8 sm:pt-8 lg:px-10 lg:pt-10">
          <span className="absolute right-5 top-5 font-mono text-label-xs uppercase text-ink-500 sm:right-8 sm:top-8 lg:right-10 lg:top-10">
            schematic
          </span>
          <span className="block min-w-0 sm:pr-24">
            {client ? (
              <span
                className={cn(
                  "block max-w-[40ch] text-caption text-ink-300",
                  animate && "hero-enter [animation-delay:120ms]",
                )}
              >
                {keepCompounds(client)}
              </span>
            ) : null}
            {spec.figure ? (
              <span
                className={cn(
                  "block text-balance font-display text-[clamp(2rem,1.3rem+2.2vw,2.625rem)] font-semibold leading-[1] tracking-[-0.035em] text-ink-50 [font-stretch:94%]",
                  client && "mt-3 sm:mt-4",
                )}
              >
                {animate ? <SetFigure text={spec.figure} trigger="arrival" delay={figureDelay} /> : spec.figure}
              </span>
            ) : null}
            {spec.caption ? (
              <span
                className={cn(
                  "mt-3 block max-w-[34ch] text-pretty text-caption text-ink-400",
                  animate && "hero-enter [animation-delay:280ms]",
                )}
              >
                {spec.caption}
              </span>
            ) : null}
          </span>
        </figcaption>
      ) : null}

      {!detail && !thumb && spec.figure ? (
        <span aria-hidden className="absolute left-0 top-0 block p-5 sm:p-6">
          <span className="block font-display text-[clamp(1.75rem,1.2rem+1.6vw,2.75rem)] font-semibold leading-none tracking-[-0.03em] text-ink-50 [font-stretch:94%]">
            {animate ? (
              <SetFigure text={spec.figure} trigger="arrival" delay={figureDelay} />
            ) : (
              <SetFigure text={spec.figure} track={CARD_FIGURE} />
            )}
          </span>
          {spec.cardCaption ? (
            <span className="mt-2 block text-caption text-ink-400">{spec.cardCaption}</span>
          ) : null}
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
                className={cn(
                  "absolute hidden whitespace-nowrap font-mono text-label-xs text-ink-400 sm:block",
                  styles.note,
                )}
                style={
                  {
                    left: `${(n.x / VB_W) * 100}%`,
                    top: `${((n.y - y0) / vh) * 100}%`,
                    transform: `translate(${n.align === "end" ? "-100%" : n.align === "middle" ? "-50%" : "0"}, -50%)`,
                    "--t": n.t ?? 0,
                    "--d": 420,
                  } as CSSProperties
                }
              >
                {n.text}
              </span>
            ))
          : null}
      </div>

      {detail && spec.legend ? (
        <span aria-hidden className="block px-5 pb-5 font-mono text-label-xs leading-relaxed tracking-normal text-ink-400 sm:hidden">
          {spec.legend.map((item) => (
            <span key={item} className="block">
              {item}
            </span>
          ))}
        </span>
      ) : null}
    </figure>
  );
}
