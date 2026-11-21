import { PixelFB, clamp, frac, hash, lerp, onStep, seg, st } from "./PixelFB";

export type CharView = "front" | "q" | "side" | "back";
export type CharPosture = "stand" | "sit" | "crouch";
export type ExprName =
  | "neutral"
  | "sad"
  | "cry"
  | "melancholy"
  | "bitter_smile"
  | "surprised"
  | "thinking"
  | "closed"
  | "happy"
  | "love";

export const ARM = {
  down: -1.3,
  low: -0.7,
  out: 0,
  reach: 0.35,
  up: 1.2,
  high: 1.45,
};

export interface CharRamps {
  skin: string[];
  boyHair: string[];
  boyCoat: string[];
  boyScarf: string[];
  boyPants: string[];
  boyShoe: string[];
  girlHair: string[];
  girlCoat: string[];
  girlSkirt: string[];
  girlBoot: string[];
  tee: string[];
  eye: string;
  white: string;
  blush: string;
  tear: string;
  mouth: string;
  inside: string;
}

export const CHAR_COLORS: CharRamps = {
  skin: ["#5c2c34", "#a85a4e", "#e49d7e", "#f7ccb0", "#ffe8d6"],
  boyHair: ["#0f1224", "#1b2242", "#2b3766", "#42538f"],
  boyCoat: ["#141a2e", "#1f2a4a", "#2e3f6e", "#465d99"],
  boyScarf: ["#283b5c", "#425f8f", "#6488bd", "#92b7e8"],
  boyPants: ["#0e1220", "#192038", "#273154"],
  boyShoe: ["#1a141c", "#332a38", "#574b61"],
  girlHair: ["#2b161a", "#4d2b2b", "#754640", "#9e665a"],
  girlCoat: ["#663c1e", "#9c6234", "#cc8c54", "#edb57e"],
  girlSkirt: ["#1c172b", "#302847", "#483e66"],
  girlBoot: ["#2b1618", "#4d292a", "#754240"],
  tee: ["#948c8a", "#c9bfb8", "#ede5dc", "#fffaf5"],
  eye: "#1a1429",
  white: "#fffaf2",
  blush: "#eb7882",
  tear: "#7ad4ff",
  mouth: "#542230",
  inside: "#9c2d3d",
};

let rampsRegistered = false;
export function ensureCastRamps(fb: PixelFB): void {
  if (rampsRegistered) return;
  fb.regRamp(CHAR_COLORS.skin);
  fb.regRamp(CHAR_COLORS.boyHair);
  fb.regRamp(CHAR_COLORS.boyCoat);
  fb.regRamp(CHAR_COLORS.boyScarf);
  fb.regRamp(CHAR_COLORS.boyPants);
  fb.regRamp(CHAR_COLORS.boyShoe);
  fb.regRamp(CHAR_COLORS.girlHair);
  fb.regRamp(CHAR_COLORS.girlCoat);
  fb.regRamp(CHAR_COLORS.girlSkirt);
  fb.regRamp(CHAR_COLORS.girlBoot);
  fb.regRamp(CHAR_COLORS.tee);
  fb.regRamp([CHAR_COLORS.eye, "#362c52"]);
  fb.regRamp([CHAR_COLORS.mouth, "#823446"]);
  rampsRegistered = true;
}

interface ExprSpec {
  eyes: string;
  mouth: string;
  brows?: "sad" | "angry" | "up";
  blush?: number;
  tears?: number;
  idle?: string;
  emote?: string;
}

const EXPRS: Record<ExprName, ExprSpec> = {
  neutral: { eyes: "open", mouth: "flat" },
  sad: { eyes: "sad", mouth: "frown", brows: "sad", idle: "droop" },
  melancholy: { eyes: "half", mouth: "flat", brows: "sad", idle: "breathe" },
  cry: { eyes: "squeeze", mouth: "wail", brows: "sad", tears: 1, idle: "sob" },
  bitter_smile: { eyes: "sad", mouth: "smile", brows: "sad", idle: "breathe" },
  surprised: { eyes: "wide", mouth: "o", brows: "up", idle: "still", emote: "!" },
  thinking: { eyes: "half", mouth: "side", brows: "sad", idle: "breathe" },
  closed: { eyes: "closed", mouth: "flat", idle: "breathe" },
  happy: { eyes: "happy", mouth: "smile", blush: 1, idle: "breathe" },
  love: { eyes: "shine", mouth: "smile", blush: 2, idle: "sway" },
};

const MOUTHS: Record<string, string[]> = {
  flat: ["kkk"],
  smile: ["k...k", ".kkk."],
  frown: [".kkk.", "k...k"],
  o: [".k.", "k.k", ".k."],
  wail: [".kkk.", "krrrk", "kkkkk"],
  side: ["..kk", ".k.."],
};

export interface ActKey {
  t: number;
  face: ExprName;
  look?: [number, number];
  emote?: string | null;
  take?: number;
}

export interface ActedFace {
  face: ExprName;
  sq: number;
  dy: number;
  blinkNow?: boolean;
  look?: [number, number];
  emote?: string;
  emoteAge?: number;
}

export function act(t: number, keys: ActKey[], emoteFrom = 0): ActedFace {
  let i = 0;
  while (i + 1 < keys.length && t >= keys[i + 1].t) i++;
  const cur = keys[i];
  const s = st(t);
  const out: ActedFace = { face: cur.face, sq: 0, dy: 0 };
  const nx = keys[i + 1];
  if (nx && s > nx.t - 0.1) {
    out.sq += 0.08;
    out.blinkNow = true;
  }
  const a = s - cur.t;
  const amt = (cur.take ?? 0.6) * (i > 0 || cur.t > 0 ? 1 : 0);
  if (a >= 0 && amt) {
    out.sq += -0.1 * amt * Math.exp(-7 * a) * Math.cos(16 * a);
    out.dy += -Math.round(2 * amt * Math.exp(-8 * a) * Math.max(0, Math.cos(9 * a)));
  }
  const em = cur.emote === undefined ? EXPRS[cur.face].emote : cur.emote;
  if (em && a < 1.3 && i >= emoteFrom) {
    out.emote = em;
    out.emoteAge = a;
  }
  if (cur.look) out.look = cur.look;
  return out;
}

export function walkTo(
  t: number,
  t0: number,
  t1: number,
  x0: number,
  x1: number,
  stride = 22,
  e: (x: number) => number = (x) => x
): { x: number; walk: number | null; moving: boolean; dir: number } {
  const k = e(seg(t, t0, t1));
  const x = lerp(x0, x1, k);
  const moving = t > t0 && t < t1;
  return {
    x,
    walk: moving ? Math.abs(x - x0) / stride : null,
    moving,
    dir: Math.sign(x1 - x0),
  };
}

function idleMotion(kind: string | undefined, t: number, seed: number): { dx?: number; dy?: number; sq?: number } {
  const s = st(t);
  switch (kind) {
    case "droop":
      return { dy: Math.sin(s * 1.5 + seed) > 0.25 ? 1 : 0, sq: 0.025 };
    case "sob":
      return { dy: Math.floor(s * 5) % 2, sq: Math.floor(s * 5) % 2 ? 0.045 : 0 };
    case "sway":
      return { dx: Math.round(Math.sin(s * 2.0 + seed)) };
    case "breathe":
      return { sq: Math.sin(s * 1.8 + seed) * 0.025 };
    default:
      return {};
  }
}

function isBlinking(t: number, seed = 0): boolean {
  const per = 2.8 + hash(seed * 7.1 + 1) * 1.6;
  const a = (st(t) + hash(seed) * per) % per;
  return a < 0.12;
}

interface Rig {
  fl: number;
  sx: number;
  sy: number;
  X0: number;
  Y0: number;
  L: (lx: number, ly: number) => [number, number];
  Lp: (pts: [number, number][]) => [number, number][];
}

function makeRig(x: number, y: number, o: { flip?: boolean; sq?: number; dx?: number; dy?: number }): Rig {
  const fl = o.flip ? -1 : 1;
  const sq = o.sq || 0;
  const sx = 1 + (sq > 0 ? sq * 0.65 : sq * 0.42);
  const sy = 1 - sq;
  const X0 = Math.round(x + (o.dx || 0));
  const Y0 = Math.round(y + (o.dy || 0));
  const L = (lx: number, ly: number): [number, number] => [X0 + fl * lx * sx, Y0 + ly * sy];
  const Lp = (pts: [number, number][]) => pts.map(([a, b]) => L(a, b));
  return { fl, sx, sy, X0, Y0, L, Lp };
}

function drawEye(
  fb: PixelFB,
  R: Rig,
  kind: string,
  lx: number,
  ly: number,
  ew: number,
  eh: number,
  side: number,
  look: [number, number]
): void {
  const [oxRaw, oyRaw] = R.L(lx, ly);
  const ox = Math.round(oxRaw);
  const oy = Math.round(oyRaw);
  const E = CHAR_COLORS.eye;
  const Wc = CHAR_COLORS.white;
  const fp = (i: number, j: number, c: string) => fb.px(ox + R.fl * i, oy + j, c);
  const inner = side < 0 ? ew - 1 : 0;
  const outer = side < 0 ? 0 : ew - 1;
  const lkx = Math.round(clamp(look[0], -1, 1));
  const lky = Math.round(clamp(look[1], -1, 1));

  switch (kind) {
    case "open":
    case "shine":
    case "sad":
    case "half": {
      for (let j = 0; j < eh; j++) {
        for (let i = 0; i < ew; i++) {
          if (kind === "sad" && j === 0 && i === outer) continue;
          if (kind === "half" && j === 0) continue;
          fp(i + lkx, j + lky, E);
        }
      }
      if (kind === "half") {
        for (let i = -1; i <= ew; i++) fp(i + lkx, 1 + lky, E);
        fp(lkx, 2 + lky, Wc);
      } else {
        fp(lkx, lky + (kind === "sad" ? 1 : 0), Wc);
        if (kind === "shine") fp(lkx + ew - 1, lky + eh - 1, Wc);
      }
      break;
    }
    case "wide": {
      for (let j = -1; j <= eh; j++) {
        for (let i = -1; i <= ew; i++) {
          const edge = j === -1 || j === eh || i === -1 || i === ew;
          if (edge && (i === -1 || i === ew) && (j === -1 || j === eh)) continue;
          fp(i, j, edge ? E : Wc);
        }
      }
      const cx = Math.floor((ew - 1) / 2) + lkx;
      const cy = Math.floor((eh - 1) / 2) + lky;
      fp(clamp(cx, 0, ew - 1), clamp(cy, 0, eh - 1), E);
      fp(clamp(cx, 0, ew - 1), clamp(cy + 1, 0, eh - 1), E);
      break;
    }
    case "happy": {
      for (let i = 0; i < ew; i++) fp(i, 1, E);
      fp(-1, 2, E);
      fp(ew, 2, E);
      break;
    }
    case "closed": {
      for (let i = -1; i <= ew; i++) fp(i, 2, E);
      fp(side < 0 ? -1 : ew, 1, E);
      break;
    }
    case "squeeze": {
      const pts: [number, number][] =
        side < 0 ? [[0, 0], [1, 1], [2, 2], [1, 3], [0, 4]] : [[2, 0], [1, 1], [0, 2], [1, 3], [2, 4]];
      for (const [i, j] of pts) fp(i - (side > 0 ? 1 : 0), j - 1, E);
      break;
    }
    default: {
      for (let j = 0; j < eh; j++) for (let i = 0; i < ew; i++) fp(i, j, E);
    }
  }
}

function drawFace(
  fb: PixelFB,
  R: Rig,
  f: { eyes: ([number, number] | null)[]; ew: number; eh: number; mouth: [number, number]; blush: [number, number][]; browCol: string },
  ex: ExprSpec,
  o: { blink?: boolean; blinkNow?: boolean; look?: [number, number]; seed?: number; tears?: boolean },
  t: number
): void {
  const blink = o.blinkNow || (o.blink !== false && isBlinking(t, o.seed || 0));
  const look: [number, number] = o.look || [0, 0];

  if (ex.blush) {
    for (const [bx, by] of f.blush) {
      const [ox, oy] = R.L(bx, by).map(Math.round);
      fb.px(ox, oy, CHAR_COLORS.blush);
      fb.px(ox + R.fl, oy, CHAR_COLORS.blush);
    }
  }

  f.eyes.forEach((e, idx) => {
    if (!e) return;
    const side = idx === 0 ? -1 : 1;
    let k = ex.eyes;
    if (blink && ["open", "shine", "sad", "half", "wide"].includes(k)) k = "closed";
    drawEye(fb, R, k, e[0], e[1], f.ew, f.eh, side, look);

    // Brows
    if (ex.brows) {
      const [ox, oy] = R.L(e[0], e[1]).map(Math.round);
      const fp = (i: number, j: number, c: string) => fb.px(ox + R.fl * i, oy + j, c);
      if (ex.brows === "sad") {
        const inner = side < 0 ? f.ew - 1 : 0;
        const outer = side < 0 ? 0 : f.ew - 1;
        fp(inner, -2, f.browCol);
        fp(outer, -1, f.browCol);
      } else if (ex.brows === "up") {
        for (let i = 0; i < f.ew; i++) fp(i, -3, f.browCol);
      }
    }

    // Animated streaming tears
    if (ex.tears || o.tears) {
      const [ox, oy] = R.L(e[0], e[1]).map(Math.round);
      const fp = (i: number, j: number, c: string) => fb.px(ox + R.fl * i, oy + j, c);
      const s = st(t);
      const tx = side < 0 ? 0 : f.ew - 1;
      const dropPhase = Math.floor(s * 10 + (idx === 0 ? 0 : 2)) % 5;
      fp(tx, 3, CHAR_COLORS.tear);
      fp(tx, 4, CHAR_COLORS.tear);
      if (dropPhase >= 1) fp(tx, 5 + (dropPhase % 2), CHAR_COLORS.tear);
      if (dropPhase >= 3) fp(tx + side, 6 + (dropPhase - 2), CHAR_COLORS.tear);
    }
  });

  const mg = MOUTHS[ex.mouth];
  if (mg) {
    const [ox, oy] = R.L(f.mouth[0], f.mouth[1]).map(Math.round);
    const w = mg[0].length;
    const x0 = -Math.floor(w / 2);
    const cm: Record<string, string> = { k: CHAR_COLORS.mouth, r: CHAR_COLORS.inside };
    mg.forEach((row, j) => {
      for (let i = 0; i < w; i++) {
        if (cm[row[i]]) fb.px(ox + R.fl * (x0 + i), oy + j, cm[row[i]]);
      }
    });
  }
}

function drawArm(
  fb: PixelFB,
  R: Rig,
  sh: [number, number],
  a: number,
  len1: number,
  len2: number,
  bend: number,
  w: number,
  col: string,
  handCol: string,
  holdFn: ((hx: number, hy: number, ang: number) => void) | null | undefined,
  outward: number
): [number, number] {
  const [sx, sy] = R.L(sh[0], sh[1]);
  const d = outward * R.fl;
  const ex = sx + Math.cos(a) * len1 * d * R.sx;
  const ey = sy - Math.sin(a) * len1 * R.sy;
  const a2 = a + bend;
  const hx = ex + Math.cos(a2) * len2 * d * R.sx;
  const hy = ey - Math.sin(a2) * len2 * R.sy;
  fb.line(sx, sy, ex, ey, col, w);
  if (len2) fb.line(ex, ey, hx, hy, col, w);
  const ang = Math.atan2(hy - ey, hx - ex || Math.cos(a) * d);
  if (holdFn) {
    fb.part();
    holdFn(hx, hy, ang);
    fb.part();
  }
  fb.disc(hx, hy, 1, handCol);
  return [Math.round(hx), Math.round(hy)];
}

export interface CharacterOpts {
  t?: number;
  face?: ExprName;
  view?: CharView;
  posture?: CharPosture;
  flip?: boolean;
  look?: [number, number];
  sq?: number;
  dx?: number;
  dy?: number;
  arm?: [number, number];
  bend?: [number, number];
  hold?: [((hx: number, hy: number, ang: number) => void) | null, ((hx: number, hy: number, ang: number) => void) | null];
  walk?: number | null;
  drag?: number;
  wind?: number;
  tears?: boolean;
  emote?: string;
  emoteAge?: number;
  emoteSide?: number;
  tint?: [string, number] | null;
  z?: number;
  seed?: number;
  blink?: boolean;
  blinkNow?: boolean;
  scarf?: boolean;
  headBow?: number; // 0..2 px bowed head
}

export interface CharacterInfo {
  head: [number, number];
  top: [number, number];
  hands: [number, number][];
  face: [number, number];
}

// =========================================================================
// LIN MO (Boy Lead, ~66px logical height)
// =========================================================================
export function drawBoy(fb: PixelFB, x: number, y: number, o: CharacterOpts = {}): CharacterInfo {
  ensureCastRamps(fb);
  const t = o.t ?? fb.T;
  const faceName = o.face || "neutral";
  const ex = EXPRS[faceName] || EXPRS.neutral;
  const id = idleMotion(ex.idle, t, o.seed || 0);
  const view = o.view || "front";
  const posture = o.posture || "stand";

  let g: { fA: number; fB: number; lA: number; lB: number; bob: number; swing: number } | null = null;
  if (o.walk != null && posture === "stand") {
    const f = Math.floor(frac(o.walk) * 6) / 6;
    const a = f * Math.PI * 2;
    g = {
      fA: Math.sin(a),
      fB: -Math.sin(a),
      lA: Math.max(0, Math.cos(a)),
      lB: Math.max(0, -Math.cos(a)),
      bob: -Math.round(Math.abs(Math.cos(a))),
      swing: Math.sin(a),
    };
  }

  const R = makeRig(x, y, {
    flip: o.flip,
    dx: (o.dx || 0) + (id.dx || 0),
    dy: (o.dy || 0) + (id.dy || 0) + (g ? g.bob : 0),
    sq: (o.sq || 0) + (id.sq || 0),
  });

  const side = view === "side";
  const q = view === "q";
  const back = view === "back";
  const front = view === "front";
  const arm = o.arm || [ARM.down, ARM.down];
  const bend = o.bend || [0.22, 0.22];
  const drag = clamp(o.drag || 0, -1, 1);
  const wind = o.wind || 0;
  const sw = g ? g.swing * 0.34 : 0;
  const ts = st(t);
  const flut = Math.round(Math.sin(ts * 7.5) * (Math.abs(wind) + (g ? 0.8 : 0.25)) * 1.2);
  const hands: [number, number][] = [
    [x, y - 24],
    [x, y - 24],
  ];

  // Vertical crouch/sit offsets for torso/head
  const bodyDrop = posture === "crouch" ? 13 : posture === "sit" ? 4 : 0;
  const headBow = (o.headBow || 0) + (posture === "crouch" ? 3 : 0);

  fb.beginSpr();

  // 1. Back arm (side / q)
  if (side || q) {
    hands[0] = drawArm(
      fb,
      R,
      [side ? -1 : -5, -37 + bodyDrop],
      arm[0] - sw,
      8,
      7,
      bend[0],
      3,
      CHAR_COLORS.boyCoat[1],
      CHAR_COLORS.skin[2],
      o.hold && o.hold[0],
      1
    );
    fb.part();
  }

  // 2. Legs + Shoes (Posture-aware: stand, sit, crouch)
  if (posture === "crouch") {
    // Kneeling/crouching low on curb with knees pulled up
    fb.poly(
      R.Lp([
        [-7, -14],
        [4, -15],
        [9, -7],
        [5, -1],
        [-8, -1],
      ]),
      CHAR_COLORS.boyPants[1]
    );
    fb.poly(
      R.Lp([
        [-9, -3],
        [-2, -3],
        [-2, 0],
        [-10, 0],
      ]),
      CHAR_COLORS.boyShoe[1]
    );
    fb.poly(
      R.Lp([
        [3, -3],
        [9, -3],
        [10, 0],
        [3, 0],
      ]),
      CHAR_COLORS.boyShoe[2]
    );
    fb.part();
  } else if (posture === "sit") {
    // Seated thighs forward + shins vertical down to floor y=0
    const dir = side || q ? 1 : 0;
    if (dir) {
      fb.line(...R.L(-2, -13), ...R.L(6, -12), CHAR_COLORS.boyPants[0], 3);
      fb.line(...R.L(6, -12), ...R.L(6, -3), CHAR_COLORS.boyPants[0], 3);
      fb.poly(
        R.Lp([
          [4, -3],
          [9, -3],
          [10, 0],
          [4, 0],
        ]),
        CHAR_COLORS.boyShoe[1]
      );
      fb.line(...R.L(0, -14), ...R.L(9, -13), CHAR_COLORS.boyPants[1], 4);
      fb.line(...R.L(9, -13), ...R.L(9, -3), CHAR_COLORS.boyPants[1], 3);
      fb.poly(
        R.Lp([
          [7, -3],
          [12, -3],
          [13, 0],
          [7, 0],
        ]),
        CHAR_COLORS.boyShoe[2]
      );
    } else {
      fb.line(...R.L(-4, -14), ...R.L(-4, -3), CHAR_COLORS.boyPants[1], 3);
      fb.line(...R.L(4, -14), ...R.L(4, -3), CHAR_COLORS.boyPants[1], 3);
      fb.rect(...R.L(-6, -3), 4, 3, CHAR_COLORS.boyShoe[2]);
      fb.rect(...R.L(2, -3), 4, 3, CHAR_COLORS.boyShoe[2]);
    }
    fb.part();
  } else {
    const legs: [number, number, number, boolean][] =
      side || q
        ? [
            [-1 + (q ? -2 : 0), g ? g.fB * 5 : -2, g ? g.lB * 3 : 0, true],
            [1 + (q ? 2 : 0), g ? g.fA * 5 : 3, g ? g.lA * 3 : 0, false],
          ]
        : [
            [-3, -3, g ? Math.max(0, g.fA) * 2 : 0, false],
            [3, 3, g ? Math.max(0, g.fB) * 2 : 0, false],
          ];
    for (const [hx, fx0, lift, far] of legs) {
      const fy = -lift;
      const pc = far ? CHAR_COLORS.boyPants[0] : CHAR_COLORS.boyPants[1];
      const bc = far ? CHAR_COLORS.boyShoe[1] : CHAR_COLORS.boyShoe[2];
      const [kx, ky] = R.L((hx + fx0) / 2, -11);
      fb.line(...R.L(hx, -20), kx, ky, pc, 3);
      fb.line(kx, ky, ...R.L(fx0, fy - 3), pc, 3);
      if (side || q) {
        fb.poly(
          R.Lp([
            [fx0 - 2, fy - 4],
            [fx0 + 2, fy - 4],
            [fx0 + 4, fy - 1],
            [fx0 + 4, fy],
            [fx0 - 2, fy],
          ]),
          bc
        );
      } else {
        fb.poly(
          R.Lp([
            [fx0 - 2, fy - 4],
            [fx0 + 2, fy - 4],
            [fx0 + 3, fy],
            [fx0 - 3, fy],
          ]),
          bc
        );
      }
      fb.part();
    }
  }

  // 3. Long Coat / Oversized Cardigan + Cream Tee + Scarf Tail
  if (o.scarf !== false && (side || q)) {
    const tx = side ? -6 : -5;
    const wPush = Math.max(0, Math.abs(wind) - 0.15) * 6;
    const hangY = wind > 0.25 ? -31 : -26;
    fb.poly(
      R.Lp([
        [tx + 1, -37 + bodyDrop],
        [tx - 1, -33 + bodyDrop],
        [tx - 2 - wPush, hangY + bodyDrop + flut],
        [tx - 5 - wPush, hangY - 3 + bodyDrop + flut],
      ]),
      CHAR_COLORS.boyScarf[1]
    );
    fb.part();
  }

  const cw = side ? 0.78 : q ? 0.9 : 1;
  const cBot = posture === "crouch" ? -11 : -16 + bodyDrop;
  const cTop = -39 + bodyDrop;
  fb.poly(
    R.Lp([
      [-5 * cw, cTop],
      [5 * cw, cTop],
      [7 * cw, cTop + 7],
      [9 * cw, cBot - 2],
      [9 * cw + Math.round(wind * 2), cBot],
      [-9 * cw + Math.round(wind * 1.5), cBot],
      [-9 * cw, cBot - 2],
      [-7 * cw, cTop + 7],
    ]),
    CHAR_COLORS.boyCoat[2]
  );
  // Shadow side of coat
  fb.poly(
    R.Lp([
      [(side ? -1 : 3) * cw, cTop],
      [5 * cw, cTop],
      [7 * cw, cTop + 7],
      [9 * cw, cBot],
      [(side ? 0 : 4) * cw, cBot],
    ]),
    CHAR_COLORS.boyCoat[1]
  );
  // Inner cream shirt placket
  if (front || q) {
    const zx = q ? 2 : 0;
    fb.poly(
      R.Lp([
        [zx - 2, cTop + 1],
        [zx + 2, cTop + 1],
        [zx + 2, cBot - 3],
        [zx - 2, cBot - 3],
      ]),
      CHAR_COLORS.tee[2]
    );
  }
  fb.part();

  // Scarf collar & front tail
  if (o.scarf !== false) {
    fb.oval(...R.L(0, cTop + 1), 7.5 * R.sx, 2.2 * R.sy, CHAR_COLORS.boyScarf[2]);
    fb.line(...R.L(-6, cTop + 2), ...R.L(6, cTop + 2), CHAR_COLORS.boyScarf[1]);
    if (front || q) {
      const kx = q ? 4 : 3;
      fb.poly(
        R.Lp([
          [kx - 1, cTop + 2],
          [kx + 2, cTop + 2],
          [kx + 3 + flut, cTop + 11],
          [kx + flut, cTop + 11],
        ]),
        CHAR_COLORS.boyScarf[3]
      );
    }
    fb.part();
  }

  // 4. Head: Neck, Messy Dark-Indigo Hair, Pale Face, Parted Bangs, Cowlick
  const hx = side ? 1 : q ? 0.5 : 0;
  const hy = bodyDrop + headBow;
  fb.rect(...R.L(-1, -42 + hy), 3, 3, CHAR_COLORS.skin[1]);
  fb.oval(...R.L(hx - (side ? 2 : q ? 1 : 0), -52 + hy), 11 * R.sx, 10 * R.sy, CHAR_COLORS.boyHair[1]);
  fb.poly(
    R.Lp([
      [hx - 11 - (side ? 1 : 0), -52 + hy],
      [hx + (side ? 6 : 11), -52 + hy],
      [hx + (side ? 6 : 11), -44 + hy],
      [hx + (side ? 5 : 9), -42 + hy],
      [hx - (side ? 10 : 9), -42 + hy],
      [hx - 11 - (side ? 1 : 0), -44 + hy],
    ]),
    CHAR_COLORS.boyHair[1]
  );

  if (!back) {
    const fcx = side ? 3 : q ? 1.5 : 0;
    fb.part();
    fb.oval(...R.L(fcx, -48 + hy), (side ? 7 : 8) * R.sx, 7.2 * R.sy, CHAR_COLORS.skin[3]);
    if (side) fb.px(...R.L(11, -47 + hy), CHAR_COLORS.skin[3]);
    fb.part();
    // Parted messy bangs strictly above eyebrow row (-52..-51)
    const B: [number, number][] = side
      ? [
          [-6, -57 + hy],
          [-1, -61 + hy],
          [6, -60 + hy],
          [10, -56 + hy],
          [10, -53 + hy],
          [8, -54 + hy],
          [5, -52 + hy],
          [2, -54 + hy],
          [-2, -52 + hy],
          [-6, -49 + hy],
        ]
      : [
          [-9, -55 + hy],
          [-6, -59 + hy],
          [0, -61 + hy],
          [6, -59 + hy],
          [9, -55 + hy],
          [9, -51 + hy],
          [7, -53 + hy],
          [5, -51 + hy],
          [3, -53 + hy],
          [0, -52 + hy],
          [-2, -54 + hy],
          [-5, -51 + hy],
          [-7, -53 + hy],
          [-9, -51 + hy],
        ];
    fb.poly(
      R.Lp(B.map(([a, b]) => [a + (q ? 1 : 0), b])),
      CHAR_COLORS.boyHair[1]
    );
  } else {
    fb.part();
  }

  // Hair highlight + gentle wind cowlick
  fb.line(...R.L(hx - 6, -57 + hy), ...R.L(hx - 2, -60 + hy), CHAR_COLORS.boyHair[2]);
  fb.px(...R.L(hx, -60 + hy), CHAR_COLORS.boyHair[3]);
  const dg = Math.round(drag * 2.5);
  const wd = Math.round(wind * 2);
  fb.pline(
    R.Lp([
      [hx + 1, -61 + hy],
      [hx + 2 + wd, -64 + hy + dg],
      [hx + 5 + wd, -65 + hy + dg],
    ]),
    CHAR_COLORS.boyHair[1],
    2
  );
  fb.part(false);

  // 5. Face
  if (!back) {
    const f = side
      ? { eyes: [null, [6, -49 + hy]] as ([number, number] | null)[], mouth: [8, -44 + hy] as [number, number], blush: [[5, -45 + hy]] as [number, number][] }
      : q
        ? {
            eyes: [[-3, -49 + hy], [5, -49 + hy]] as ([number, number] | null)[],
            mouth: [3, -44 + hy] as [number, number],
            blush: [[-5, -45 + hy], [7, -45 + hy]] as [number, number][],
          }
        : {
            eyes: [[-5, -49 + hy], [4, -49 + hy]] as ([number, number] | null)[],
            mouth: [0, -44 + hy] as [number, number],
            blush: [[-8, -45 + hy], [6, -45 + hy]] as [number, number][],
          };
    drawFace(fb, R, { ...f, ew: 2, eh: 4, browCol: CHAR_COLORS.boyHair[2] }, ex, o, t);
  }

  // 6. Front Arm(s)
  fb.part();
  if (front || back) {
    hands[0] = drawArm(
      fb,
      R,
      [-6, -37 + bodyDrop],
      arm[0],
      8,
      7,
      bend[0],
      3,
      CHAR_COLORS.boyCoat[2],
      CHAR_COLORS.skin[3],
      o.hold && o.hold[0],
      -1
    );
    fb.part();
    hands[1] = drawArm(
      fb,
      R,
      [6, -37 + bodyDrop],
      arm[1],
      8,
      7,
      bend[1],
      3,
      CHAR_COLORS.boyCoat[2],
      CHAR_COLORS.skin[3],
      o.hold && o.hold[1],
      1
    );
  } else {
    hands[1] = drawArm(
      fb,
      R,
      [side ? 1 : 4, -37 + bodyDrop],
      arm[1] + sw,
      8,
      7,
      bend[1],
      3,
      CHAR_COLORS.boyCoat[2],
      CHAR_COLORS.skin[3],
      o.hold && o.hold[1],
      1
    );
  }

  fb.endSpr({
    tint: o.tint === undefined ? fb.P.charTint : o.tint,
    z: o.z,
    ax: R.X0,
    ay: R.Y0,
  });

  const top = R.L(hx, -65 + hy);
  const info: CharacterInfo = {
    head: R.L(0, -50 + hy),
    top,
    hands,
    face: R.L(side ? 5 : 0, -47 + hy),
  };
  if (o.emote) {
    fb.emote(o.emote, (o.emoteSide ?? R.fl) > 0 ? top[0] + 4 : top[0] - 18, top[1] - 1, {
      age: o.emoteAge ?? 1,
    });
  }
  return info;
}

// =========================================================================
// MEMORY GIRL (Warm Chestnut Bob + Amber Trench, ~64px logical height)
// =========================================================================
export function drawGirl(fb: PixelFB, x: number, y: number, o: CharacterOpts = {}): CharacterInfo {
  ensureCastRamps(fb);
  const t = o.t ?? fb.T;
  const faceName = o.face || "melancholy";
  const ex = EXPRS[faceName] || EXPRS.neutral;
  const id = idleMotion(ex.idle, t, o.seed || 7);
  const view = o.view || "q";

  let g: { fA: number; fB: number; lA: number; lB: number; bob: number; swing: number } | null = null;
  if (o.walk != null) {
    const f = Math.floor(frac(o.walk) * 6) / 6;
    const a = f * Math.PI * 2;
    g = {
      fA: Math.sin(a),
      fB: -Math.sin(a),
      lA: Math.max(0, Math.cos(a)),
      lB: Math.max(0, -Math.cos(a)),
      bob: -Math.round(Math.abs(Math.cos(a))),
      swing: Math.sin(a),
    };
  }

  const R = makeRig(x, y, {
    flip: o.flip,
    dx: (o.dx || 0) + (id.dx || 0),
    dy: (o.dy || 0) + (id.dy || 0) + (g ? g.bob : 0),
    sq: (o.sq || 0) + (id.sq || 0),
  });

  const side = view === "side";
  const q = view === "q";
  const back = view === "back";
  const front = view === "front";
  const arm = o.arm || [ARM.down, ARM.down];
  const bend = o.bend || [0.22, 0.22];
  const wind = o.wind || 0;
  const sw = g ? g.swing * 0.3 : 0;
  const hands: [number, number][] = [
    [x, y - 24],
    [x, y - 24],
  ];

  fb.beginSpr();

  if (side || q) {
    hands[0] = drawArm(
      fb,
      R,
      [side ? -1 : -5, -36],
      arm[0] - sw,
      7.5,
      6.5,
      bend[0],
      3,
      CHAR_COLORS.girlCoat[1],
      CHAR_COLORS.skin[2],
      o.hold && o.hold[0],
      1
    );
    fb.part();
  }

  // Legs + Boots
  const legs: [number, number, number, boolean][] =
    side || q
      ? [
          [-1 + (q ? -1.5 : 0), g ? g.fB * 4.5 : -1.5, g ? g.lB * 2.5 : 0, true],
          [1 + (q ? 1.5 : 0), g ? g.fA * 4.5 : 2.5, g ? g.lA * 2.5 : 0, false],
        ]
      : [
          [-3, -3, g ? Math.max(0, g.fA) * 2 : 0, false],
          [3, 3, g ? Math.max(0, g.fB) * 2 : 0, false],
        ];
  for (const [hx, fx0, lift, far] of legs) {
    const fy = -lift;
    const bc = far ? CHAR_COLORS.girlBoot[1] : CHAR_COLORS.girlBoot[2];
    const [kx, ky] = R.L((hx + fx0) / 2, -10);
    fb.line(...R.L(hx, -18), kx, ky, CHAR_COLORS.skin[2], 2);
    fb.line(kx, ky, ...R.L(fx0, fy - 4), CHAR_COLORS.skin[2], 2);
    fb.poly(
      R.Lp([
        [fx0 - 2, fy - 5],
        [fx0 + 2, fy - 5],
        [fx0 + 3, fy],
        [fx0 - 2, fy],
      ]),
      bc
    );
    fb.part();
  }

  // Dark pleated skirt + Camel A-line trench coat
  const cw = side ? 0.78 : q ? 0.9 : 1;
  fb.poly(
    R.Lp([
      [-8 * cw, -21],
      [8 * cw, -21],
      [10 * cw, -14],
      [-10 * cw, -14],
    ]),
    CHAR_COLORS.girlSkirt[1]
  );
  fb.part();
  fb.poly(
    R.Lp([
      [-5 * cw, -38],
      [5 * cw, -38],
      [7 * cw, -31],
      [9 * cw + Math.round(wind * 2), -18],
      [-9 * cw + Math.round(wind * 1.5), -18],
      [-7 * cw, -31],
    ]),
    CHAR_COLORS.girlCoat[2]
  );
  fb.poly(
    R.Lp([
      [(side ? -1 : 3) * cw, -38],
      [5 * cw, -38],
      [7 * cw, -31],
      [9 * cw, -18],
      [(side ? 0 : 4) * cw, -18],
    ]),
    CHAR_COLORS.girlCoat[1]
  );
  if (front || q) {
    const zx = q ? 2 : 0;
    fb.line(...R.L(zx, -37), ...R.L(zx, -19), CHAR_COLORS.girlCoat[0]);
  }
  fb.part();

  // Head + Chestnut bob hair + cream hairclip
  const hx = side ? 1 : q ? 0.5 : 0;
  fb.rect(...R.L(-1, -41), 3, 3, CHAR_COLORS.skin[1]);
  fb.oval(...R.L(hx - (side ? 2 : q ? 1 : 0), -50), 10.5 * R.sx, 9.5 * R.sy, CHAR_COLORS.girlHair[1]);
  fb.poly(
    R.Lp([
      [hx - 11, -50],
      [hx + (side ? 6 : 11), -50],
      [hx + (side ? 6 : 11), -38],
      [hx - (side ? 10 : 10), -38],
    ]),
    CHAR_COLORS.girlHair[1]
  );

  if (!back) {
    const fcx = side ? 3 : q ? 1.5 : 0;
    fb.part();
    fb.oval(...R.L(fcx, -47), (side ? 6.5 : 7.5) * R.sx, 7 * R.sy, CHAR_COLORS.skin[3]);
    fb.part();
    const B: [number, number][] = side
      ? [
          [-6, -56],
          [0, -60],
          [6, -58],
          [9, -54],
          [9, -51],
          [5, -52],
          [1, -51],
          [-5, -49],
        ]
      : [
          [-9, -54],
          [-5, -58],
          [0, -59],
          [5, -58],
          [9, -54],
          [9, -50],
          [6, -52],
          [3, -51],
          [0, -53],
          [-3, -51],
          [-6, -52],
          [-9, -50],
        ];
    fb.poly(
      R.Lp(B.map(([a, b]) => [a + (q ? 1 : 0), b])),
      CHAR_COLORS.girlHair[1]
    );
    // Signature cream hairclip
    fb.rect(...R.L(q ? -5 : 4, -53), 3, 2, "#ffe0a8");
  } else {
    fb.part();
  }
  fb.line(...R.L(hx - 6, -56), ...R.L(hx - 2, -58), CHAR_COLORS.girlHair[2]);
  fb.part(false);

  if (!back) {
    const f = side
      ? { eyes: [null, [6, -48]] as ([number, number] | null)[], mouth: [8, -43] as [number, number], blush: [[5, -44]] as [number, number][] }
      : q
        ? {
            eyes: [[-3, -48], [5, -48]] as ([number, number] | null)[],
            mouth: [3, -43] as [number, number],
            blush: [[-5, -44], [7, -44]] as [number, number][],
          }
        : {
            eyes: [[-5, -48], [4, -48]] as ([number, number] | null)[],
            mouth: [0, -43] as [number, number],
            blush: [[-8, -44], [6, -44]] as [number, number][],
          };
    drawFace(fb, R, { ...f, ew: 2, eh: 4, browCol: CHAR_COLORS.girlHair[2] }, ex, o, t);
  }

  fb.part();
  if (front || back) {
    hands[0] = drawArm(
      fb,
      R,
      [-6, -36],
      arm[0],
      7.5,
      6.5,
      bend[0],
      3,
      CHAR_COLORS.girlCoat[2],
      CHAR_COLORS.skin[3],
      o.hold && o.hold[0],
      -1
    );
    fb.part();
    hands[1] = drawArm(
      fb,
      R,
      [6, -36],
      arm[1],
      7.5,
      6.5,
      bend[1],
      3,
      CHAR_COLORS.girlCoat[2],
      CHAR_COLORS.skin[3],
      o.hold && o.hold[1],
      1
    );
  } else {
    hands[1] = drawArm(
      fb,
      R,
      [side ? 1 : 4, -36],
      arm[1] + sw,
      7.5,
      6.5,
      bend[1],
      3,
      CHAR_COLORS.girlCoat[2],
      CHAR_COLORS.skin[3],
      o.hold && o.hold[1],
      1
    );
  }

  fb.endSpr({
    tint: o.tint === undefined ? fb.P.charTint : o.tint,
    z: o.z,
    ax: R.X0,
    ay: R.Y0,
  });

  const top = R.L(hx, -62);
  return {
    head: R.L(0, -49),
    top,
    hands,
    face: R.L(side ? 5 : 0, -46),
  };
}

// =========================================================================
// CAUSAL PROPS (drawn inside or outside beginSpr passes)
// =========================================================================
export const PROPS = {
  pen(fb: PixelFB, x: number, y: number, ang = -0.6): void {
    const dx = Math.cos(ang) * 7;
    const dy = Math.sin(ang) * 7;
    fb.line(x, y, x + dx, y + dy, "#2b2f4a", 1);
    fb.px(x + dx, y + dy, "#ffd278");
  },

  letter(fb: PixelFB, x: number, y: number, folded = false, returned = false): void {
    const own = !fb.SPRM;
    if (own) fb.beginSpr();
    if (folded) {
      fb.rect(x - 6, y - 4, 12, 8, "#f5efe6");
      fb.line(x - 6, y - 4, x, y, "#b8bfd4");
      fb.line(x + 5, y - 4, x, y, "#b8bfd4");
      if (returned) {
        fb.rect(x - 2, y - 1, 5, 4, "#c94152");
        fb.px(x, y, "#fff4cb");
      }
    } else {
      fb.rect(x - 7, y - 5, 14, 10, "#f7f2eb");
      fb.line(x - 5, y - 2, x + 4, y - 2, "#9ca6c2");
      fb.line(x - 5, y + 1, x + 2, y + 1, "#9ca6c2");
      fb.line(x - 5, y + 3, x + 5, y + 3, "#9ca6c2");
    }
    if (own) fb.endSpr({ tint: null });
  },

  whiteRose(fb: PixelFB, x: number, y: number, ang = -Math.PI / 2): void {
    const own = !fb.SPRM;
    if (own) fb.beginSpr();
    const len = 11;
    const fx = x + Math.cos(ang) * len;
    const fy = y + Math.sin(ang) * len;
    fb.line(x, y, fx, fy, "#3b754f", 1);
    fb.px(x + Math.cos(ang) * 5 - 1, y + Math.sin(ang) * 5, "#4c9163");
    fb.disc(fx, fy, 3, "#e8e6eb");
    fb.disc(fx - 1, fy - 1, 2, "#fffaf5");
    fb.px(fx, fy, "#d9c2b8");
    if (own) fb.endSpr({ tint: null });
  },

  briarRose(fb: PixelFB, x: number, y: number): void {
    const own = !fb.SPRM;
    if (own) fb.beginSpr();
    fb.line(x, y + 7, x, y - 4, "#2c5e42", 1);
    fb.px(x - 1, y + 2, "#458059");
    fb.px(x + 1, y + 4, "#458059");
    fb.disc(x, y - 5, 3, "#b82d46");
    fb.disc(x - 1, y - 6, 1.6, "#eb5972");
    if (own) fb.endSpr({ tint: null });
  },

  coffeeMug(fb: PixelFB, x: number, y: number): void {
    const own = !fb.SPRM;
    if (own) fb.beginSpr();
    fb.rect(x - 4, y - 6, 8, 7, "#ede6dc");
    fb.rect(x + 4, y - 5, 2, 4, "#d4cbc0");
    fb.rect(x - 3, y - 5, 6, 2, "#4d352a");
    if (own) fb.endSpr({ tint: null });
  },

  umbrella(fb: PixelFB, x: number, y: number, tilt = 0, c = "#283963"): void {
    const own = !fb.SPRM;
    if (own) fb.beginSpr();
    const len = 24;
    const ax = -Math.PI / 2 + tilt;
    const cx = x + Math.cos(ax) * len;
    const cy = y + Math.sin(ax) * len;
    fb.line(x, y, cx, cy, "#1a1f36", 1);
    fb.line(x, y, x - 2, y + 2, "#734e3a", 1);
    const nx = Math.cos(tilt);
    const ny = Math.sin(tilt);
    const P = (u: number, v: number): [number, number] => [cx + u * nx - v * ny, cy + u * ny + v * nx];
    fb.poly([P(-17, 2), P(-12, -5), P(0, -8), P(12, -5), P(17, 2)], c);
    fb.line(...P(0, -8), ...P(-6, 2), fb.shade(c, 1));
    fb.line(...P(0, -8), ...P(6, 2), fb.shade(c, -1));
    if (own) fb.endSpr({ tint: fb.P.charTint });
  },

  paperPlane(fb: PixelFB, x: number, y: number, tilt = -0.22): void {
    const own = !fb.SPRM;
    if (own) fb.beginSpr();
    const c = Math.cos(tilt);
    const s = Math.sin(tilt);
    const R = (u: number, v: number): [number, number] => [x + u * c - v * s, y + u * s + v * c];
    fb.poly([R(-7, 2), R(8, 0), R(-4, -3)], "#fffaf2");
    fb.poly([R(-7, 2), R(8, 0), R(-5, 4)], "#cdd6e8");
    if (own) fb.endSpr({ tint: null });
  },
};
