// The three.js half of <LoopScene>. Only ever reached through a dynamic
// import after load + idle, so `three` stays out of the initial bundle.
//
// Draw calls: dust, cards, 2 echo loops, main loop, gate ring, halos = 7.
//
// THE QUEUE (2026-09-23). The cards are named tasks, not an endless conveyor.
// Each one sits in a slot on the ring (queueSlot in loopShape.ts): slot 0
// stops just before the gate, the rest are spaced back round the ring, and the
// stretch after the gate stays clear for departures. Every move is eased, none
// snaps:
//   glide  the original motion law: speed eases toward a target that shrinks
//          with the distance left, so a card sets off softly and settles
//          softly. Starts are staggered by rank, so a queue advance reads as
//          a ripple from the gate backwards.
//   exit   approved: turns coral, passes through the ring, then leaves the
//          ring along its direction of travel, rising and fading. It never
//          comes back; a later batch is new cards.
//   arc    sent back: lifts clear of the gate ring and flies to the back of
//          the queue (the short way round), carrying its new version badge.
//   enter  a new batch drifts down onto its slots, one after another.
// Queued cards float gently while they wait; the one at the gate barely.
//
// The DOM layer over the canvas (LoopOverlay) gets each card's screen box and
// the gate's position on every rendered frame through `onFrame`, so hover,
// tap and keyboard focus land on the card the eye sees.

import {
  BufferAttribute,
  BufferGeometry,
  CustomBlending,
  DoubleSide,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  InstancedMesh,
  Mesh,
  OneFactor,
  OneMinusSrcAlphaFactor,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Scene,
  ShaderMaterial,
  Vector3,
  WebGLRenderer,
  type IUniform,
} from "three";
import {
  CARD,
  CTRL_COUNT,
  ECHOES,
  GATE_RADIUS,
  GATE_U,
  VIEW,
  clamp01,
  controlPoints,
  elevationFor,
  fitDistance,
  hash01,
  lerp,
  planeNormal,
  queueSlot,
  sampleLoop,
  viewBasis,
} from "./loopShape";
import { CATEGORIES, type CategoryKey } from "../home/hero/taskPalette";

export interface SceneItem {
  id: string;
  category: CategoryKey;
  /** 1 low, 2 medium, 3 high. */
  priority: 1 | 2 | 3;
  version: number;
}

export interface CardSnap {
  id: string;
  /** Screen box of the card, in CSS pixels relative to the host. */
  x: number;
  y: number;
  w: number;
  h: number;
  alpha: number;
}

export interface SceneSnapshot {
  width: number;
  height: number;
  /** Queued cards only (not the ones leaving). */
  cards: CardSnap[];
  count: number;
  /** The gate: its centre, and the point just under the ring where its label sits. */
  gate: { x: number; y: number; labelX: number; labelY: number; sent: boolean };
}

export interface LoopSceneOptions {
  reducedMotion: boolean;
  mobile: boolean;
  /** 0..1, camera dolly only. */
  progress: number;
  visible: boolean;
  interactive: boolean;
  items: SceneItem[];
  onReady: () => void;
  onLost: () => void;
  /** Canvas click inside the gate hit area. */
  onGateClick: () => void;
  /** Every rendered frame, for the DOM layer. The object is reused: read it, do not keep it. */
  onFrame: (snap: SceneSnapshot) => void;
}

export interface LoopSceneController {
  setItems(items: SceneItem[]): void;
  /** The card the visitor is pointing at or focused on: it lifts and brightens. */
  setHighlight(id: string | null): void;
  setProgress(p: number): void;
  setVisible(v: boolean): void;
  setReducedMotion(r: boolean): void;
  setInteractive(i: boolean): void;
  dispose(): void;
}

const hex = (h: number) => new Vector3(((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255);
const ZINC_200 = hex(0xe3ded5);
const ZINC_400 = hex(0xaba49b);
const ZINC_500 = hex(0x948d85);
const ZINC_600 = hex(0x6e6861);
const ZINC_700 = hex(0x4a4540);
const CORAL = hex(0xff6b35);
const CORAL_SOFT = hex(0xff8a5c);
const CARD_FILL = hex(0x1c1a17);

const ATTACK = 0.18;
const DECAY_RATE = 4.3; // ~5% left after 700ms
const TIGHTEN_STEP = 0.2;

/** Instances: six live tasks, plus room for a batch leaving while the next arrives. */
const MAX = 12;
/** Glide cruise speed (world units per second) and the pull toward the slot. */
const VMAX = 2.6;
const KD = 2.4;
/** Ripple: the front card sets off first, each rank behind it a beat later. */
const RIPPLE0 = 0.14;
const RIPPLE = 0.1;
/** Approved: speed once through the gate, where it leaves the ring, how long it fades. */
const EXIT_SPEED = 1.5;
const PEEL = 0.45;
const FADE = 0.75;
/** Sent back: how high it lifts over the ring (times K). */
const ARC_H = 0.62;
/** A new task settles onto its slot over this long; each one starts a beat after the last. */
const ENTER = 1.1;
const ENTER_STAGGER = 0.11;
/** Idle float amplitude (world units, times K). */
const FLOAT_A = 0.022;
/** How long "Sent" stays under the gate. */
const SENT_SHOW = 1.7;

const FREE = 0;
const QUEUED = 1;
const EXIT = 2;
const ARC = 3;

const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const damp = (a: number, b: number, lambda: number, dt: number) => a + (b - a) * (1 - Math.exp(-lambda * dt));
const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
const frac = (x: number) => x - Math.floor(x);
/** A single hump over [a, b]: 0 at both ends, 1 in the middle. */
const hump = (x: number, a: number, b: number) => Math.sin(Math.PI * clamp01((x - a) / (b - a)));

interface Spring {
  x: number;
  v: number;
}
/** Exact critically damped spring step. */
function springTo(s: Spring, target: number, omega: number, dt: number) {
  const x = s.x - target;
  const temp = (s.v + omega * x) * dt;
  const e = Math.exp(-omega * dt);
  s.v = (s.v - omega * temp) * e;
  s.x = target + (x + temp) * e;
}

function flashLevel(t: number, start: number, from: number) {
  const dt = t - start;
  if (dt < 0) return 0;
  if (dt < ATTACK) {
    const k = 1 - dt / ATTACK;
    return from + (1 - from) * (1 - k * k);
  }
  return Math.exp(-(dt - ATTACK) * DECAY_RATE);
}

const VIGNETTE = /* glsl */ `
uniform vec2 uRes;
float vignette() {
  vec2 q = gl_FragCoord.xy / uRes * 2.0 - 1.0;
  float r = length(q * vec2(0.9, 1.0));
  return 1.0 - smoothstep(0.74, 1.1, r);
}`;

const FOG = /* glsl */ `
uniform float uFogNear;
uniform float uFogFar;
float fogAt(float depth) { return 1.0 - smoothstep(uFogNear, uFogFar, depth); }`;

// Screen-space ribbon: constant pixel width, analytic anti-aliasing and a soft
// glow skirt, so a hairline never shimmers the way GL_LINES do.
const RIBBON_VERT = /* glsl */ `
attribute vec3 aPrev;
attribute vec3 aNext;
attribute float aSide;
attribute float aU;
uniform vec2 uRes;
uniform float uWidth;
uniform float uGlow;
uniform float uRefDepth;
uniform float uEchoAmp;
uniform float uEchoSeed;
uniform float uTime;
uniform float uDu;
varying float vU;
varying float vDist;
varying float vCore;
varying float vCov;
varying float vDepth;

vec3 echo(vec3 p, float u) {
  float a = 6.2831853 * u;
  float n1 = sin(a * 2.0 + uEchoSeed + uTime * 0.19) * 0.6 + sin(a * 3.0 - uEchoSeed * 1.7 - uTime * 0.11) * 0.4;
  float n2 = sin(a * 2.0 + uEchoSeed * 2.3 - uTime * 0.15);
  vec2 radial = normalize(p.xz + vec2(1e-5));
  return p + vec3(radial.x, 0.0, radial.y) * n1 * uEchoAmp + vec3(0.0, n2 * uEchoAmp * 0.5, 0.0);
}
vec2 toScreen(vec4 c) { return c.xy / c.w * 0.5 * uRes; }

void main() {
  vec3 p = echo(position, aU);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vec4 c = projectionMatrix * mv;
  vec4 cp = projectionMatrix * (modelViewMatrix * vec4(echo(aPrev, aU - uDu), 1.0));
  vec4 cn = projectionMatrix * (modelViewMatrix * vec4(echo(aNext, aU + uDu), 1.0));
  vec2 s = toScreen(c);
  vec2 d1 = s - toScreen(cp);
  vec2 d2 = toScreen(cn) - s;
  vec2 t = normalize(d1 / max(length(d1), 1e-4) + d2 / max(length(d2), 1e-4) + vec2(1e-6, 0.0));
  vec2 n = vec2(-t.y, t.x);
  float depth = -mv.z;
  float w = uWidth * uRefDepth / depth;
  vCov = clamp(w, 0.0, 1.0);
  vCore = max(w, 1.0);
  float hw = vCore * 0.5 + uGlow + 1.0;
  c.xy += n * aSide * hw / (0.5 * uRes) * c.w;
  vDist = aSide * hw;
  vU = aU;
  vDepth = depth;
  gl_Position = c;
}`;

const RIBBON_FRAG = /* glsl */ `
${VIGNETTE}
${FOG}
uniform vec3 uNear;
uniform vec3 uFar;
uniform vec3 uHot;
uniform float uAlpha;
uniform float uGlow;
uniform float uGlowAmt;
uniform float uGateU;
uniform float uTrail;
uniform float uFlash;
uniform float uTint;
uniform float uWave;
varying float vU;
varying float vDist;
varying float vCore;
varying float vCov;
varying float vDepth;

void main() {
  float d = abs(vDist);
  float core = clamp(vCore * 0.5 + 0.5 - d, 0.0, 1.0) * vCov;
  float g = max(uGlow, 1.0);
  float glow = exp(-(d * d) / (g * g * 0.3)) * uGlowAmt;
  float fog = fogAt(vDepth);
  vec3 col = mix(uFar, uNear, fog);
  float age = fract(vU - uGateU);
  float heat = uTrail * exp(-age * 30.0) * uFlash;
  if (uWave >= 0.0) {
    float dw = age - uWave;
    heat += uTrail * exp(-dw * dw * 700.0) * (1.0 - uWave) * 0.9;
  }
  heat = clamp(heat + uTint, 0.0, 1.0);
  col = mix(col, uHot, heat);
  float a = (core + glow * (1.0 + heat * 2.5)) * uAlpha * mix(0.2, 1.0, fog) * vignette();
  gl_FragColor = vec4(col, a);
}`;

const CARD_VERT = /* glsl */ `
${FOG}
attribute vec4 aState;
attribute vec4 aCat;
attribute vec2 aMeta;
varying vec2 vUv;
varying vec4 vState;
varying vec4 vCat;
varying vec2 vMeta;
varying float vLight;
varying float vFog;
void main() {
  vUv = uv;
  vState = aState;
  vCat = aCat;
  vMeta = aMeta;
  vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  vec3 n = normalize(mat3(modelViewMatrix) * mat3(instanceMatrix) * vec3(0.0, 0.0, 1.0));
  vec3 L = normalize(vec3(-0.35, 0.8, 0.5));
  vLight = 0.55 + 0.45 * abs(dot(n, L));
  vFog = fogAt(-mv.z);
  gl_Position = projectionMatrix * mv;
}`;

// A task card: the same rounded slab as the old drafts, now carrying its
// category (a top strip and a small outlined glyph, both in the category's
// muted hue) and its priority (three ivory signal bars, filled to the level,
// never coloured, so it reads apart from the category). Approval repaints the
// whole card coral, strip and glyph included: coral only ever means a yes.
const CARD_FRAG = /* glsl */ `
${VIGNETTE}
uniform vec2 uSize;
uniform vec3 uFill;
uniform vec3 uEdge;
uniform vec3 uInk;
uniform vec3 uIvory;
uniform vec3 uCoral;
uniform vec3 uCoralSoft;
varying vec2 vUv;
varying vec4 vState;
varying vec4 vCat;
varying vec2 vMeta;
varying float vLight;
varying float vFog;

float sdRound(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
float cover(float d, float aa) { return 1.0 - smoothstep(-aa, aa, d); }
float bar(vec2 p, vec2 c, float len, float th, float aa) {
  vec2 q = p - vec2(c.x + len * 0.5, c.y);
  return cover(sdRound(q, vec2(len * 0.5, th * 0.5), th * 0.5), aa);
}
float seg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}
// Outlined glyph of half-height s: 0 envelope, 1 browser window, 2 speech
// bubble, 3 form.
float glyph(vec2 p, float s, float kind, float aa) {
  float d;
  if (kind < 0.5) {
    float box = abs(sdRound(p, vec2(s * 1.3, s * 0.9), s * 0.18));
    float v = min(seg(p, vec2(-s * 1.2, s * 0.78), vec2(0.0, -s * 0.08)), seg(p, vec2(0.0, -s * 0.08), vec2(s * 1.2, s * 0.78)));
    d = min(box, v);
  } else if (kind < 1.5) {
    float box = abs(sdRound(p, vec2(s * 1.3, s * 0.95), s * 0.2));
    float top = seg(p, vec2(-s * 1.25, s * 0.38), vec2(s * 1.25, s * 0.38));
    d = min(box, top);
  } else if (kind < 2.5) {
    float box = abs(sdRound(p - vec2(0.0, s * 0.18), vec2(s * 1.25, s * 0.74), s * 0.5));
    float tail = min(seg(p, vec2(-s * 0.5, -s * 0.52), vec2(-s * 0.78, -s * 1.0)), seg(p, vec2(-s * 0.78, -s * 1.0), vec2(-s * 0.05, -s * 0.56)));
    d = min(box, tail);
  } else {
    float box = abs(sdRound(p, vec2(s * 0.95, s * 1.15), s * 0.18));
    float l1 = seg(p, vec2(-s * 0.5, s * 0.36), vec2(s * 0.5, s * 0.36));
    float l2 = seg(p, vec2(-s * 0.5, -s * 0.22), vec2(s * 0.28, -s * 0.22));
    d = min(box, min(l1, l2));
  }
  float w = s * 0.2;
  return 1.0 - smoothstep(w - aa, w + aa, d);
}

void main() {
  vec2 uv = vUv;
  if (!gl_FrontFacing) uv.x = 1.0 - uv.x;
  vec2 p = (uv - 0.5) * uSize;
  float d = sdRound(p, uSize * 0.5, uSize.y * 0.14);
  float aa = max(fwidth(d), 1e-5);
  float inside = 1.0 - smoothstep(-aa, aa, d);
  if (inside < 0.01 || vMeta.y < 0.004) discard;
  float edge = 1.0 - smoothstep(0.0, aa * 1.6, abs(d + aa * 0.8));

  float warm = vState.x;
  float flash = vState.y;
  float seed = vState.z;
  float hi = vState.w;
  vec3 cat = vCat.rgb;

  // Category strip along the top edge.
  float top = uSize.y * 0.5;
  float stripH = uSize.y * 0.12;
  float strip = smoothstep(top - stripH - aa, top - stripH + aa, p.y);

  // Glyph, then a short title bar beside it, then two body lines.
  float s = uSize.y * 0.105;
  vec2 gc = vec2(-uSize.x * 0.5 + uSize.x * 0.15, top - stripH - uSize.y * 0.17);
  float gly = glyph(p - gc, s, vCat.w, aa);
  float th = uSize.y * 0.07;
  float ink = bar(p, vec2(gc.x + s * 1.3 + uSize.x * 0.06, gc.y), uSize.x * (0.3 + 0.1 * seed), th * 1.2, aa) * 0.9;
  float x0 = -uSize.x * 0.5 + uSize.x * 0.1;
  ink += bar(p, vec2(x0, -uSize.y * 0.07), uSize.x * (0.62 + 0.12 * fract(seed * 7.0)), th, aa) * 0.55;
  ink += bar(p, vec2(x0, -uSize.y * 0.25), uSize.x * (0.4 + 0.2 * fract(seed * 13.0)), th, aa) * 0.55;

  // Priority: three signal bars, filled to the level.
  float bw = uSize.x * 0.026;
  float gap = bw * 0.7;
  float prX = uSize.x * 0.5 - uSize.x * 0.1 - 3.0 * bw - 2.0 * gap;
  float prY = gc.y - s * 0.9;
  float prOn = 0.0;
  float prOff = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float h = uSize.y * (0.07 + 0.045 * fi);
    vec2 c = vec2(prX + fi * (bw + gap) + bw * 0.5, prY + h * 0.5);
    float m = cover(sdRound(p - c, vec2(bw * 0.5, h * 0.5), bw * 0.3), aa);
    if (fi < vMeta.x - 0.5) prOn = max(prOn, m);
    else prOff = max(prOff, m);
  }

  vec3 fill = uFill * vLight + uCoral * (0.05 * warm + 0.16 * flash) + uIvory * 0.035 * hi;
  vec3 hue = mix(cat, uCoralSoft, warm);
  vec3 inkCol = mix(uInk, uCoralSoft * 0.8, warm * 0.55);
  vec3 edgeCol = mix(uEdge * (0.75 + 0.35 * vLight), uCoralSoft, clamp(warm * 0.9 + flash, 0.0, 1.0));
  edgeCol += uCoralSoft * flash * 0.25 + uIvory * 0.22 * hi;

  vec3 col = fill;
  col = mix(col, hue * (0.8 + 0.2 * vLight), strip * 0.92);
  col = mix(col, inkCol, clamp(ink, 0.0, 1.0) * 0.6);
  col = mix(col, hue, gly);
  col = mix(col, mix(uIvory * 0.86, uCoralSoft, warm * 0.6), prOn);
  col = mix(col, uInk * 0.55, prOff * 0.8);
  col = mix(col, edgeCol, edge * (1.0 - strip * 0.6));
  col *= mix(0.42, 1.0, vFog);
  float alpha = inside * mix(0.4, 1.0, vFog) * vignette() * vMeta.y;
  gl_FragColor = vec4(min(col, vec3(0.98)), alpha);
}`;

const HALO_VERT = /* glsl */ `
${FOG}
attribute vec3 aCenter;
attribute vec4 aColor;
attribute float aSize;
varying vec2 vP;
varying vec4 vColor;
void main() {
  vec4 mv = modelViewMatrix * vec4(aCenter, 1.0);
  mv.xy += position.xy * aSize;
  vP = position.xy * 2.0;
  vColor = vec4(aColor.rgb, aColor.a * mix(0.35, 1.0, fogAt(-mv.z)));
  gl_Position = projectionMatrix * mv;
}`;

const HALO_FRAG = /* glsl */ `
${VIGNETTE}
varying vec2 vP;
varying vec4 vColor;
void main() {
  float r2 = dot(vP, vP);
  if (r2 > 1.0) discard;
  float g = exp(-r2 * 5.0) * (1.0 - r2);
  float a = g * vColor.a * vignette();
  gl_FragColor = vec4(vColor.rgb * a, a);
}`;

const DUST_VERT = /* glsl */ `
${FOG}
attribute float aSeed;
uniform float uTime;
uniform float uSize;
uniform float uRefDepth;
varying float vAlpha;
void main() {
  vec3 p = position;
  p.x += sin(uTime * 0.07 + aSeed * 6.2831) * 0.12;
  p.y += sin(uTime * 0.11 + aSeed * 12.566) * 0.08;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float depth = -mv.z;
  gl_PointSize = max(uSize * uRefDepth / depth, 1.0);
  vAlpha = (0.1 + 0.22 * fract(aSeed * 17.0)) * fogAt(depth);
  gl_Position = projectionMatrix * mv;
}`;

const DUST_FRAG = /* glsl */ `
${VIGNETTE}
uniform vec3 uColor;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float a = (1.0 - smoothstep(0.2, 0.5, length(c))) * vAlpha * vignette();
  gl_FragColor = vec4(uColor, a);
}`;

interface Ribbon {
  geometry: BufferGeometry;
  position: BufferAttribute;
  prev: BufferAttribute;
  next: BufferAttribute;
  points: number;
}

/** Ribbon over a closed polyline of `points` vertices where the last repeats the first. */
function makeRibbon(points: number): Ribbon {
  const verts = points * 2;
  const geometry = new BufferGeometry();
  const position = new BufferAttribute(new Float32Array(verts * 3), 3).setUsage(DynamicDrawUsage);
  const prev = new BufferAttribute(new Float32Array(verts * 3), 3).setUsage(DynamicDrawUsage);
  const next = new BufferAttribute(new Float32Array(verts * 3), 3).setUsage(DynamicDrawUsage);
  const side = new Float32Array(verts);
  const u = new Float32Array(verts);
  for (let i = 0; i < points; i++) {
    side[i * 2] = -1;
    side[i * 2 + 1] = 1;
    u[i * 2] = u[i * 2 + 1] = i / (points - 1);
  }
  const index: number[] = [];
  for (let i = 0; i < points - 1; i++) {
    const a = i * 2;
    index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  geometry.setAttribute("position", position);
  geometry.setAttribute("aPrev", prev);
  geometry.setAttribute("aNext", next);
  geometry.setAttribute("aSide", new BufferAttribute(side, 1));
  geometry.setAttribute("aU", new BufferAttribute(u, 1));
  geometry.setIndex(index);
  return { geometry, position, prev, next, points };
}

function writeRibbon(r: Ribbon, pts: Float32Array) {
  const n = r.points - 1;
  const pos = r.position.array as Float32Array;
  const prv = r.prev.array as Float32Array;
  const nxt = r.next.array as Float32Array;
  for (let i = 0; i <= n; i++) {
    const ip = i === 0 ? n - 1 : i - 1;
    const inx = i === n ? 1 : i + 1;
    for (let s = 0; s < 2; s++) {
      const o = (i * 2 + s) * 3;
      for (let k = 0; k < 3; k++) {
        pos[o + k] = pts[i * 3 + k]!;
        prv[o + k] = pts[ip * 3 + k]!;
        nxt[o + k] = pts[inx * 3 + k]!;
      }
    }
  }
  r.position.needsUpdate = true;
  r.prev.needsUpdate = true;
  r.next.needsUpdate = true;
}

function ribbonMaterial(uniforms: Record<string, IUniform>): ShaderMaterial {
  return new ShaderMaterial({
    uniforms,
    vertexShader: RIBBON_VERT,
    fragmentShader: RIBBON_FRAG,
    transparent: true,
    depthWrite: false,
    // Screen-space expansion winds every triangle the same way; never cull.
    side: DoubleSide,
  });
}

interface Card {
  id: string | null;
  mode: number;
  /** Arc position as an unwrapped fraction of the loop, and speed along it (world units/s). */
  u: number;
  v: number;
  /** The slot this card is steering to, as a fraction in [0, 1). */
  slot: number;
  /** Unwrapped position it is currently gliding to. */
  target: number;
  /** When its glide toward `slot` may start (the ripple). */
  startAt: number;
  /** When it began settling onto the ring (a new task); -1e9 for none. */
  bornAt: number;
  rank: number;
  version: number;
  t0: number;
  // sent back
  arcFrom: number;
  arcDist: number;
  arcDur: number;
  arcLift: number;
  pitch: number;
  // approved
  v0: number;
  speed: number;
  gateU: number;
  peelU: number;
  crossed: boolean;
  peeled: boolean;
  peelAt: number;
  /** Where it left the ring: centre, then tangent, up and normal. */
  peel: Float32Array;
  /** Distance and rise travelled since it left the ring. */
  s: number;
  rise: number;
  // look
  alpha: number;
  warm: number;
  warmTarget: number;
  flashStart: number;
  hi: number;
  float: number;
  r: number;
  g: number;
  b: number;
  glyph: number;
  pri: number;
  seed: number;
  phase: number;
}

function newCard(): Card {
  return {
    id: null,
    mode: FREE,
    u: 0,
    v: 0,
    slot: 0,
    target: 0,
    startAt: 0,
    bornAt: -1e9,
    rank: 0,
    version: 1,
    t0: 0,
    arcFrom: 0,
    arcDist: 0,
    arcDur: 1,
    arcLift: 0,
    pitch: 0,
    v0: 0,
    speed: 0,
    gateU: 0,
    peelU: 0,
    crossed: false,
    peeled: false,
    peelAt: 0,
    peel: new Float32Array(12),
    s: 0,
    rise: 0,
    alpha: 1,
    warm: 0,
    warmTarget: 0,
    flashStart: -1e9,
    hi: 0,
    float: 0,
    r: 1,
    g: 1,
    b: 1,
    glyph: 0,
    pri: 1,
    seed: 0,
    phase: 0,
  };
}

/** Stable 0..1 from a task id, so a card's ink lines and float never change between renders. */
function idSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10007) / 10007;
}

export function createLoopScene(host: HTMLElement, opts: LoopSceneOptions): LoopSceneController | null {
  // Probe the context ourselves so an unsupported device never reaches three's
  // console.error path: we just return null and the SVG fallback stays.
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:manipulation;";
  const deviceDpr = window.devicePixelRatio || 1;
  let dpr = Math.min(deviceDpr, opts.mobile ? 1.5 : 1.75);
  let context: WebGL2RenderingContext | null = null;
  try {
    context = canvas.getContext("webgl2", {
      alpha: true,
      antialias: dpr < 2,
      premultipliedAlpha: true,
      depth: true,
      stencil: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
    });
  } catch {
    context = null;
  }
  if (!context) return null;

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, context, alpha: true, antialias: dpr < 2 });
  } catch {
    return null;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(dpr);
  host.appendChild(canvas);

  const scene = new Scene();
  const camera = new PerspectiveCamera(VIEW.fovDeg, 1, 0.1, 60);

  // Phones get larger cards so each one still reads as a document.
  const K = opts.mobile ? 1.4 : 1;
  const cardW = CARD.w * K;
  const cardH = CARD.h * K;
  const lift0 = cardH / 2 + CARD.lift;
  const gateR = GATE_RADIUS * K;
  const SAMPLES = opts.mobile ? 240 : 320;
  const PER_SEG = 96;
  const ctrl = new Float32Array(CTRL_COUNT * 3);
  const dense = new Float32Array((CTRL_COUNT * PER_SEG + 1) * 4);
  const pts = new Float32Array((SAMPLES + 1) * 3);
  const tan = new Float32Array((SAMPLES + 1) * 3);
  const ringPts = new Float32Array(65 * 3);
  const [pnx, pny, pnz] = planeNormal();
  let perimeter = 1;

  // ---------- uniforms shared by reference ----------
  const res: IUniform<[number, number]> = { value: [1, 1] };
  const uFogNear = { value: 6 };
  const uFogFar = { value: 12 };
  const uRefDepth = { value: 9 };
  const uTime = { value: 0 };

  // ---------- loop ribbons ----------
  const loop = makeRibbon(SAMPLES + 1);
  const ribbonBase = (): Record<string, IUniform> => ({
    uRes: res,
    uFogNear,
    uFogFar,
    uRefDepth,
    uTime,
    uDu: { value: 1 / SAMPLES },
    uWidth: { value: 1 },
    uGlow: { value: 4 },
    uGlowAmt: { value: 0.1 },
    uAlpha: { value: 1 },
    uNear: { value: ZINC_400 },
    uFar: { value: ZINC_700 },
    uHot: { value: CORAL },
    uEchoAmp: { value: 0 },
    uEchoSeed: { value: 0 },
    uGateU: { value: GATE_U },
    uTrail: { value: 0 },
    uFlash: { value: 0 },
    uTint: { value: 0 },
    uWave: { value: -1 },
  });

  const mainU = ribbonBase();
  mainU.uTrail!.value = 1;
  mainU.uAlpha!.value = 0.82;
  const mainMat = ribbonMaterial(mainU);
  const mainMesh = new Mesh(loop.geometry, mainMat);
  mainMesh.renderOrder = 3;

  const echoMats: ShaderMaterial[] = [];
  const echoMeshes: Mesh[] = [];
  for (const echo of ECHOES) {
    const u = ribbonBase();
    u.uEchoSeed!.value = echo.seed;
    u.uAlpha!.value = echo.alpha;
    u.uGlowAmt!.value = 0;
    u.uNear!.value = ZINC_500;
    const m = ribbonMaterial(u);
    echoMats.push(m);
    const mesh = new Mesh(loop.geometry, m);
    mesh.renderOrder = 2;
    echoMeshes.push(mesh);
  }

  // ---------- gate ring ----------
  const ring = makeRibbon(65);
  const ringU = ribbonBase();
  ringU.uNear!.value = ZINC_500.clone();
  ringU.uFar!.value = ZINC_600;
  ringU.uGlowAmt!.value = 0.18;
  ringU.uGlow!.value = 5;
  const ringMat = ribbonMaterial(ringU);
  const ringMesh = new Mesh(ring.geometry, ringMat);
  ringMesh.renderOrder = 4;

  // ---------- cards ----------
  const cardGeo = new PlaneGeometry(cardW, cardH);
  const stateAttr = new InstancedBufferAttribute(new Float32Array(MAX * 4), 4).setUsage(DynamicDrawUsage);
  const catAttr = new InstancedBufferAttribute(new Float32Array(MAX * 4), 4).setUsage(DynamicDrawUsage);
  const metaAttr = new InstancedBufferAttribute(new Float32Array(MAX * 2), 2).setUsage(DynamicDrawUsage);
  cardGeo.setAttribute("aState", stateAttr);
  cardGeo.setAttribute("aCat", catAttr);
  cardGeo.setAttribute("aMeta", metaAttr);
  const cardMat = new ShaderMaterial({
    uniforms: {
      uRes: res,
      uFogNear,
      uFogFar,
      uSize: { value: [cardW, cardH] },
      uFill: { value: CARD_FILL },
      uEdge: { value: ZINC_400 },
      uInk: { value: ZINC_600 },
      uIvory: { value: ZINC_200 },
      uCoral: { value: CORAL },
      uCoralSoft: { value: CORAL_SOFT },
    },
    vertexShader: CARD_VERT,
    fragmentShader: CARD_FRAG,
    transparent: true,
    depthWrite: true,
    side: DoubleSide,
  });
  const cards = new InstancedMesh(cardGeo, cardMat, MAX);
  cards.instanceMatrix.setUsage(DynamicDrawUsage);
  cards.renderOrder = 1;

  // ---------- halos (cards + gate), one instanced draw ----------
  const haloCount = MAX + 1;
  const haloGeo = new InstancedBufferGeometry();
  const quad = new PlaneGeometry(1, 1);
  haloGeo.index = quad.index;
  haloGeo.setAttribute("position", quad.getAttribute("position"));
  const haloCenter = new InstancedBufferAttribute(new Float32Array(haloCount * 3), 3).setUsage(DynamicDrawUsage);
  const haloColor = new InstancedBufferAttribute(new Float32Array(haloCount * 4), 4).setUsage(DynamicDrawUsage);
  const haloSize = new InstancedBufferAttribute(new Float32Array(haloCount), 1).setUsage(DynamicDrawUsage);
  haloGeo.setAttribute("aCenter", haloCenter);
  haloGeo.setAttribute("aColor", haloColor);
  haloGeo.setAttribute("aSize", haloSize);
  haloGeo.instanceCount = haloCount;
  const haloMat = new ShaderMaterial({
    uniforms: { uRes: res, uFogNear, uFogFar },
    vertexShader: HALO_VERT,
    fragmentShader: HALO_FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: CustomBlending,
    blendSrc: OneFactor,
    blendDst: OneFactor,
    blendSrcAlpha: OneFactor,
    blendDstAlpha: OneMinusSrcAlphaFactor,
  });
  const halos = new Mesh(haloGeo, haloMat);
  halos.renderOrder = 5;

  // ---------- dust ----------
  const dustCount = opts.mobile ? 50 : 90;
  const dustGeo = new BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);
  const dustSeed = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i++) {
    const a = hash01(i * 3.1) * Math.PI * 2;
    const r = 1.2 + hash01(i * 7.7) * 4.2;
    dustPos[i * 3] = Math.cos(a) * r * 1.3;
    dustPos[i * 3 + 1] = (hash01(i * 5.3) - 0.45) * 3.2;
    dustPos[i * 3 + 2] = Math.sin(a) * r * 0.8;
    dustSeed[i] = hash01(i * 1.9);
  }
  dustGeo.setAttribute("position", new BufferAttribute(dustPos, 3));
  dustGeo.setAttribute("aSeed", new BufferAttribute(dustSeed, 1));
  const dustMat = new ShaderMaterial({
    uniforms: { uRes: res, uFogNear, uFogFar, uTime, uRefDepth, uSize: { value: 1.6 }, uColor: { value: ZINC_400 } },
    vertexShader: DUST_VERT,
    fragmentShader: DUST_FRAG,
    transparent: true,
    depthWrite: false,
  });
  const dust = new Points(dustGeo, dustMat);
  dust.renderOrder = 0;

  for (const o of [dust, cards, ...echoMeshes, mainMesh, ringMesh, halos]) {
    o.frustumCulled = false;
    scene.add(o);
  }

  // ---------- state ----------
  const pool: Card[] = Array.from({ length: MAX }, newCard);
  let items: SceneItem[] = opts.items;
  let highlightId: string | null = null;

  let t = 0;
  let reduced = opts.reducedMotion;
  let visible = opts.visible;
  let interactive = opts.interactive;
  let disposed = false;
  let lost = false;
  let raf = 0;
  let last = 0;
  let cssW = 0;
  let cssH = 0;
  let fitD = 9;
  let elevation = elevationFor(1.5);
  let gateStart = -1e9;
  let gateFrom = 0;
  let waveStart = -1e9;
  let waiting = 0;
  let sentAt = -1e9;
  let stillFlash = 0;
  let stillSent = false;
  let stillTimer = 0;
  let sentTimer = 0;
  const tight: Spring = { x: 0, v: 0 };
  let tightTarget = 0;
  let builtTight = -1;
  const dolly: Spring = { x: clamp01(opts.progress), v: 0 };
  let dollyTarget = dolly.x;
  const yaw: Spring = { x: 0, v: 0 };
  const pitch: Spring = { x: 0, v: 0 };
  let yawTarget = 0;
  let pitchTarget = 0;
  const gateCenter = new Vector3();
  const gateEdge = new Vector3();
  const tmp = new Vector3();
  const gatePx = { x: -1e4, y: -1e4, r: 0 };

  const snap: SceneSnapshot = {
    width: 0,
    height: 0,
    cards: Array.from({ length: MAX }, () => ({ id: "", x: 0, y: 0, w: 0, h: 0, alpha: 0 })),
    count: 0,
    gate: { x: 0, y: 0, labelX: 0, labelY: 0, sent: false },
  };

  // ---------- geometry ----------
  function rebuild(tightness: number) {
    controlPoints(tightness, ctrl);
    perimeter = sampleLoop(ctrl, SAMPLES, pts, dense, PER_SEG);
    for (let i = 0; i <= SAMPLES; i++) {
      const a = (i === 0 ? SAMPLES - 1 : i - 1) * 3;
      const b = (i === SAMPLES ? 1 : i + 1) * 3;
      let tx = pts[b]! - pts[a]!;
      let ty = pts[b + 1]! - pts[a + 1]!;
      let tz = pts[b + 2]! - pts[a + 2]!;
      const l = Math.hypot(tx, ty, tz) || 1;
      tx /= l;
      ty /= l;
      tz /= l;
      tan[i * 3] = tx;
      tan[i * 3 + 1] = ty;
      tan[i * 3 + 2] = tz;
    }
    writeRibbon(loop, pts);
    // Echoes are the looser drafts of the rule; they collapse onto it as it tightens.
    for (let e = 0; e < echoMats.length; e++) {
      echoMats[e]!.uniforms.uEchoAmp!.value = ECHOES[e]!.amp * (1 - 0.92 * tightness);
    }
    // Gate ring, perpendicular to the path, framing the card height.
    const f = frameAt(GATE_U);
    const cx = f.px + f.yx * lift0;
    const cy = f.py + f.yy * lift0;
    const cz = f.pz + f.yz * lift0;
    gateCenter.set(cx, cy, cz);
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      const c = Math.cos(a) * gateR;
      const s = Math.sin(a) * gateR;
      ringPts[i * 3] = cx + f.yx * c + f.zx * s;
      ringPts[i * 3 + 1] = cy + f.yy * c + f.zy * s;
      ringPts[i * 3 + 2] = cz + f.yz * c + f.zz * s;
    }
    gateEdge.set(cx + f.yx * gateR, cy + f.yy * gateR, cz + f.yz * gateR);
    writeRibbon(ring, ringPts);
    builtTight = tightness;
  }

  // Frame (position, tangent X, up Y, normal Z) at arc fraction u.
  const fr = { px: 0, py: 0, pz: 0, tx: 1, ty: 0, tz: 0, yx: 0, yy: 1, yz: 0, zx: 0, zy: 0, zz: 1 };
  function frameAt(u: number) {
    const w = u - Math.floor(u);
    const fIdx = w * SAMPLES;
    const i0 = Math.min(Math.floor(fIdx), SAMPLES - 1);
    const a = fIdx - i0;
    const o0 = i0 * 3;
    const o1 = o0 + 3;
    fr.px = pts[o0]! + (pts[o1]! - pts[o0]!) * a;
    fr.py = pts[o0 + 1]! + (pts[o1 + 1]! - pts[o0 + 1]!) * a;
    fr.pz = pts[o0 + 2]! + (pts[o1 + 2]! - pts[o0 + 2]!) * a;
    let tx = tan[o0]! + (tan[o1]! - tan[o0]!) * a;
    let ty = tan[o0 + 1]! + (tan[o1 + 1]! - tan[o0 + 1]!) * a;
    let tz = tan[o0 + 2]! + (tan[o1 + 2]! - tan[o0 + 2]!) * a;
    let l = Math.hypot(tx, ty, tz) || 1;
    tx /= l;
    ty /= l;
    tz /= l;
    const dp = pnx * tx + pny * ty + pnz * tz;
    let yx = pnx - tx * dp;
    let yy = pny - ty * dp;
    let yz = pnz - tz * dp;
    l = Math.hypot(yx, yy, yz) || 1;
    yx /= l;
    yy /= l;
    yz /= l;
    fr.tx = tx;
    fr.ty = ty;
    fr.tz = tz;
    fr.yx = yx;
    fr.yy = yy;
    fr.yz = yz;
    fr.zx = ty * yz - tz * yy;
    fr.zy = tz * yx - tx * yz;
    fr.zz = tx * yy - ty * yx;
    return fr;
  }

  // ---------- the queue ----------
  const slotFor = (k: number, n: number) => queueSlot(k, n, perimeter / K);
  /** The unwrapped position of `slot` nearest to `u` (a queue move is never more than half a lap). */
  const nearest = (u: number, slot: number) => {
    const d = slot - frac(u);
    return u + d - Math.round(d);
  };

  function setLook(c: Card, it: SceneItem) {
    const cat = CATEGORIES[it.category];
    c.r = cat.rgb[0] / 255;
    c.g = cat.rgb[1] / 255;
    c.b = cat.rgb[2] / 255;
    c.glyph = cat.glyph;
    c.pri = it.priority;
  }

  function spawn(c: Card, it: SceneItem, slot: number, rank: number, delay: number, settled: boolean) {
    Object.assign(c, newCard(), { peel: c.peel });
    c.id = it.id;
    c.mode = QUEUED;
    c.version = it.version;
    c.rank = rank;
    c.seed = idSeed(it.id);
    c.phase = c.seed * Math.PI * 2;
    setLook(c, it);
    c.slot = slot;
    if (settled) {
      c.u = slot;
      c.bornAt = -1e9;
    } else {
      // A little behind its slot and above the ring: it drifts down and in.
      c.u = slot - 0.02;
      c.bornAt = t + delay;
    }
    c.target = c.u;
    c.startAt = settled ? t : c.bornAt;
  }

  function startExit(c: Card) {
    c.mode = EXIT;
    c.t0 = t;
    c.v0 = Math.max(0, c.v);
    c.warmTarget = 1;
    c.arcLift = 0;
    c.pitch = 0;
    const ahead = frac(GATE_U - frac(c.u));
    c.gateU = c.u + (ahead > 0.5 ? 0 : ahead);
    c.peelU = c.gateU + PEEL / perimeter;
    c.crossed = false;
    c.peeled = false;
    c.s = 0;
    c.rise = 0;
  }

  function startArc(c: Card, slot: number) {
    // The short way round; a tie goes forward, over the gate.
    const fwd = frac(slot - frac(c.u));
    let dist = fwd <= 0.5 + 1e-9 ? fwd : fwd - 1;
    // A lone card sent back is its own back of the queue: it hops in place.
    if (Math.abs(dist) < 1e-3) dist = 0;
    c.mode = ARC;
    c.t0 = t;
    c.arcFrom = c.u;
    c.arcDist = dist;
    c.arcDur = 0.95 + 1.3 * Math.abs(dist);
    c.slot = slot;
    c.v = 0;
  }

  function free(c: Card) {
    c.id = null;
    c.mode = FREE;
    c.alpha = 0;
  }

  function applyItems(next: SceneItem[], boot: boolean) {
    items = next;
    const n = next.length;
    const live = new Set(next.map((i) => i.id));
    let approved = false;
    for (const c of pool) {
      if (c.id && (c.mode === QUEUED || c.mode === ARC) && !live.has(c.id)) {
        if (reduced || boot) free(c);
        else startExit(c);
        approved = true;
      }
    }
    let entering = 0;
    next.forEach((it, k) => {
      const slot = slotFor(k, n);
      let c = pool.find((x) => x.id === it.id && x.mode !== EXIT);
      if (!c) {
        c = pool.find((x) => x.mode === FREE);
        if (!c) return;
        spawn(c, it, slot, k, entering * ENTER_STAGGER, boot || reduced);
        entering++;
        return;
      }
      const sentBack = it.version > c.version;
      c.version = it.version;
      c.rank = k;
      setLook(c, it);
      if (sentBack && !reduced) {
        startArc(c, slot);
      } else if (Math.abs(frac(c.slot - slot + 0.5) - 0.5) > 1e-6 || sentBack) {
        c.slot = slot;
        c.startAt = t + RIPPLE0 + k * RIPPLE;
      }
    });
    if (approved && !boot) {
      gateFrom = flashLevel(t, gateStart, gateFrom);
      gateStart = t;
      waveStart = t;
      tightTarget = Math.min(1, tightTarget + TIGHTEN_STEP);
    }
    // A fresh batch starts from the loose rule again.
    if (entering >= 3 && !boot) tightTarget = 0;
    // Nobody watching (scrolled away, a hidden tab): motion is for the viewer,
    // so skip it. Without this, a phone reader approving from the panel below
    // a paused scene came back to approved cards still crawling round the ring
    // to reach the gate.
    if (!reduced && !boot && (!visible || document.hidden || cssW === 0)) {
      settleAll();
      return;
    }
    if (reduced) {
      settleAll();
      if (approved && !boot) {
        tight.x = tightTarget;
        stillFlash = 1;
        stillSent = true;
        window.clearTimeout(stillTimer);
        window.clearTimeout(sentTimer);
        stillTimer = window.setTimeout(() => {
          stillFlash = 0;
          renderStill();
        }, 900);
        sentTimer = window.setTimeout(() => {
          stillSent = false;
          renderStill();
        }, SENT_SHOW * 1000);
      }
      if (entering >= 3) tight.x = tightTarget;
      renderStill();
    }
  }

  /** Reduced motion: every card straight to its slot, nothing in flight. */
  function settleAll() {
    for (const c of pool) {
      if (c.mode === EXIT) {
        free(c);
        continue;
      }
      if (c.mode === FREE) continue;
      c.mode = QUEUED;
      c.u = nearest(c.u, c.slot);
      c.target = c.u;
      c.v = 0;
      c.startAt = t;
      c.bornAt = -1e9;
      c.arcLift = 0;
      c.pitch = 0;
      c.float = 0;
      c.alpha = 1;
    }
  }

  // ---------- per-frame ----------
  function stepCards(dt: number) {
    for (const c of pool) {
      if (c.mode === FREE) continue;
      if (c.mode === QUEUED) {
        if (t >= c.startAt) c.target = nearest(c.u, c.slot);
        const dist = (c.target - c.u) * perimeter;
        const desired = Math.sign(dist) * Math.min(VMAX, Math.abs(dist) * KD);
        c.v = damp(c.v, desired, Math.abs(desired) < Math.abs(c.v) ? 9 : 3.4, dt);
        let nu = c.u + (c.v * dt) / perimeter;
        if ((dist >= 0 && nu > c.target) || (dist < 0 && nu < c.target)) {
          nu = c.target;
          c.v = 0;
        }
        c.u = nu;
      } else if (c.mode === ARC) {
        const p = clamp01((t - c.t0) / c.arcDur);
        const f = easeInOutCubic(clamp01((p - 0.12) / 0.88));
        c.u = c.arcFrom + c.arcDist * f;
        c.arcLift = ARC_H * K * smoothstep(0, 0.34, p) * (1 - smoothstep(0.64, 1, p));
        // Nose up on the way up, nose down on the way down.
        const dir = c.arcDist < 0 ? -1 : 1;
        c.pitch = 0.16 * dir * (hump(p, 0.04, 0.34) - hump(p, 0.6, 0.96));
        if (p >= 1) {
          c.mode = QUEUED;
          c.v = 0;
          c.arcLift = 0;
          c.pitch = 0;
          c.target = c.u;
          c.startAt = t;
        }
      } else if (c.mode === EXIT) {
        const tau = t - c.t0;
        c.speed = c.v0 + (EXIT_SPEED - c.v0) * smoothstep(0, 0.55, tau);
        if (!c.peeled) {
          c.u += (c.speed * dt) / perimeter;
          if (!c.crossed && c.u >= c.gateU) {
            // Stamped as it passes through the ring.
            c.crossed = true;
            c.flashStart = t;
            sentAt = t;
          }
          if (c.u >= c.peelU) {
            // Leave the ring here, along the direction of travel.
            const f = frameAt(c.peelU);
            const L = lift0;
            const q = c.peel;
            q[0] = f.px + f.yx * L;
            q[1] = f.py + f.yy * L;
            q[2] = f.pz + f.yz * L;
            q[3] = f.tx;
            q[4] = f.ty;
            q[5] = f.tz;
            q[6] = f.yx;
            q[7] = f.yy;
            q[8] = f.yz;
            q[9] = f.zx;
            q[10] = f.zy;
            q[11] = f.zz;
            c.peeled = true;
            c.peelAt = t;
            c.s = 0;
          }
        } else {
          const k = t - c.peelAt;
          c.s += c.speed * dt;
          c.rise = 0.35 * K * k * k;
          if (k >= FADE) free(c);
        }
      }
    }
  }

  // Scratch pose: centre, then the card's own axes after roll and pitch.
  const pose = { x: 0, y: 0, z: 0, tx: 1, ty: 0, tz: 0, yx: 0, yy: 1, yz: 0, zx: 0, zy: 0, zz: 1, s: 1, a: 1 };

  function computePose(c: Card) {
    let tx: number, ty: number, tz: number, yx: number, yy: number, yz: number, zx: number, zy: number, zz: number;
    let cx: number, cy: number, cz: number;
    const enter = clamp01((t - c.bornAt) / ENTER);
    const enterLift = 0.9 * K * (1 - easeOutCubic(enter));
    let alpha = smoothstep(0, 0.55, enter);
    const hiLift = 0.035 * K * c.hi;
    const w = (Math.PI * 2) / (3.4 + 0.8 * c.seed);
    const amp = FLOAT_A * K * (c.rank === 0 ? 0.5 : 1);
    const floatLift = c.float * amp * Math.sin(t * w + c.phase);
    const roll = c.float * 0.03 * Math.sin(t * w * 0.8 + c.phase + 1.3);

    if (c.mode === EXIT && c.peeled) {
      const q = c.peel;
      tx = q[3]!;
      ty = q[4]!;
      tz = q[5]!;
      yx = q[6]!;
      yy = q[7]!;
      yz = q[8]!;
      zx = q[9]!;
      zy = q[10]!;
      zz = q[11]!;
      cx = q[0]! + tx * c.s + yx * c.rise;
      cy = q[1]! + ty * c.s + yy * c.rise;
      cz = q[2]! + tz * c.s + yz * c.rise;
      alpha *= 1 - smoothstep(0, FADE, t - c.peelAt);
    } else {
      const f = frameAt(c.u);
      tx = f.tx;
      ty = f.ty;
      tz = f.tz;
      yx = f.yx;
      yy = f.yy;
      yz = f.yz;
      zx = f.zx;
      zy = f.zy;
      zz = f.zz;
      const L = lift0 + enterLift + floatLift + c.arcLift + hiLift;
      cx = f.px + yx * L;
      cy = f.py + yy * L;
      cz = f.pz + yz * L;
    }

    // Roll about the direction of travel (the idle float's gentle rock).
    if (roll !== 0) {
      const cr = Math.cos(roll);
      const sr = Math.sin(roll);
      const ax = yx * cr + zx * sr;
      const ay = yy * cr + zy * sr;
      const az = yz * cr + zz * sr;
      zx = zx * cr - yx * sr;
      zy = zy * cr - yy * sr;
      zz = zz * cr - yz * sr;
      yx = ax;
      yy = ay;
      yz = az;
    }
    // Pitch about the card's normal (a sent-back card noses up, then down).
    if (c.pitch !== 0) {
      const cp = Math.cos(c.pitch);
      const sp = Math.sin(c.pitch);
      const ax = tx * cp + yx * sp;
      const ay = ty * cp + yy * sp;
      const az = tz * cp + yz * sp;
      yx = yx * cp - tx * sp;
      yy = yy * cp - ty * sp;
      yz = yz * cp - tz * sp;
      tx = ax;
      ty = ay;
      tz = az;
    }

    const flash = reduced ? 0 : flashLevel(t, c.flashStart, 0);
    pose.x = cx;
    pose.y = cy;
    pose.z = cz;
    pose.tx = tx;
    pose.ty = ty;
    pose.tz = tz;
    pose.yx = yx;
    pose.yy = yy;
    pose.yz = yz;
    pose.zx = zx;
    pose.zy = zy;
    pose.zz = zz;
    pose.s = (1 + 0.05 * flash) * (1 + 0.06 * c.hi) * (c.mode === EXIT && c.peeled ? 1 - 0.08 * smoothstep(0, FADE, t - c.peelAt) : 1);
    pose.a = alpha;
    return flash;
  }

  function updateLook(dt: number) {
    for (const c of pool) {
      if (c.mode === FREE) continue;
      const resting = c.mode === QUEUED && Math.abs(c.v) < 0.04 && t > c.bornAt + ENTER && !reduced;
      c.float = damp(c.float, resting ? 1 : 0, 1.6, dt);
      c.hi = damp(c.hi, c.id !== null && c.id === highlightId && c.mode !== EXIT ? 1 : 0, 10, dt);
      c.warm = damp(c.warm, c.warmTarget, 12, dt);
    }
  }

  function writeInstances(gateFlash: number, waitGlow: number) {
    const m = cards.instanceMatrix.array as Float32Array;
    const st = stateAttr.array as Float32Array;
    const ca = catAttr.array as Float32Array;
    const me = metaAttr.array as Float32Array;
    const hc = haloCenter.array as Float32Array;
    const hcol = haloColor.array as Float32Array;
    const hs = haloSize.array as Float32Array;
    for (let i = 0; i < MAX; i++) {
      const c = pool[i]!;
      const o = i * 16;
      if (c.mode === FREE) {
        for (let k = 0; k < 16; k++) m[o + k] = 0;
        me[i * 2 + 1] = 0;
        hcol[i * 4 + 3] = 0;
        continue;
      }
      const flash = computePose(c);
      const s = pose.s;
      m[o] = pose.tx * s;
      m[o + 1] = pose.ty * s;
      m[o + 2] = pose.tz * s;
      m[o + 3] = 0;
      m[o + 4] = pose.yx * s;
      m[o + 5] = pose.yy * s;
      m[o + 6] = pose.yz * s;
      m[o + 7] = 0;
      m[o + 8] = pose.zx;
      m[o + 9] = pose.zy;
      m[o + 10] = pose.zz;
      m[o + 11] = 0;
      m[o + 12] = pose.x;
      m[o + 13] = pose.y;
      m[o + 14] = pose.z;
      m[o + 15] = 1;
      st[i * 4] = c.warm;
      st[i * 4 + 1] = flash;
      st[i * 4 + 2] = c.seed;
      st[i * 4 + 3] = c.hi;
      ca[i * 4] = c.r;
      ca[i * 4 + 1] = c.g;
      ca[i * 4 + 2] = c.b;
      ca[i * 4 + 3] = c.glyph;
      me[i * 2] = c.pri;
      me[i * 2 + 1] = pose.a;
      c.alpha = pose.a;
      hc[i * 3] = pose.x;
      hc[i * 3 + 1] = pose.y;
      hc[i * 3 + 2] = pose.z;
      hcol[i * 4] = CORAL.x;
      hcol[i * 4 + 1] = CORAL.y;
      hcol[i * 4 + 2] = CORAL.z;
      hcol[i * 4 + 3] = (0.55 * flash + 0.1 * c.warm) * pose.a;
      hs[i] = (1.0 + 0.4 * flash) * K;
    }
    // gate halo
    const g = MAX;
    hc[g * 3] = gateCenter.x;
    hc[g * 3 + 1] = gateCenter.y;
    hc[g * 3 + 2] = gateCenter.z;
    const coralMix = clamp01(gateFlash * 3);
    hcol[g * 4] = lerp(ZINC_200.x, CORAL.x, coralMix);
    hcol[g * 4 + 1] = lerp(ZINC_200.y, CORAL.y, coralMix);
    hcol[g * 4 + 2] = lerp(ZINC_200.z, CORAL.z, coralMix);
    hcol[g * 4 + 3] = Math.max(0.6 * gateFlash, waitGlow * 0.07);
    hs[g] = (1.6 + 0.5 * gateFlash) * K;
    cards.instanceMatrix.needsUpdate = true;
    stateAttr.needsUpdate = true;
    catAttr.needsUpdate = true;
    metaAttr.needsUpdate = true;
    haloCenter.needsUpdate = true;
    haloColor.needsUpdate = true;
    haloSize.needsUpdate = true;
  }

  function setGateUniforms(gateFlash: number, waitGlow: number) {
    ringU.uTint!.value = gateFlash;
    ringU.uHot!.value = CORAL;
    // Waiting: the ring warms toward ivory, never coral.
    const w = waitGlow * 0.6;
    const near = ringU.uNear!.value as Vector3;
    near.set(lerp(ZINC_500.x, ZINC_200.x, w), lerp(ZINC_500.y, ZINC_200.y, w), lerp(ZINC_500.z, ZINC_200.z, w));
    ringU.uAlpha!.value = 0.8 + 0.2 * waitGlow + 0.2 * gateFlash;
    ringU.uWidth!.value = 1.3 * dpr * (1 + 0.35 * gateFlash);
    mainU.uFlash!.value = gateFlash;
  }

  function updateCamera() {
    const el = elevation + pitch.x;
    const az = VIEW.azimuth + yaw.x;
    const D = fitD * lerp(1, VIEW.dolly, dolly.x);
    const ce = Math.cos(el);
    camera.position.set(Math.sin(az) * ce * D, Math.sin(el) * D, Math.cos(az) * ce * D);
    camera.lookAt(0, 0.05, 0);
    uRefDepth.value = D;
    uFogNear.value = D - 1.8;
    uFogFar.value = D + 2.4;
  }

  // Projects in place: tmp.x / tmp.y come back as CSS pixels in the host.
  const toPx = (v: Vector3) => {
    v.project(camera);
    v.set((v.x * 0.5 + 0.5) * cssW, (0.5 - v.y * 0.5) * cssH, v.z);
    return v;
  };

  /** Screen positions for the DOM layer: the gate and every queued card's box. */
  function project() {
    camera.updateMatrixWorld();
    toPx(tmp.copy(gateCenter));
    const gx = tmp.x;
    const gy = tmp.y;
    toPx(tmp.copy(gateEdge));
    gatePx.x = gx;
    gatePx.y = gy;
    gatePx.r = Math.max(40, Math.hypot(tmp.x - gx, tmp.y - gy) * 1.9);
    // The label sits just under the ring's lowest point on screen.
    let low = -Infinity;
    for (let i = 0; i < 64; i += 4) {
      toPx(tmp.set(ringPts[i * 3]!, ringPts[i * 3 + 1]!, ringPts[i * 3 + 2]!));
      if (tmp.y > low) low = tmp.y;
    }
    snap.width = cssW;
    snap.height = cssH;
    snap.gate.x = gx;
    snap.gate.y = gy;
    snap.gate.labelX = gx;
    snap.gate.labelY = low;
    snap.gate.sent = reduced ? stillSent : t - sentAt < SENT_SHOW;

    let n = 0;
    const hw = cardW / 2;
    const hh = cardH / 2;
    for (const c of pool) {
      if (!c.id || (c.mode !== QUEUED && c.mode !== ARC)) continue;
      computePose(c);
      const s = pose.s;
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (let k = 0; k < 4; k++) {
        const sx = (k & 1 ? 1 : -1) * hw * s;
        const sy = (k & 2 ? 1 : -1) * hh * s;
        tmp.set(pose.x + pose.tx * sx + pose.yx * sy, pose.y + pose.ty * sx + pose.yy * sy, pose.z + pose.tz * sx + pose.yz * sy);
        toPx(tmp);
        if (tmp.x < x0) x0 = tmp.x;
        if (tmp.x > x1) x1 = tmp.x;
        if (tmp.y < y0) y0 = tmp.y;
        if (tmp.y > y1) y1 = tmp.y;
      }
      const out = snap.cards[n++]!;
      out.id = c.id;
      out.x = x0;
      out.y = y0;
      out.w = x1 - x0;
      out.h = y1 - y0;
      out.alpha = pose.a;
    }
    snap.count = n;
    opts.onFrame(snap);
  }

  let frames = 0;
  let frameAccum = 0;
  let adapted = false;

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(Math.max((now - last) / 1000, 0), 0.05);
    last = now;
    t += dt;
    uTime.value = t;

    // Adaptive resolution: one step down if the first second runs slow.
    if (!adapted) {
      frames++;
      frameAccum += dt;
      if (frames === 60) {
        adapted = true;
        if (frameAccum / 60 > 1 / 40 && dpr > 1) {
          dpr = 1;
          resize();
        }
      }
    }

    springTo(tight, tightTarget, 6.5, dt);
    if (Math.abs(tight.x - builtTight) > 1e-4) rebuild(tight.x);
    springTo(dolly, dollyTarget, 3, dt);
    springTo(yaw, yawTarget, 3.2, dt);
    springTo(pitch, pitchTarget, 3.2, dt);

    stepCards(dt);
    updateLook(dt);
    // The ring breathes while the card at the gate is settled and waiting.
    let lead: Card | undefined;
    for (const c of pool) if (c.mode === QUEUED && c.rank === 0 && c.id) lead = c;
    const settled = lead && t >= lead.startAt && Math.abs((lead.target - lead.u) * perimeter) < 0.05;
    waiting = damp(waiting, settled ? 1 : 0, 3, dt);
    const breath = 0.5 + 0.5 * Math.sin((t * Math.PI * 2) / 3.6);
    const waitGlow = waiting * (0.35 + 0.65 * breath);
    const gateFlash = flashLevel(t, gateStart, gateFrom);
    const waveT = (t - waveStart) / 1.3;
    mainU.uWave!.value = waveT >= 0 && waveT < 1 ? waveT : -1;

    setGateUniforms(gateFlash, waitGlow);
    writeInstances(gateFlash, waitGlow);
    updateCamera();
    renderer.render(scene, camera);
    project();
  }

  function renderStill() {
    if (disposed || lost || cssW === 0) return;
    if (Math.abs(tight.x - builtTight) > 1e-4) rebuild(tight.x);
    uTime.value = reduced ? 0 : t;
    mainU.uWave!.value = -1;
    setGateUniforms(stillFlash, 0.5);
    writeInstances(stillFlash, 0.5);
    updateCamera();
    renderer.render(scene, camera);
    project();
  }

  function composeStill() {
    // Reduced motion: every card at its slot, frozen.
    settleAll();
    yaw.x = pitch.x = yaw.v = pitch.v = 0;
    tight.x = tightTarget;
    tight.v = 0;
    dolly.x = dollyTarget;
    dolly.v = 0;
  }

  function shouldRun() {
    return !disposed && !lost && !reduced && visible && !document.hidden && cssW > 0;
  }
  function sync() {
    if (shouldRun()) {
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    } else if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  function resize() {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (w === 0 || h === 0) {
      cssW = cssH = 0;
      sync();
      return;
    }
    cssW = w;
    cssH = h;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    res.value = [Math.round(w * dpr), Math.round(h * dpr)];
    mainU.uWidth!.value = 1.1 * dpr;
    mainU.uGlow!.value = 4 * dpr;
    ringU.uGlow!.value = 5 * dpr;
    for (const m of echoMats) m.uniforms.uWidth!.value = 0.8 * dpr;
    dustMat.uniforms.uSize!.value = 1.7 * dpr;
    // Fit the loosest shape so tightening reads as the loop drawing in.
    const saved = builtTight;
    rebuild(0);
    elevation = elevationFor(w / h);
    const basis = viewBasis(elevation, VIEW.azimuth);
    fitD = fitDistance(pts, SAMPLES, basis, w / h, (VIEW.fovDeg * Math.PI) / 180);
    rebuild(saved < 0 ? tight.x : saved);
    if (reduced || !raf) renderStill();
    sync();
  }

  // ---------- events ----------
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const onPointerMove = (e: PointerEvent) => {
    if (reduced || !finePointer.matches) return;
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = (e.clientY / window.innerHeight) * 2 - 1;
    yawTarget = nx * 0.042; // ~2.4deg
    pitchTarget = -ny * 0.03;
  };
  const inGate = (e: MouseEvent) => {
    const r = canvas.getBoundingClientRect();
    return Math.hypot(e.clientX - r.left - gatePx.x, e.clientY - r.top - gatePx.y) <= gatePx.r;
  };
  const onCanvasMove = (e: PointerEvent) => {
    canvas.style.cursor = interactive && inGate(e) ? "pointer" : "";
  };
  const onCanvasLeave = () => {
    canvas.style.cursor = "";
  };
  const onClick = (e: MouseEvent) => {
    if (interactive && inGate(e)) opts.onGateClick();
  };
  const onVisibility = () => sync();
  const onLost = (e: Event) => {
    e.preventDefault();
    lost = true;
    sync();
    opts.onLost();
  };
  const onRestored = () => {
    lost = false;
    builtTight = -1;
    resize();
    if (reduced) renderStill();
    sync();
    opts.onReady();
  };

  window.addEventListener("pointermove", onPointerMove, { passive: true });
  canvas.addEventListener("pointermove", onCanvasMove, { passive: true });
  canvas.addEventListener("pointerleave", onCanvasLeave, { passive: true });
  canvas.addEventListener("click", onClick);
  document.addEventListener("visibilitychange", onVisibility);
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);
  const ro = new ResizeObserver(() => resize());
  ro.observe(host);

  // ---------- boot ----------
  rebuild(0);
  // The opening composition: every task already on its slot, as the SVG
  // still drew it, so the cross-fade lines up.
  applyItems(items, true);
  if (reduced) composeStill();
  resize();
  if (!reduced && cssW > 0) {
    // Draw the opening frame immediately so the cross-fade has content.
    writeInstances(0, 0);
    setGateUniforms(0, 0);
    updateCamera();
    renderer.render(scene, camera);
    project();
  }
  requestAnimationFrame(() => {
    if (!disposed && !lost) opts.onReady();
  });

  return {
    setItems(next) {
      if (disposed) return;
      applyItems(next, false);
    },
    setHighlight(id) {
      // Eased in by the frame loop. A still frame (reduced motion) shows no
      // lift or glow: the DOM layer's focus ring and popup carry it there.
      highlightId = id;
    },
    setProgress(p) {
      dollyTarget = clamp01(p);
      if (reduced) {
        dolly.x = dollyTarget;
        renderStill();
      }
    },
    setVisible(v) {
      visible = v;
      sync();
    },
    setReducedMotion(r) {
      if (r === reduced) return;
      reduced = r;
      if (r) {
        composeStill();
        renderStill();
      }
      sync();
    },
    setInteractive(i) {
      interactive = i;
      if (!i) canvas.style.cursor = "";
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      window.clearTimeout(stillTimer);
      window.clearTimeout(sentTimer);
      ro.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointermove", onCanvasMove);
      canvas.removeEventListener("pointerleave", onCanvasLeave);
      canvas.removeEventListener("click", onClick);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      for (const g of [loop.geometry, ring.geometry, cardGeo, haloGeo, quad, dustGeo]) g.dispose();
      for (const m of [mainMat, ...echoMats, ringMat, cardMat, haloMat, dustMat]) m.dispose();
      cards.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
