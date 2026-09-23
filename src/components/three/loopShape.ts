// Pure math for "the approval loop", shared by the server-rendered SVG
// fallback and the three.js core. No three import here: this module ships in
// the initial bundle, three must not.

export const CTRL_COUNT = 9;

// Fixed, hand-picked irregularity per control point (-1..1). Deterministic so
// the server-rendered fallback and the client agree to the pixel.
const NOISE_R = [0.55, -0.45, 0.85, -0.7, 0.25, 0.65, -0.9, 0.4, -0.3];
const NOISE_Y = [0.35, 0.95, -0.45, -0.9, 0.55, -0.2, 0.8, -0.6, 0.05];
const NOISE_A = [0.0, 0.55, -0.6, 0.3, -0.25, 0.7, -0.45, 0.2, -0.5];

export const SHAPE = {
  rx: 3.0,
  rz: 1.75,
  tiltX: 0.07,
  tiltZ: -0.11,
  /** How much the loop contracts at progress 1. */
  contract: 0.12,
} as const;

/** Arc-length position of the approval gate along the loop (0..1). */
export const GATE_U = 0.39;

export const VIEW = {
  fovDeg: 30,
  azimuth: -0.2,
  marginX: 0.9,
  marginY: 0.74,
  /** World-space padding for cards, the gate and halos around the path. */
  pad: 0.36,
  /** Camera dolly factor at progress 1. */
  dolly: 0.93,
} as const;

export const CARD = { w: 0.44, h: 0.3, lift: 0.05 } as const;

/**
 * Camera elevation for a container aspect: a wide hero looks across the loop,
 * a square column looks further down so the ellipse fills the box. Capped for
 * portrait, where framing is width-bound anyway and a steeper view would only
 * foreshorten the drafts.
 */
export function elevationFor(aspect: number): number {
  const t = clamp01((aspect - 1.05) / 0.55);
  return 0.72 - 0.22 * (t * t * (3 - 2 * t));
}
export const GATE_RADIUS = 0.33;

/** Minimum centre-to-centre spacing between cards along the path (world units). */
export const SPACING_WORLD = 0.54;
/** The lead held card stops with its centre this far before the gate. */
export const STOP_WORLD = CARD.w / 2 + 0.1;
/** Free-flow travel speed along the path (world units per second). */
export const SPEED_WORLD = 0.34;
/** Cards already waiting at the gate in the opening composition. */
export const QUEUE_START = 3;

/** Looser "earlier drafts" of the rule, drawn faintly around the loop. */
export const ECHOES = [
  { seed: 1.3, amp: 0.14, alpha: 0.22 },
  { seed: 4.1, amp: 0.26, alpha: 0.14 },
] as const;

/** JS twin of the ribbon shader's echo() so the fallback matches frame one. */
export function echoPoint(
  x: number,
  y: number,
  z: number,
  u: number,
  seed: number,
  amp: number,
  time: number,
  out: [number, number, number],
): void {
  const a = 2 * Math.PI * u;
  const n1 = Math.sin(a * 2 + seed + time * 0.19) * 0.6 + Math.sin(a * 3 - seed * 1.7 - time * 0.11) * 0.4;
  const n2 = Math.sin(a * 2 + seed * 2.3 - time * 0.15);
  const l = Math.hypot(x + 1e-5, z + 1e-5);
  out[0] = x + ((x + 1e-5) / l) * n1 * amp;
  out[1] = y + n2 * amp * 0.5;
  out[2] = z + ((z + 1e-5) / l) * n1 * amp;
}

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const hash01 = (i: number) => {
  const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
};

/**
 * Opening composition, shared by the fallback and the live scene so the
 * cross-fade lines up. Arc positions ascend inside (GATE_U, GATE_U + 1):
 * index 0 is the freshly approved card just through the gate, the last
 * QUEUE_START are held in front of it, the rest are in flight between.
 */
export function initialLayout(n: number, perimeter: number, out: Float64Array): void {
  const sp = SPACING_WORLD / perimeter;
  const lead = GATE_U + 1 - STOP_WORLD / perimeter;
  const q = Math.min(QUEUE_START, n - 1);
  for (let k = 0; k < q; k++) out[n - 1 - k] = lead - k * sp;
  const first = GATE_U + (STOP_WORLD + 0.16) / perimeter;
  out[0] = first;
  const tail = lead - (q - 1) * sp - sp * 1.9;
  const free = n - 1 - q;
  const gap = (tail - first) / (free + 1);
  for (let k = 0; k < free; k++) {
    out[1 + k] = first + (k + 1) * gap + (hash01(k + 3) - 0.5) * 0.24 * gap;
  }
}

/** Unit normal of the loop's plane after tilt (the cards' "up"). */
export function planeNormal(): [number, number, number] {
  // (0,1,0) rotated about X by tiltX, then about Z by tiltZ.
  const cx = Math.cos(SHAPE.tiltX);
  const sx = Math.sin(SHAPE.tiltX);
  const cz = Math.cos(SHAPE.tiltZ);
  const sz = Math.sin(SHAPE.tiltZ);
  const y1 = cx;
  const z1 = sx;
  return [-sz * y1, cz * y1, z1];
}

/**
 * Nine control points, in travel order. Irregularity and size ease out as
 * progress rises: the rule tightens into a calmer, smaller loop.
 */
export function controlPoints(progress: number, out: Float32Array): void {
  const p = clamp01(progress);
  const calm = 1 - p * (2 - p); // ease-out: most of the calming happens early
  const ar = 0.015 + 0.1 * calm;
  const ay = 0.03 + 0.26 * calm;
  const aa = 0.01 + 0.09 * calm;
  const s = 1 - SHAPE.contract * p;
  const cx = Math.cos(SHAPE.tiltX);
  const sx = Math.sin(SHAPE.tiltX);
  const cz = Math.cos(SHAPE.tiltZ);
  const sz = Math.sin(SHAPE.tiltZ);
  for (let k = 0; k < CTRL_COUNT; k++) {
    // Decreasing angle from the left end: the near side runs left to right.
    const th = Math.PI - (2 * Math.PI * k) / CTRL_COUNT + (NOISE_A[k] ?? 0) * aa;
    const r = (1 + (NOISE_R[k] ?? 0) * ar) * s;
    const x0 = SHAPE.rx * Math.cos(th) * r;
    const z0 = SHAPE.rz * Math.sin(th) * r;
    const y0 = (NOISE_Y[k] ?? 0) * ay * s;
    // rotate about X
    const y1 = y0 * cx - z0 * sx;
    const z1 = y0 * sx + z0 * cx;
    // rotate about Z
    out[k * 3] = x0 * cz - y1 * sz;
    out[k * 3 + 1] = x0 * sz + y1 * cz;
    out[k * 3 + 2] = z1;
  }
}

/**
 * Closed centripetal Catmull-Rom through `ctrl`, resampled to `count` points
 * uniform in arc length. `out` holds (count + 1) * 3 floats; the last point
 * repeats the first so consumers can treat it as a closed polyline.
 * `dense` is scratch of at least (CTRL_COUNT * perSeg + 1) * 4 floats.
 */
export function sampleLoop(
  ctrl: Float32Array,
  count: number,
  out: Float32Array,
  dense: Float32Array,
  perSeg: number,
): number {
  const K = CTRL_COUNT;
  const M = K * perSeg;
  let di = 0;
  for (let seg = 0; seg < K; seg++) {
    const i0 = ((seg - 1 + K) % K) * 3;
    const i1 = seg * 3;
    const i2 = ((seg + 1) % K) * 3;
    const i3 = ((seg + 2) % K) * 3;
    const dt0 = centripetal(ctrl, i0, i1);
    const dt1 = centripetal(ctrl, i1, i2);
    const dt2 = centripetal(ctrl, i2, i3);
    for (let axis = 0; axis < 3; axis++) {
      const x0 = ctrl[i0 + axis]!;
      const x1 = ctrl[i1 + axis]!;
      const x2 = ctrl[i2 + axis]!;
      const x3 = ctrl[i3 + axis]!;
      let t1 = (x1 - x0) / dt0 - (x2 - x0) / (dt0 + dt1) + (x2 - x1) / dt1;
      let t2 = (x2 - x1) / dt1 - (x3 - x1) / (dt1 + dt2) + (x3 - x2) / dt2;
      t1 *= dt1;
      t2 *= dt1;
      const c2 = -3 * x1 + 3 * x2 - 2 * t1 - t2;
      const c3 = 2 * x1 - 2 * x2 + t1 + t2;
      for (let j = 0; j < perSeg; j++) {
        const t = j / perSeg;
        dense[(di + j) * 4 + axis] = x1 + t1 * t + c2 * t * t + c3 * t * t * t;
      }
    }
    di += perSeg;
  }
  // close
  dense[M * 4] = dense[0]!;
  dense[M * 4 + 1] = dense[1]!;
  dense[M * 4 + 2] = dense[2]!;
  // cumulative length in the 4th slot
  dense[3] = 0;
  let total = 0;
  for (let i = 1; i <= M; i++) {
    const a = (i - 1) * 4;
    const b = i * 4;
    const dx = dense[b]! - dense[a]!;
    const dy = dense[b + 1]! - dense[a + 1]!;
    const dz = dense[b + 2]! - dense[a + 2]!;
    total += Math.sqrt(dx * dx + dy * dy + dz * dz);
    dense[b + 3] = total;
  }
  let seg = 0;
  for (let i = 0; i < count; i++) {
    const target = (i / count) * total;
    while (seg < M - 1 && dense[(seg + 1) * 4 + 3]! < target) seg++;
    const a = seg * 4;
    const b = (seg + 1) * 4;
    const la = dense[a + 3]!;
    const lb = dense[b + 3]!;
    const f = lb > la ? (target - la) / (lb - la) : 0;
    out[i * 3] = dense[a]! + (dense[b]! - dense[a]!) * f;
    out[i * 3 + 1] = dense[a + 1]! + (dense[b + 1]! - dense[a + 1]!) * f;
    out[i * 3 + 2] = dense[a + 2]! + (dense[b + 2]! - dense[a + 2]!) * f;
  }
  out[count * 3] = out[0]!;
  out[count * 3 + 1] = out[1]!;
  out[count * 3 + 2] = out[2]!;
  return total;
}

function centripetal(c: Float32Array, a: number, b: number): number {
  const dx = c[b]! - c[a]!;
  const dy = c[b + 1]! - c[a + 1]!;
  const dz = c[b + 2]! - c[a + 2]!;
  const d = Math.pow(dx * dx + dy * dy + dz * dz, 0.25);
  return d < 1e-4 ? 1 : d;
}

/** Orthonormal camera basis for an orbit at (elevation, azimuth) around the origin. */
export interface ViewBasis {
  /** Unit vector from target to camera. */
  dir: [number, number, number];
  right: [number, number, number];
  up: [number, number, number];
}

export function viewBasis(elevation: number, azimuth: number): ViewBasis {
  const ce = Math.cos(elevation);
  const dir: [number, number, number] = [Math.sin(azimuth) * ce, Math.sin(elevation), Math.cos(azimuth) * ce];
  // right = normalize(worldUp x dir) with worldUp = (0,1,0)
  const rl = Math.hypot(dir[2], dir[0]);
  const right: [number, number, number] = [dir[2] / rl, 0, -dir[0] / rl];
  // up = dir x right
  const up: [number, number, number] = [
    dir[1] * right[2] - dir[2] * right[1],
    dir[2] * right[0] - dir[0] * right[2],
    dir[0] * right[1] - dir[1] * right[0],
  ];
  return { dir, right, up };
}

/**
 * Camera distance that keeps every point (padded) inside the given NDC
 * margins. Exact for a perspective camera looking at the origin.
 */
export function fitDistance(
  pts: Float32Array,
  count: number,
  basis: ViewBasis,
  aspect: number,
  fovYRad: number,
): number {
  const tanV = Math.tan(fovYRad / 2);
  const tanH = tanV * aspect;
  const { dir, right, up } = basis;
  let D = 0;
  for (let i = 0; i < count; i++) {
    const x = pts[i * 3]!;
    const y = pts[i * 3 + 1]!;
    const z = pts[i * 3 + 2]!;
    const sx = Math.abs(x * right[0] + y * right[1] + z * right[2]) + VIEW.pad;
    const sy = Math.abs(x * up[0] + y * up[1] + z * up[2]) + VIEW.pad;
    // positive = farther from the camera than the target
    const depth = -(x * dir[0] + y * dir[1] + z * dir[2]);
    D = Math.max(D, sx / (VIEW.marginX * tanH) - depth, sy / (VIEW.marginY * tanV) - depth);
  }
  return D;
}

/** Project a point to [0..w]x[0..h] pixels; returns the view depth in out[2]. */
export function projectPoint(
  basis: ViewBasis,
  D: number,
  fovYRad: number,
  w: number,
  h: number,
  x: number,
  y: number,
  z: number,
  out: [number, number, number],
): void {
  const tanV = Math.tan(fovYRad / 2);
  const aspect = w / h;
  const { dir, right, up } = basis;
  const depth = D - (x * dir[0] + y * dir[1] + z * dir[2]);
  const sx = (x * right[0] + y * right[1] + z * right[2]) / (depth * tanV * aspect);
  const sy = (x * up[0] + y * up[1] + z * up[2]) / (depth * tanV);
  out[0] = (sx * 0.5 + 0.5) * w;
  out[1] = (0.5 - sy * 0.5) * h;
  out[2] = depth;
}
