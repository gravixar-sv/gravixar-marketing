import { useId, type CSSProperties } from "react";
import {
  CARD,
  CTRL_COUNT,
  ECHOES,
  GATE_RADIUS,
  GATE_U,
  VIEW,
  controlPoints,
  echoPoint,
  elevationFor,
  fitDistance,
  initialLayout,
  planeNormal,
  projectPoint,
  sampleLoop,
  viewBasis,
} from "./loopShape";

// Static drawing of the opening frame: server-rendered, zero JS work beyond
// this module, and the permanent state wherever WebGL is unavailable.

const W = 560;
const H = 520;
const SAMPLES = 180;
// Rounded so server and client serialise identical attributes (Node and the
// browser can differ in the last digits of Math.sin / Math.pow).
const f1 = (v: number) => Math.round(v * 10) / 10;
const f3 = (v: number) => Math.round(v * 1000) / 1000;

interface FallbackCard {
  d: string;
  depth: number;
  /** Nearness 0.45..1, pre-rounded. */
  k: number;
  coral: boolean;
  cx: number;
  cy: number;
}

function build() {
  const ctrl = new Float32Array(CTRL_COUNT * 3);
  const dense = new Float32Array((CTRL_COUNT * 48 + 1) * 4);
  const pts = new Float32Array((SAMPLES + 1) * 3);
  controlPoints(0, ctrl);
  const perimeter = sampleLoop(ctrl, SAMPLES, pts, dense, 48);
  const fov = (VIEW.fovDeg * Math.PI) / 180;
  const basis = viewBasis(elevationFor(W / H), VIEW.azimuth);
  const D = fitDistance(pts, SAMPLES, basis, W / H, fov);
  const o: [number, number, number] = [0, 0, 0];
  const e: [number, number, number] = [0, 0, 0];
  const project = (x: number, y: number, z: number) => {
    projectPoint(basis, D, fov, W, H, x, y, z, o);
    return [o[0], o[1], o[2]] as const;
  };

  // Loop in depth-shaded runs: the far side recedes, as the fog does live.
  const runs: { d: string; o: number }[] = [];
  const RUN = 15;
  let minDepth = Infinity;
  let maxDepth = -Infinity;
  const proj: (readonly [number, number, number])[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const p = project(pts[i * 3]!, pts[i * 3 + 1]!, pts[i * 3 + 2]!);
    proj.push(p);
    minDepth = Math.min(minDepth, p[2]);
    maxDepth = Math.max(maxDepth, p[2]);
  }
  const near = (depth: number) => 1 - (depth - minDepth) / (maxDepth - minDepth || 1);
  for (let s = 0; s < SAMPLES; s += RUN) {
    let d = "";
    let depth = 0;
    for (let i = s; i <= Math.min(s + RUN, SAMPLES); i++) {
      const p = proj[i]!;
      d += `${i === s ? "M" : "L"}${f1(p[0])} ${f1(p[1])}`;
      depth += p[2];
    }
    runs.push({ d, o: f3(0.22 + 0.58 * near(depth / (RUN + 1))) });
  }

  const echoes = ECHOES.map((echo) => {
    let d = "";
    for (let i = 0; i <= SAMPLES; i++) {
      echoPoint(pts[i * 3]!, pts[i * 3 + 1]!, pts[i * 3 + 2]!, i / SAMPLES, echo.seed, echo.amp, 0, e);
      const p = project(e[0], e[1], e[2]);
      d += `${i === 0 ? "M" : "L"}${f1(p[0])} ${f1(p[1])}`;
    }
    return { d, o: f3(echo.alpha * 0.9) };
  });

  const [nx, ny, nz] = planeNormal();
  const frame = (u: number, k: number) => {
    const w = u - Math.floor(u);
    const fi = w * SAMPLES;
    const i0 = Math.min(Math.floor(fi), SAMPLES - 1);
    const a = fi - i0;
    const at = (k: number, c: number) => pts[k * 3 + c]!;
    const px = at(i0, 0) + (at(i0 + 1, 0) - at(i0, 0)) * a;
    const py = at(i0, 1) + (at(i0 + 1, 1) - at(i0, 1)) * a;
    const pz = at(i0, 2) + (at(i0 + 1, 2) - at(i0, 2)) * a;
    const ip = i0 === 0 ? SAMPLES - 1 : i0 - 1;
    let tx = at(i0 + 1, 0) - at(ip, 0);
    let ty = at(i0 + 1, 1) - at(ip, 1);
    let tz = at(i0 + 1, 2) - at(ip, 2);
    let l = Math.hypot(tx, ty, tz) || 1;
    tx /= l;
    ty /= l;
    tz /= l;
    const dp = nx * tx + ny * ty + nz * tz;
    let yx = nx - tx * dp;
    let yy = ny - ty * dp;
    let yz = nz - tz * dp;
    l = Math.hypot(yx, yy, yz) || 1;
    yx /= l;
    yy /= l;
    yz /= l;
    const lift = (CARD.h * k) / 2 + CARD.lift;
    return {
      c: [px + yx * lift, py + yy * lift, pz + yz * lift] as const,
      t: [tx, ty, tz] as const,
      y: [yx, yy, yz] as const,
      z: [ty * yz - tz * yy, tz * yx - tx * yz, tx * yy - ty * yx] as const,
    };
  };

  // k mirrors the live scene's phone scale (fewer, larger drafts).
  const cardsFor = (n: number, k: number): FallbackCard[] => {
    const U = new Float64Array(n);
    initialLayout(n, perimeter / k, U);
    const out: FallbackCard[] = [];
    for (let i = 0; i < n; i++) {
      const f = frame(U[i]!, k);
      const hw = (CARD.w * k) / 2;
      const hh = (CARD.h * k) / 2;
      let d = "";
      let depth = 0;
      const corners: [number, number][] = [
        [-hw, -hh],
        [hw, -hh],
        [hw, hh],
        [-hw, hh],
      ];
      const cp = project(f.c[0], f.c[1], f.c[2]);
      corners.forEach(([cx, cy], k) => {
        const p = project(f.c[0] + f.t[0] * cx + f.y[0] * cy, f.c[1] + f.t[1] * cx + f.y[1] * cy, f.c[2] + f.t[2] * cx + f.y[2] * cy);
        d += `${k === 0 ? "M" : "L"}${f1(p[0])} ${f1(p[1])}`;
        depth += p[2] / 4;
      });
      out.push({ d: `${d}Z`, depth, k: f3(0.45 + 0.55 * near(depth)), coral: i === 0, cx: f1(cp[0]), cy: f1(cp[1]) });
    }
    return out.sort((a, b) => b.depth - a.depth);
  };

  const gateFor = (k: number) => {
    const g = frame(GATE_U, k);
    let ring = "";
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const c = Math.cos(a) * GATE_RADIUS * k;
      const s = Math.sin(a) * GATE_RADIUS * k;
      const p = project(g.c[0] + g.y[0] * c + g.z[0] * s, g.c[1] + g.y[1] * c + g.z[1] * s, g.c[2] + g.y[2] * c + g.z[2] * s);
      ring += `${i === 0 ? "M" : "L"}${f1(p[0])} ${f1(p[1])}`;
    }
    const gc = project(g.c[0], g.c[1], g.c[2]);
    return { ring, x: f1(gc[0]), y: f1(gc[1]) };
  };

  return {
    runs,
    echoes,
    desktop: { cards: cardsFor(16, 1), gate: gateFor(1) },
    mobile: { cards: cardsFor(10, 1.4), gate: gateFor(1.4) },
  };
}

let cached: ReturnType<typeof build> | null = null;
const model = () => (cached ??= build());

type Variant = ReturnType<typeof build>["desktop"];

function Drafts({ v, lit, glow, ivory, className }: { v: Variant; lit: boolean; glow: string; ivory: string; className: string }) {
  const coral = v.cards.find((c) => c.coral);
  return (
    <g className={className}>
      {coral ? <circle cx={coral.cx} cy={coral.cy} r={34} fill={`url(#${glow})`} opacity={0.7} /> : null}
      {v.cards.map((c, i) => (
        <path
          key={i}
          d={c.d}
          fill={c.coral ? "#2a1c17" : "#1c1a17"}
          fillOpacity={f3(0.4 + 0.6 * c.k)}
          stroke={c.coral ? "#ff8a5c" : "#aba49b"}
          strokeOpacity={c.coral ? 0.95 : f3(0.25 + 0.45 * c.k)}
          strokeWidth={1}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <circle cx={v.gate.x} cy={v.gate.y} r={52} fill={`url(#${lit ? glow : ivory})`} />
      <path
        d={v.gate.ring}
        stroke={lit ? "#ff6b35" : "#aba49b"}
        strokeOpacity={lit ? 1 : 0.75}
        strokeWidth={lit ? 1.6 : 1.2}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

export function LoopFallback({ lit = false, className, style }: { lit?: boolean; className?: string; style?: CSSProperties }) {
  const m = model();
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const vig = `lfv${id}`;
  const mask = `lfm${id}`;
  const glow = `lfg${id}`;
  const ivory = `lfi${id}`;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={vig} cx="50%" cy="50%" r="62%">
          <stop offset="62%" stopColor="#fff" stopOpacity="1" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
          <rect width={W} height={H} fill={`url(#${vig})`} />
        </mask>
        <radialGradient id={glow}>
          <stop offset="0%" stopColor="#ff6b35" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ff6b35" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={ivory}>
          <stop offset="0%" stopColor="#e3ded5" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#e3ded5" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g mask={`url(#${mask})`} fill="none">
        {m.echoes.map((e, i) => (
          <path key={i} d={e.d} stroke="#948d85" strokeOpacity={e.o} strokeWidth={0.8} vectorEffect="non-scaling-stroke" />
        ))}
        {m.runs.map((r, i) => (
          <path key={i} d={r.d} stroke="#aba49b" strokeOpacity={r.o} strokeWidth={1.1} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        ))}
        {/* Same breakpoint the live scene uses to pick its draft count. */}
        <Drafts v={m.desktop} lit={lit} glow={glow} ivory={ivory} className="max-md:hidden" />
        <Drafts v={m.mobile} lit={lit} glow={glow} ivory={ivory} className="md:hidden" />
      </g>
    </svg>
  );
}
