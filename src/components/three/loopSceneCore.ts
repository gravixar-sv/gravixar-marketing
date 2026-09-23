// The three.js half of <LoopScene>. Only ever reached through a dynamic
// import after load + idle, so `three` stays out of the initial bundle.
//
// Draw calls: dust, cards, 2 echo loops, main loop, gate ring, halos = 7.

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
  QUEUE_START,
  SPACING_WORLD,
  SPEED_WORLD,
  STOP_WORLD,
  VIEW,
  clamp01,
  controlPoints,
  elevationFor,
  fitDistance,
  hash01,
  initialLayout,
  lerp,
  planeNormal,
  sampleLoop,
  viewBasis,
} from "./loopShape";

export interface LoopSceneOptions {
  reducedMotion: boolean;
  mobile: boolean;
  /** 0..1, camera dolly only. */
  progress: number;
  visible: boolean;
  interactive: boolean;
  onReady: () => void;
  onLost: () => void;
  /** Canvas click inside the gate hit area. */
  onRequestApprove: () => void;
  onQueueChange: (held: number) => void;
}

export interface LoopSceneController {
  /** Releases the lead held card. Returns false when nothing was waiting (gate still flashes). */
  approve(): boolean;
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
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const damp = (a: number, b: number, lambda: number, dt: number) => a + (b - a) * (1 - Math.exp(-lambda * dt));

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
attribute vec3 aState;
varying vec2 vUv;
varying vec3 vState;
varying float vLight;
varying float vFog;
void main() {
  vUv = uv;
  vState = aState;
  vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  vec3 n = normalize(mat3(modelViewMatrix) * mat3(instanceMatrix) * vec3(0.0, 0.0, 1.0));
  vec3 L = normalize(vec3(-0.35, 0.8, 0.5));
  vLight = 0.55 + 0.45 * abs(dot(n, L));
  vFog = fogAt(-mv.z);
  gl_Position = projectionMatrix * mv;
}`;

const CARD_FRAG = /* glsl */ `
${VIGNETTE}
uniform vec2 uSize;
uniform vec3 uFill;
uniform vec3 uEdge;
uniform vec3 uInk;
uniform vec3 uCoral;
uniform vec3 uCoralSoft;
varying vec2 vUv;
varying vec3 vState;
varying float vLight;
varying float vFog;

float sdRound(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
float bar(vec2 p, vec2 c, float len, float th, float aa) {
  vec2 q = p - vec2(c.x + len * 0.5, c.y);
  return 1.0 - smoothstep(-aa, aa, sdRound(q, vec2(len * 0.5, th * 0.5), th * 0.5));
}

void main() {
  vec2 uv = vUv;
  if (!gl_FrontFacing) uv.x = 1.0 - uv.x;
  vec2 p = (uv - 0.5) * uSize;
  float d = sdRound(p, uSize * 0.5, uSize.y * 0.14);
  float aa = max(fwidth(d), 1e-5);
  float inside = 1.0 - smoothstep(-aa, aa, d);
  if (inside < 0.01) discard;
  float edge = 1.0 - smoothstep(0.0, aa * 1.6, abs(d + aa * 0.8));

  float warm = vState.x;
  float flash = vState.y;
  float seed = vState.z;
  float th = uSize.y * 0.07;
  float x0 = -uSize.x * 0.5 + uSize.x * 0.13;
  float ink = bar(p, vec2(x0, uSize.y * 0.2), uSize.x * (0.34 + 0.12 * seed), th * 1.25, aa) * 0.9;
  ink += bar(p, vec2(x0, -uSize.y * 0.04), uSize.x * (0.58 + 0.14 * fract(seed * 7.0)), th, aa) * 0.55;
  ink += bar(p, vec2(x0, -uSize.y * 0.24), uSize.x * (0.4 + 0.2 * fract(seed * 13.0)), th, aa) * 0.55;
  vec2 dotC = vec2(uSize.x * 0.5 - uSize.x * 0.14, uSize.y * 0.2);
  float stamp = 1.0 - smoothstep(-aa, aa, length(p - dotC) - uSize.y * 0.065);

  float lit = max(warm, flash);
  vec3 fill = uFill * vLight + uCoral * (0.05 * warm + 0.16 * flash);
  vec3 inkCol = mix(uInk, uCoralSoft * 0.8, warm * 0.55);
  vec3 edgeCol = mix(uEdge * (0.75 + 0.35 * vLight), uCoralSoft, clamp(warm * 0.9 + flash, 0.0, 1.0));
  edgeCol += uCoralSoft * flash * 0.25;
  vec3 col = mix(fill, inkCol, clamp(ink, 0.0, 1.0) * 0.6);
  col = mix(col, mix(uInk * 0.7, uCoral, lit), stamp);
  col = mix(col, edgeCol, edge);
  col *= mix(0.42, 1.0, vFog);
  float alpha = inside * mix(0.4, 1.0, vFog) * vignette();
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

  const n = opts.mobile ? 10 : 16;
  // Phones get fewer, larger drafts so each one still reads as a document.
  const K = opts.mobile ? 1.4 : 1;
  const cardW = CARD.w * K;
  const cardH = CARD.h * K;
  const lift = cardH / 2 + CARD.lift;
  const spacing = SPACING_WORLD * K;
  const stop = STOP_WORLD * K;
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
  const cardState = new InstancedBufferAttribute(new Float32Array(n * 3), 3).setUsage(DynamicDrawUsage);
  cardGeo.setAttribute("aState", cardState);
  const cardMat = new ShaderMaterial({
    uniforms: {
      uRes: res,
      uFogNear,
      uFogFar,
      uSize: { value: [cardW, cardH] },
      uFill: { value: CARD_FILL },
      uEdge: { value: ZINC_400 },
      uInk: { value: ZINC_600 },
      uCoral: { value: CORAL },
      uCoralSoft: { value: CORAL_SOFT },
    },
    vertexShader: CARD_VERT,
    fragmentShader: CARD_FRAG,
    transparent: true,
    depthWrite: true,
    side: DoubleSide,
  });
  const cards = new InstancedMesh(cardGeo, cardMat, n);
  cards.instanceMatrix.setUsage(DynamicDrawUsage);
  cards.renderOrder = 1;

  // ---------- halos (cards + gate), one instanced draw ----------
  const haloCount = n + 1;
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

  // ---------- simulation state ----------
  const U = new Float64Array(n);
  const prevU = new Float64Array(n);
  const vel = new Float64Array(n);
  const gateLap = new Int32Array(n);
  const approvedLap = new Int32Array(n).fill(-99);
  const approvedAt = new Float64Array(n).fill(-1e9);
  const approvedAtU = new Float64Array(n).fill(-1e9);
  const flashStart = new Float64Array(n).fill(-1e9);
  const warm = new Float64Array(n);
  // Sticky "waiting" flag: set when a draft settles into the queue, cleared
  // only by approval, so the count never flickers as the queue shuffles up.
  const queued = new Uint8Array(n);
  const freeMul = new Float64Array(n);
  for (let i = 0; i < n; i++) freeMul[i] = 0.9 + 0.2 * hash01(i + 11);

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
  let heldReported = -1;
  let gateStart = -1e9;
  let gateFrom = 0;
  let waveStart = -1e9;
  let waiting = 0;
  let stillFlash = 0;
  let stillTimer = 0;
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
  let gatePx = { x: -1e4, y: -1e4, r: 0 };

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
    const cx = f.px + f.yx * lift;
    const cy = f.py + f.yy * lift;
    const cz = f.pz + f.yz * lift;
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

  function layoutOpening() {
    initialLayout(n, perimeter / K, U);
    for (let i = 0; i < n; i++) {
      gateLap[i] = 1;
      approvedLap[i] = -99;
      vel[i] = 0;
      warm[i] = 0;
      flashStart[i] = -1e9;
      approvedAt[i] = -1e9;
      approvedAtU[i] = -1e9;
      queued[i] = 0;
    }
    for (let k = 0; k < Math.min(QUEUE_START, n - 1); k++) queued[n - 1 - k] = 1;
    // Card 0 has just been approved: coral, freshly through the gate.
    approvedAtU[0] = U[0]! - 0.03;
    warm[0] = 1;
    // Cards in flight start at cruising speed; the queue starts at rest.
    const base = SPEED_WORLD / perimeter;
    for (let i = 0; i < n - QUEUE_START; i++) vel[i] = base * freeMul[i]!;
  }

  // ---------- per-frame ----------
  function stepCards(dt: number) {
    const spU = spacing / perimeter;
    const stopU = stop / perimeter;
    const base = SPEED_WORLD / perimeter;
    const zone = n * spU * 1.4;
    prevU.set(U);
    for (let i = 0; i < n; i++) {
      // Car-following against last frame's leader: leaders only move forward,
      // so the gap can only grow and cards can never overlap.
      const leader = i === n - 1 ? prevU[0]! + 1 : prevU[i + 1]!;
      let limit = leader - spU;
      const gate = GATE_U + gateLap[i]!;
      const cleared = approvedLap[i] === gateLap[i];
      if (!cleared) limit = Math.min(limit, gate - stopU);
      const sinceApproval = t - approvedAt[i]!;
      const boost = 1 + 1.6 * Math.exp(-sinceApproval / 0.8);
      const free = base * freeMul[i]! * boost;
      const desired = Math.min(free, Math.max(0, (limit - U[i]!) * 2.2));
      const v = damp(vel[i]!, desired, desired < vel[i]! ? 9 : sinceApproval < 1.5 ? 7 : 4, dt);
      vel[i] = v;
      let next = U[i]! + v * dt;
      if (next > limit) next = Math.max(U[i]!, limit);
      U[i] = next;
      if (next >= gate) {
        gateLap[i] = gateLap[i]! + 1;
        if (cleared) {
          // Stamped as it passes through the ring.
          flashStart[i] = t;
          approvedAtU[i] = gate;
          warm[i] = 1;
        }
      }
      if (!cleared && !queued[i] && v < base * 0.3 && gate - stopU - next < zone) queued[i] = 1;

      const age = next - approvedAtU[i]!;
      let target = age < 0.45 ? 1 : 1 - smoothstep(0.45, 0.82, age);
      if (age > 0.1 && v < base * 0.25) target = 0;
      if (target < warm[i]!) warm[i] = damp(warm[i]!, target, 1.4, dt);
    }
  }

  /** Next unapproved draft in line for the gate, its distance to the stop, and the waiting count. */
  function queueInfo(): { lead: number; dist: number; held: number } {
    const stopU = stop / perimeter;
    let lead = -1;
    let dist = Infinity;
    let held = 0;
    for (let i = 0; i < n; i++) {
      held += queued[i]!;
      if (approvedLap[i] === gateLap[i]) continue;
      const d = GATE_U + gateLap[i]! - stopU - U[i]!;
      if (d < dist) {
        dist = d;
        lead = i;
      }
    }
    return { lead, dist, held };
  }

  function writeInstances(gateFlash: number, waitGlow: number) {
    const m = cards.instanceMatrix.array as Float32Array;
    const st = cardState.array as Float32Array;
    const hc = haloCenter.array as Float32Array;
    const hcol = haloColor.array as Float32Array;
    const hs = haloSize.array as Float32Array;
    for (let i = 0; i < n; i++) {
      const f = frameAt(U[i]!);
      const flash = reduced ? (i === 0 ? 0.55 : 0) : flashLevel(t, flashStart[i]!, 0);
      const s = 1 + 0.05 * flash;
      const cx = f.px + f.yx * lift;
      const cy = f.py + f.yy * lift;
      const cz = f.pz + f.yz * lift;
      const o = i * 16;
      m[o] = f.tx * s;
      m[o + 1] = f.ty * s;
      m[o + 2] = f.tz * s;
      m[o + 3] = 0;
      m[o + 4] = f.yx * s;
      m[o + 5] = f.yy * s;
      m[o + 6] = f.yz * s;
      m[o + 7] = 0;
      m[o + 8] = f.zx;
      m[o + 9] = f.zy;
      m[o + 10] = f.zz;
      m[o + 11] = 0;
      m[o + 12] = cx;
      m[o + 13] = cy;
      m[o + 14] = cz;
      m[o + 15] = 1;
      st[i * 3] = warm[i]!;
      st[i * 3 + 1] = flash;
      st[i * 3 + 2] = hash01(i + 5);
      hc[i * 3] = cx;
      hc[i * 3 + 1] = cy;
      hc[i * 3 + 2] = cz;
      hcol[i * 4] = CORAL.x;
      hcol[i * 4 + 1] = CORAL.y;
      hcol[i * 4 + 2] = CORAL.z;
      hcol[i * 4 + 3] = 0.55 * flash + 0.1 * warm[i]!;
      hs[i] = (1.0 + 0.4 * flash) * K;
    }
    // gate halo
    const g = n;
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
    cardState.needsUpdate = true;
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

  function projectGate() {
    camera.updateMatrixWorld();
    tmp.copy(gateCenter).project(camera);
    const x = (tmp.x * 0.5 + 0.5) * cssW;
    const y = (0.5 - tmp.y * 0.5) * cssH;
    tmp.copy(gateEdge).project(camera);
    const ex = (tmp.x * 0.5 + 0.5) * cssW;
    const ey = (0.5 - tmp.y * 0.5) * cssH;
    gatePx = { x, y, r: Math.max(40, Math.hypot(ex - x, ey - y) * 1.9) };
  }

  function reportQueue(held: number) {
    if (held !== heldReported) {
      heldReported = held;
      opts.onQueueChange(held);
    }
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
    const q = queueInfo();
    reportQueue(q.held);
    waiting = damp(waiting, q.lead >= 0 && q.dist < (spacing / perimeter) * 0.35 ? 1 : 0, 3, dt);
    const breath = 0.5 + 0.5 * Math.sin((t * Math.PI * 2) / 3.6);
    const waitGlow = waiting * (0.35 + 0.65 * breath);
    const gateFlash = flashLevel(t, gateStart, gateFrom);
    const waveT = (t - waveStart) / 1.3;
    mainU.uWave!.value = waveT >= 0 && waveT < 1 ? waveT : -1;

    setGateUniforms(gateFlash, waitGlow);
    writeInstances(gateFlash, waitGlow);
    updateCamera();
    renderer.render(scene, camera);
    if (interactive) projectGate();
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
    if (interactive) projectGate();
  }

  function composeStill() {
    // Reduced motion: the opening composition, frozen. Three held, one coral past.
    layoutOpening();
    warm[0] = 1;
    for (let i = 0; i < n; i++) vel[i] = 0;
    yaw.x = pitch.x = yaw.v = pitch.v = 0;
    tight.x = tightTarget;
    tight.v = 0;
    dolly.x = dollyTarget;
    dolly.v = 0;
    reportQueue(Math.min(QUEUE_START, n - 1));
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
    if (interactive && inGate(e)) opts.onRequestApprove();
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
  layoutOpening();
  if (reduced) composeStill();
  resize();
  if (!reduced) {
    // Draw the opening frame immediately so the cross-fade has content.
    writeInstances(0, 0);
    setGateUniforms(0, 0);
    updateCamera();
    if (cssW > 0) renderer.render(scene, camera);
  }
  if (interactive) projectGate();
  reportQueue(queueInfo().held);
  requestAnimationFrame(() => {
    if (!disposed && !lost) opts.onReady();
  });

  function approve(): boolean {
    if (disposed) return false;
    if (reduced) {
      // No motion: the gate lights instantly and the rule steps tighter.
      tightTarget = Math.min(1, tightTarget + TIGHTEN_STEP);
      tight.x = tightTarget;
      stillFlash = 1;
      renderStill();
      window.clearTimeout(stillTimer);
      stillTimer = window.setTimeout(() => {
        stillFlash = 0;
        renderStill();
      }, 900);
      return true;
    }
    const q = queueInfo();
    const spU = spacing / perimeter;
    gateFrom = flashLevel(t, gateStart, gateFrom);
    gateStart = t;
    // The next draft in line: already waiting, or arriving at the gate.
    if (q.lead < 0 || (!queued[q.lead] && q.dist > spU * 0.6)) return false;
    const i = q.lead;
    approvedLap[i] = gateLap[i]!;
    approvedAt[i] = t;
    queued[i] = 0;
    tightTarget = Math.min(1, tightTarget + TIGHTEN_STEP);
    waveStart = t;
    return true;
  }

  return {
    approve,
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
      } else {
        layoutOpening();
      }
      sync();
    },
    setInteractive(i) {
      interactive = i;
      if (!i) canvas.style.cursor = "";
      else projectGate();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      window.clearTimeout(stillTimer);
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
