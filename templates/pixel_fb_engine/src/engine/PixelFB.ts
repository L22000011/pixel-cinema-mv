import { PALETTES, type Palette } from "./Palettes";

export const LW = 270;
export const LH = 480;
export const W = 1080;
export const H = 1920;
export const PXS = 4; // Exact 4x integer nearest-neighbor scale
export const TAU = Math.PI * 2;

export const clamp = (x: number, a = 0, b = 1): number => Math.max(a, Math.min(b, x));
export const lerp = (a: number, b: number, x: number): number => a + (b - a) * x;
export const ease = (x: number): number => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};
export const easeOut = (x: number): number => 1 - Math.pow(1 - clamp(x), 3);
export const easeIn = (x: number): number => Math.pow(clamp(x), 3);
export const seg = (t: number, a: number, b: number): number =>
  b <= a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a));
export const frac = (x: number): number => x - Math.floor(x);
export const onStep = (t: number, n: number): number => Math.floor(t * n + 1e-6) / n;
export const st = (t: number): number => onStep(t, 12);

export function hash(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function rnd(key: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  }
  let s = h >>> 0 || 1;
  return () => {
    s = Math.imul(s ^ (s >>> 15), 2246822519) >>> 0;
    s = (s ^ (s >>> 13)) >>> 0;
    return (s % 1000003) / 1000003;
  };
}

export function kf(t: number, keys: [number, number][], e: (x: number) => number = ease): number {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t < keys[i][0]) {
      const [a, va] = keys[i - 1];
      const [b, vb] = keys[i];
      return lerp(va, vb, e((t - a) / (b - a)));
    }
  }
  return keys[keys.length - 1][1];
}

export const vel = (f: (t: number) => number, t: number, dt = 1 / 12): number =>
  (f(t + dt) - f(t - dt)) / (2 * dt);

export function jumpMotion(t: number, t0: number, t1: number, h = 4): { dy: number; sq: number } {
  if (t < t0 - 0.12) return { dy: 0, sq: 0 };
  if (t < t0) return { dy: 0, sq: 0.16 * ease(seg(t, t0 - 0.12, t0)) };
  if (t < t1) {
    const k = (t - t0) / (t1 - t0);
    return { dy: -h * 4 * k * (1 - k), sq: -0.15 * Math.abs(1 - 2 * k) };
  }
  const a = t - t1;
  return { dy: 0, sq: 0.2 * Math.exp(-8 * a) * Math.cos(20 * a) };
}

export const shakeXY = (t: number, amt: number): [number, number] => {
  const f = Math.floor(t * 24);
  return [Math.round((hash(f * 1.7) - 0.5) * 2 * amt), Math.round((hash(f * 2.3 + 9) - 0.5) * 2 * amt)];
};

export const BAY4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const BAY8 = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28,
  52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39,
  13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
].map((v) => (v + 0.5) / 64);

export const qd = (d: number, n = 4): number => Math.round(clamp(d) * n) / n;

export type ColorInput = string | number;

/**
 * Software 270x480 Uint32Array pixel framebuffer with ordered Bayer dithering,
 * selective 1px hue-shifted sprite auto-outlining, integer punch-in, and crisp Zpix CJK text.
 */
export class PixelFB {
  public P: Palette = PALETTES.midnight;
  public T = 0;

  private loc: HTMLCanvasElement;
  private lox: CanvasRenderingContext2D;
  private img: ImageData;
  public FB: Uint32Array;
  public FB2: Uint32Array;
  private SB: Uint32Array;
  private SID: Uint8Array;
  private PLINE: Uint8Array;

  public OX = 0;
  public OY = 0;
  public CAMX = 0;
  public CAMY = 0;
  public SPRM = false;
  private PART = 1;
  private PUNCH: { z: number; sx: number; sy: number } | null = null;
  private KX0 = 0;
  private KY0 = 0;
  private KX1 = LW - 1;
  private KY1 = LH - 1;
  private BX0 = LW;
  private BY0 = LH;
  private BX1 = -1;
  private BY1 = -1;

  private colorMap = new Map<string, number>();
  private rampMap = new Map<number, { r: number[]; i: number }>();
  private shadeCache = new Map<string, number>();
  private tintCache = new Map<string, number>();
  private stampCache = new Map<number, number[]>();
  private spriteParseCache = new Map<string, { w: number; h: number; r: string[] }>();

  // Offscreen rasterizer for crisp Zpix pixel CJK text
  private txc: HTMLCanvasElement;
  private txx: CanvasRenderingContext2D;
  private txCache = new Map<string, { canvas: HTMLCanvasElement; w: number; h: number }>();

  constructor() {
    this.loc = document.createElement("canvas");
    this.loc.width = LW;
    this.loc.height = LH;
    const ctx = this.loc.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D context for PixelFB");
    this.lox = ctx;
    this.img = this.lox.createImageData(LW, LH);
    this.FB = new Uint32Array(this.img.data.buffer);
    this.FB2 = new Uint32Array(LW * LH);
    this.SB = new Uint32Array(LW * LH);
    this.SID = new Uint8Array(LW * LH);
    this.PLINE = new Uint8Array(256);

    this.txc = document.createElement("canvas");
    this.txc.width = 1600;
    this.txc.height = 64;
    const txCtx = this.txc.getContext("2d", { willReadFrequently: true });
    if (!txCtx) throw new Error("Failed to get 2D text rasterizer context");
    this.txx = txCtx;

    // Register all palette ramps
    for (const pal of Object.values(PALETTES)) {
      for (const [k, v] of Object.entries(pal)) {
        if (k !== "charTint" && Array.isArray(v) && typeof v[0] === "string" && v[0].startsWith("#")) {
          this.regRamp(v);
        }
      }
    }
  }

  public C(c: ColorInput): number {
    if (typeof c === "number") return c >>> 0;
    let v = this.colorMap.get(c);
    if (v !== undefined) return v;
    const n = parseInt(c.slice(1, 7), 16);
    v = (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | ((n >> 16) & 255)) >>> 0;
    this.colorMap.set(c, v);
    return v;
  }

  private U(r: number, g: number, b: number): number {
    const cr = r < 0 ? 0 : r > 255 ? 255 : r | 0;
    const cg = g < 0 ? 0 : g > 255 ? 255 : g | 0;
    const cb = b < 0 ? 0 : b > 255 ? 255 : b | 0;
    return (0xff000000 | (cb << 16) | (cg << 8) | cr) >>> 0;
  }

  private rgbOf(u: number): [number, number, number] {
    return [u & 255, (u >>> 8) & 255, (u >>> 16) & 255];
  }

  private mixU(a: number, b: number, k: number): number {
    const A = this.rgbOf(a);
    const B = this.rgbOf(b);
    return this.U(lerp(A[0], B[0], k), lerp(A[1], B[1], k), lerp(A[2], B[2], k));
  }

  public regRamp(arr: string[]): string[] {
    const us = arr.map((c) => this.C(c));
    us.forEach((u, i) => this.rampMap.set(u, { r: us, i }));
    return arr;
  }

  private shiftColor(u: number, k: number): number {
    let [r, g, b] = this.rgbOf(u);
    for (let s = 0; s < Math.abs(k); s++) {
      if (k < 0) {
        r = r * 0.72;
        g = g * 0.7;
        b = b * 0.8 + 10;
      } else {
        r += (255 - r) * 0.32 + 6;
        g += (255 - g) * 0.28 + 3;
        b += (255 - b) * 0.2;
      }
    }
    return this.U(r, g, b);
  }

  public shade(c: ColorInput, k = -1): number {
    const u = this.C(c);
    if (!k) return u;
    const key = `${u}|${k}`;
    let v = this.shadeCache.get(key);
    if (v !== undefined) return v;
    const e = this.rampMap.get(u);
    if (e) {
      const j = e.i + k;
      const n = e.r.length;
      v = j >= 0 && j < n ? e.r[j] : this.shiftColor(e.r[j < 0 ? 0 : n - 1], j < 0 ? j : j - n + 1);
    } else {
      v = this.shiftColor(u, k);
    }
    this.shadeCache.set(key, v);
    return v;
  }

  private tintU(u: number, tc: number, k: number): number {
    const key = `${u}|${tc}|${k}`;
    let v = this.tintCache.get(key);
    if (v === undefined) {
      v = this.mixU(u, tc, k);
      this.tintCache.set(key, v);
    }
    return v;
  }

  public pal(name: string): Palette {
    this.P = PALETTES[name] || PALETTES.midnight;
    return this.P;
  }

  public begin(t: number, palName = "midnight"): void {
    this.T = t;
    this.P = PALETTES[palName] || PALETTES.midnight;
    this.SPRM = false;
    this.PUNCH = null;
    this.noclip();
    this.camAt(LW / 2, LH / 2);
    this.FB.fill(this.C(this.P.ink));
  }

  public end(outCtx: CanvasRenderingContext2D): void {
    if (this.SPRM) this.endSpr();
    this.lox.putImageData(this.img, 0, 0);
    outCtx.setTransform(1, 0, 0, 1, 0, 0);
    outCtx.imageSmoothingEnabled = false;
    if (this.PUNCH) {
      outCtx.drawImage(
        this.loc,
        this.PUNCH.sx,
        this.PUNCH.sy,
        LW / this.PUNCH.z,
        LH / this.PUNCH.z,
        0,
        0,
        W,
        H
      );
    } else {
      outCtx.drawImage(this.loc, 0, 0, W, H);
    }
  }

  public camAt(cx = LW / 2, cy = LH / 2): void {
    this.CAMX = Math.round(cx - LW / 2);
    this.CAMY = Math.round(cy - LH / 2);
    this.layer(1);
  }

  public layer(f = 1, fy = f): void {
    this.OX = Math.round(this.CAMX * f);
    this.OY = Math.round(this.CAMY * fy);
  }

  public screenSpace(): void {
    this.OX = 0;
    this.OY = 0;
  }

  public punch(z: number, x: number, y: number): void {
    const zi = Math.max(1, Math.round(z));
    if (zi === 1) {
      this.PUNCH = null;
      return;
    }
    const sx = clamp(Math.round(x - this.CAMX - LW / zi / 2), 0, LW - LW / zi);
    const sy = clamp(Math.round(y - this.CAMY - LH / zi / 2), 0, LH - LH / zi);
    this.PUNCH = { z: zi, sx, sy };
  }

  public clip(x: number, y: number, w: number, h: number): void {
    this.KX0 = Math.max(0, Math.round(x) - this.OX);
    this.KY0 = Math.max(0, Math.round(y) - this.OY);
    this.KX1 = Math.min(LW - 1, Math.round(x + w) - this.OX - 1);
    this.KY1 = Math.min(LH - 1, Math.round(y + h) - this.OY - 1);
  }

  public noclip(): void {
    this.KX0 = 0;
    this.KY0 = 0;
    this.KX1 = LW - 1;
    this.KY1 = LH - 1;
  }

  public measure<T>(fn: () => T): T {
    const savedClip = [this.KX0, this.KY0, this.KX1, this.KY1];
    const savedSpr = this.SPRM;
    this.KX0 = 1;
    this.KX1 = 0;
    this.KY0 = 1;
    this.KY1 = 0;
    try {
      return fn();
    } finally {
      [this.KX0, this.KY0, this.KX1, this.KY1] = savedClip;
      this.SPRM = savedSpr;
    }
  }

  private _p(x: number, y: number, u: number): void {
    if (x < this.KX0 || x > this.KX1 || y < this.KY0 || y > this.KY1) return;
    const i = y * LW + x;
    if (this.SPRM) {
      this.SB[i] = u;
      this.SID[i] = this.PART;
      if (x < this.BX0) this.BX0 = x;
      if (x > this.BX1) this.BX1 = x;
      if (y < this.BY0) this.BY0 = y;
      if (y > this.BY1) this.BY1 = y;
    } else {
      this.FB[i] = u;
    }
  }

  private _span(y: number, x0: number, x1: number, u: number, d = 1): void {
    if (y < this.KY0 || y > this.KY1) return;
    if (x0 < this.KX0) x0 = this.KX0;
    if (x1 > this.KX1) x1 = this.KX1;
    if (x0 > x1) return;
    const row = y * LW;
    const by = ((y + this.OY) & 3) << 2;
    if (this.SPRM) {
      if (x0 < this.BX0) this.BX0 = x0;
      if (x1 > this.BX1) this.BX1 = x1;
      if (y < this.BY0) this.BY0 = y;
      if (y > this.BY1) this.BY1 = y;
      for (let x = x0; x <= x1; x++) {
        if (d >= 1 || BAY4[by | ((x + this.OX) & 3)] < d) {
          this.SB[row + x] = u;
          this.SID[row + x] = this.PART;
        }
      }
    } else if (d >= 1) {
      this.FB.fill(u, row + x0, row + x1 + 1);
    } else {
      for (let x = x0; x <= x1; x++) {
        if (BAY4[by | ((x + this.OX) & 3)] < d) {
          this.FB[row + x] = u;
        }
      }
    }
  }

  public fill(c: ColorInput): void {
    this.FB.fill(this.C(c));
  }

  public px(x: number, y: number, c: ColorInput): void {
    this._p(Math.round(x) - this.OX, Math.round(y) - this.OY, this.C(c));
  }

  public rect(x: number, y: number, w: number, h: number, c: ColorInput, d = 1): void {
    const u = this.C(c);
    const sx = Math.round(x) - this.OX;
    const sy = Math.round(y) - this.OY;
    const ww = Math.round(w);
    const hh = Math.round(h);
    for (let j = 0; j < hh; j++) {
      this._span(sy + j, sx, sx + ww - 1, u, d);
    }
  }

  private getStamp(w: number): number[] {
    const cached = this.stampCache.get(w);
    if (cached) return cached;
    const o: number[] = [];
    const a = -Math.floor((w - 1) / 2);
    const c = (w - 1) / 2 + a;
    const th = (w / 2) ** 2 - (w === 3 ? 1 : 0);
    for (let j = a; j < a + w; j++) {
      for (let i = a; i < a + w; i++) {
        if (w <= 2 || (i - c) ** 2 + (j - c) ** 2 <= th) o.push(i, j);
      }
    }
    this.stampCache.set(w, o);
    return o;
  }

  public line(x0: number, y0: number, x1: number, y1: number, c: ColorInput, w = 1): void {
    const u = this.C(c);
    const stp = this.getStamp(Math.max(1, Math.round(w)));
    let ax = Math.round(x0) - this.OX;
    let ay = Math.round(y0) - this.OY;
    const bx = Math.round(x1) - this.OX;
    const by = Math.round(y1) - this.OY;
    const dx = Math.abs(bx - ax);
    const dy = -Math.abs(by - ay);
    const sx = ax < bx ? 1 : -1;
    const sy = ay < by ? 1 : -1;
    let e = dx + dy;
    for (let n = 0; n < 2000; n++) {
      for (let k = 0; k < stp.length; k += 2) {
        this._p(ax + stp[k], ay + stp[k + 1], u);
      }
      if (ax === bx && ay === by) break;
      const e2 = 2 * e;
      if (e2 >= dy) {
        e += dy;
        ax += sx;
      }
      if (e2 <= dx) {
        e += dx;
        ay += sy;
      }
    }
  }

  public pline(pts: [number, number][], c: ColorInput, w = 1): void {
    for (let i = 1; i < pts.length; i++) {
      this.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], c, w);
    }
  }

  public curve(pts: [number, number][], c: ColorInput, w = 1, n = 0): void {
    const out: [number, number][] = [];
    const steps =
      n ||
      Math.max(
        4,
        Math.round(
          pts.reduce(
            (s, p, i) => (i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0),
            0
          ) / 3
        )
      );
    for (let i = 0; i <= steps; i++) {
      const k = i / steps;
      const q = k * (pts.length - 1);
      const a = Math.min(pts.length - 2, Math.floor(q));
      const f = q - a;
      out.push([lerp(pts[a][0], pts[a + 1][0], f), lerp(pts[a][1], pts[a + 1][1], f)]);
    }
    this.pline(out, c, w);
  }

  public disc(cx: number, cy: number, r: number, c: ColorInput, d = 1): void {
    const u = this.C(c);
    const sx = Math.round(cx) - this.OX;
    const sy = Math.round(cy) - this.OY;
    const R = r + 0.4;
    const R2 = R * R;
    for (let j = -Math.floor(R); j <= Math.floor(R); j++) {
      const h = Math.floor(Math.sqrt(R2 - j * j));
      this._span(sy + j, sx - h, sx + h, u, d);
    }
  }

  public oval(cx: number, cy: number, rx: number, ry: number, c: ColorInput, d = 1): void {
    if (rx < 0.5 && ry < 0.5) {
      this.px(cx, cy, c);
      return;
    }
    const u = this.C(c);
    const sx = Math.round(cx) - this.OX;
    const sy = Math.round(cy) - this.OY;
    const Ry = ry + 0.4;
    const Rx = rx + 0.4;
    for (let j = -Math.floor(Ry); j <= Math.floor(Ry); j++) {
      const t = 1 - (j / Ry) ** 2;
      if (t < 0) continue;
      const h = Math.floor(Rx * Math.sqrt(t));
      this._span(sy + j, sx - h, sx + h, u, d);
    }
  }

  public poly(pts: [number, number][], c: ColorInput, d = 1): void {
    const u = this.C(c);
    const n = pts.length;
    if (n < 3) return;
    const xs = new Array<number>(n);
    const ys = new Array<number>(n);
    let y0 = 1e9;
    let y1 = -1e9;
    for (let i = 0; i < n; i++) {
      xs[i] = Math.round(pts[i][0]) - this.OX;
      ys[i] = Math.round(pts[i][1]) - this.OY;
      if (ys[i] < y0) y0 = ys[i];
      if (ys[i] > y1) y1 = ys[i];
    }
    y0 = Math.max(y0, this.KY0);
    y1 = Math.min(y1, this.KY1 + 1);
    const hit: number[] = [];
    for (let y = y0; y < y1; y++) {
      const yc = y + 0.5;
      hit.length = 0;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const ya = ys[j];
        const yb = ys[i];
        if ((ya <= yc && yc < yb) || (yb <= yc && yc < ya)) {
          hit.push(xs[j] + ((yc - ya) * (xs[i] - xs[j])) / (yb - ya));
        }
      }
      hit.sort((a, b) => a - b);
      for (let k = 0; k + 1 < hit.length; k += 2) {
        this._span(y, Math.ceil(hit[k] - 0.5), Math.floor(hit[k + 1] - 0.5), u, d);
      }
    }
  }

  // ---------- Sprite passes with selective 1px auto-outlining ----------
  public beginSpr(): void {
    this.SPRM = true;
    this.PART = 1;
    this.PLINE.fill(0);
    this.BX0 = LW;
    this.BY0 = LH;
    this.BX1 = -1;
    this.BY1 = -1;
  }

  public part(ln = true): void {
    this.PART = Math.min(255, this.PART + 1);
    this.PLINE[this.PART] = ln ? 1 : 0;
  }

  public endSpr(
    o: {
      outline?: boolean;
      k?: number;
      inner?: number;
      tint?: [string, number] | null;
      z?: number;
      ax?: number;
      ay?: number;
      flash?: number;
    } = {}
  ): [number, number, number, number] | null {
    this.SPRM = false;
    if (this.BX1 < this.BX0) return null;
    const x0 = Math.max(0, this.BX0 - 1);
    const y0 = Math.max(0, this.BY0 - 1);
    const x1 = Math.min(LW - 1, this.BX1 + 1);
    const y1 = Math.min(LH - 1, this.BY1 + 1);
    const w = x1 - x0 + 1;
    const h = y1 - y0 + 1;
    const R = new Uint32Array(w * h);
    const ok = o.outline !== false;
    const ko = o.k ?? -2;
    const ki = o.inner ?? -2;
    const tint = o.tint === undefined ? this.P.charTint : o.tint;
    const tc = tint ? this.C(tint[0]) : 0;
    const tk = tint ? tint[1] : 0;

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * LW + x;
        const c = this.SB[i];
        let out = 0;
        if (c) {
          out = c;
          const id = this.SID[i];
          if (ki) {
            for (let q = 0; q < 4; q++) {
              const nx = x + (q === 0 ? -1 : q === 1 ? 1 : 0);
              const ny = y + (q === 2 ? -1 : q === 3 ? 1 : 0);
              if (nx < 0 || ny < 0 || nx >= LW || ny >= LH) continue;
              const j = ny * LW + nx;
              const nid = this.SID[j];
              if (this.SB[j] && nid > id && this.PLINE[nid]) {
                out = this.shade(this.SB[j], ki);
                break;
              }
            }
          }
        } else if (ok) {
          let nb = 0;
          if (y + 1 < LH && this.SB[i + LW]) nb = this.SB[i + LW];
          else if (x > 0 && this.SB[i - 1]) nb = this.SB[i - 1];
          else if (x + 1 < LW && this.SB[i + 1]) nb = this.SB[i + 1];
          else if (y > 0 && this.SB[i - LW]) nb = this.SB[i - LW];
          if (nb) out = this.shade(nb, ko);
        }
        if (out && tk) out = this.tintU(out, tc, tk);
        if (out && o.flash) out = this.tintU(out, 0xffffffff, o.flash);
        R[(y - y0) * w + (x - x0)] = out;
      }
    }

    for (let y = y0; y <= y1; y++) {
      this.SB.fill(0, y * LW + x0, y * LW + x1 + 1);
    }

    const z = Math.max(1, Math.round(o.z || 1));
    if (z === 1) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const c = R[y * w + x];
          if (c && x0 + x >= this.KX0 && x0 + x <= this.KX1 && y0 + y >= this.KY0 && y0 + y <= this.KY1) {
            this.FB[(y0 + y) * LW + x0 + x] = c;
          }
        }
      }
    } else {
      const ax = Math.round(o.ax ?? 0) - this.OX;
      const ay = Math.round(o.ay ?? 0) - this.OY;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const c = R[y * w + x];
          if (!c) continue;
          const X = ax + (x0 + x - ax) * z;
          const Y = ay + (y0 + y - ay) * z;
          for (let b = 0; b < z; b++) {
            for (let a = 0; a < z; a++) {
              const xx = X + a;
              const yy = Y + b;
              if (xx >= this.KX0 && xx <= this.KX1 && yy >= this.KY0 && yy <= this.KY1) {
                this.FB[yy * LW + xx] = c;
              }
            }
          }
        }
      }
    }
    return [x0 + this.OX, y0 + this.OY, w, h];
  }

  public spriteGrid(
    rows: string[],
    map: Record<string, string | null>,
    x: number,
    y: number,
    o: { ax?: number; ay?: number; flip?: boolean; z?: number } = {}
  ): void {
    const key = rows.join("\n");
    let parsed = this.spriteParseCache.get(key);
    if (!parsed) {
      parsed = { w: Math.max(...rows.map((l) => l.length)), h: rows.length, r: rows };
      this.spriteParseCache.set(key, parsed);
    }
    const z = o.z || 1;
    const fl = !!o.flip;
    const bx = Math.round(x - (o.ax ?? 0.5) * parsed.w * z);
    const by = Math.round(y - (o.ay ?? 1) * parsed.h * z);
    const cm: Record<string, number> = {};
    for (const k of Object.keys(map)) {
      const val = map[k];
      cm[k] = val ? this.C(val) : 0;
    }
    for (let j = 0; j < parsed.h; j++) {
      const l = parsed.r[j];
      for (let i = 0; i < l.length; i++) {
        const ch = l[i];
        if (ch === "." || ch === " " || !cm[ch]) continue;
        const ii = fl ? parsed.w - 1 - i : i;
        if (z === 1) this.px(bx + ii, by + j, cm[ch]);
        else this.rect(bx + ii * z, by + j * z, z, z, cm[ch]);
      }
    }
  }

  // ---------- Environment, Bayer Skies & Lighting ----------
  public sky(
    stops: string[] = this.P.sky,
    o: { y0?: number; y1?: number; soft?: number; par?: number } = {}
  ): void {
    const y0 = o.y0 ?? 0;
    const y1 = o.y1 ?? LH;
    const soft = o.soft ?? 0.55;
    const us = stops.map((c) => this.C(c));
    const n = us.length - 1;
    const oy = Math.round(this.CAMY * (o.par ?? 0));
    for (let y = 0; y < LH; y++) {
      const p = clamp((y + oy - y0) / (y1 - y0)) * n;
      const i = Math.min(n - 1, Math.floor(p));
      const f = p - i;
      const g = clamp((f - 0.5) / soft + 0.5);
      const row = y * LW;
      const by = ((y + oy) & 3) << 2;
      const a = us[i];
      const b = us[i + 1];
      if (g <= 0) this.FB.fill(a, row, row + LW);
      else if (g >= 1) this.FB.fill(b, row, row + LW);
      else {
        for (let x = 0; x < LW; x++) {
          this.FB[row + x] = BAY4[by | (x & 3)] < g ? b : a;
        }
      }
    }
  }

  public glow(
    x: number,
    y: number,
    r: number,
    c: ColorInput,
    k = 1,
    o: { bands?: number; pow?: number } = {}
  ): void {
    const u = this.C(c);
    const sx = Math.round(x) - this.OX;
    const sy = Math.round(y) - this.OY;
    const bands = o.bands ?? 4;
    const pw = o.pow ?? 1.3;
    for (let j = -r; j <= r; j++) {
      const yy = sy + j;
      if (yy < this.KY0 || yy > this.KY1) continue;
      const by = ((yy + this.OY) & 3) << 2;
      for (let i = -r; i <= r; i++) {
        const xx = sx + i;
        if (xx < this.KX0 || xx > this.KX1) continue;
        const d = Math.sqrt(i * i + j * j) / r;
        if (d >= 1) continue;
        const lv = Math.ceil(k * Math.pow(1 - d, pw) * bands) / bands;
        if (BAY4[by | ((xx + this.OX) & 3)] < lv) this._p(xx, yy, u);
      }
    }
  }

  public light(x: number, y: number, r: number, k = 1, o: { ry?: number } = {}): void {
    const sx = Math.round(x) - this.OX;
    const sy = Math.round(y) - this.OY;
    const ry = o.ry ?? r;
    for (let j = -ry; j <= ry; j++) {
      const yy = sy + j;
      if (yy < 0 || yy >= LH) continue;
      const by = ((yy + this.OY) & 3) << 2;
      for (let i = -r; i <= r; i++) {
        const xx = sx + i;
        if (xx < 0 || xx >= LW) continue;
        const d = Math.sqrt((i / r) ** 2 + (j / ry) ** 2);
        if (d >= 1) continue;
        const lv = Math.ceil(k * (1 - d) * 4) / 4;
        const n = Math.floor(lv) + (BAY4[by | ((xx + this.OX) & 3)] < lv - Math.floor(lv) ? 1 : 0);
        if (n > 0) {
          const ii = yy * LW + xx;
          this.FB[ii] = this.shade(this.FB[ii], Math.min(n, 2));
        }
      }
    }
  }

  public shadowAt(x: number, y: number, rx: number, ry = rx * 0.3, k = 1): void {
    const sx = Math.round(x) - this.OX;
    const sy = Math.round(y) - this.OY;
    for (let j = -Math.ceil(ry); j <= Math.ceil(ry); j++) {
      const yy = sy + j;
      if (yy < 0 || yy >= LH) continue;
      const by = ((yy + this.OY) & 3) << 2;
      for (let i = -Math.ceil(rx); i <= Math.ceil(rx); i++) {
        const xx = sx + i;
        if (xx < 0 || xx >= LW) continue;
        const d = (i / (rx + 0.4)) ** 2 + (j / (ry + 0.4)) ** 2;
        if (d > 1) continue;
        if (BAY4[by | ((xx + this.OX) & 3)] < k * (d < 0.55 ? 1 : 0.5)) {
          const ii = yy * LW + xx;
          this.FB[ii] = this.shade(this.FB[ii], -1);
        }
      }
    }
  }

  public footShadow(x: number, y: number, w = 11, lift = 0): void {
    this.shadowAt(x, y, Math.max(3, w - lift * 0.3), 2, 1);
  }

  public vignette(k = 0.45): void {
    for (let y = 0; y < LH; y++) {
      for (let x = 0; x < LW; x++) {
        const dx = (x - LW / 2) / (LW / 2);
        const dy = (y - LH / 2) / (LH / 2);
        const d = dx * dx * 0.75 + dy * dy * 0.85 - (1 - k * 0.55);
        if (d > 0 && BAY4[((y & 3) << 2) | (x & 3)] < d * 2.1) {
          const i = y * LW + x;
          this.FB[i] = this.shade(this.FB[i], -1);
        }
      }
    }
  }

  public sunDisc(
    x: number,
    y: number,
    r: number,
    o: { par?: number; moon?: boolean; halo?: boolean; cols?: string[] } = {}
  ): void {
    this.layer(o.par ?? 0);
    const s = o.cols || this.P.sun;
    if (o.halo !== false) {
      this.glow(x, y, Math.round(r * 3.0), s[0], 0.52);
      this.glow(x, y, Math.round(r * 1.8), s[1], 0.78);
    }
    this.disc(x, y, r, s[1]);
    this.disc(x - 1, y - 1, Math.max(1, r - 1), s[2]);
    if (o.moon) {
      this.disc(x + r * 0.35, y - r * 0.1, Math.max(1, r * 0.28), s[0]);
      this.disc(x - r * 0.3, y + r * 0.35, Math.max(1, r * 0.18), s[0]);
    }
    this.layer(1);
  }

  public stars(
    t: number,
    o: { n?: number; seed?: number; par?: number; y1?: number; cols?: string[] } = {}
  ): void {
    this.layer(o.par ?? 0.05, 0);
    const n = o.n ?? 70;
    const sd = o.seed ?? 1;
    const y1 = o.y1 ?? LH * 0.52;
    const cols = o.cols || this.P.cool;
    const ts = onStep(t, 6);
    const span = LW + 40;
    for (let i = 0; i < n; i++) {
      const wx = hash(i * 3.13 + sd) * span * 3;
      const sx = (((Math.round(wx - this.OX) % span) + span) % span) - 20;
      const sy = Math.round(hash(i * 7.77 + sd) * y1);
      const big = hash(i * 1.91 + sd) > 0.86;
      const tw = Math.sin(ts * (2 + hash(i) * 3) + i) > 0.55;
      const c = this.C(tw || big ? cols[1] : cols[0]);
      this._p(sx, sy, c);
      if (big && tw) {
        this._p(sx - 1, sy, this.C(cols[0]));
        this._p(sx + 1, sy, this.C(cols[0]));
        this._p(sx, sy - 1, this.C(cols[0]));
        this._p(sx, sy + 1, this.C(cols[0]));
      }
    }
    this.layer(1);
  }

  public clouds(
    t: number,
    o: { y?: number; dy?: number; n?: number; seed?: number; par?: number; speed?: number; size?: number } = {}
  ): void {
    const par = o.par ?? 0.25;
    this.layer(par, par * 0.5);
    const n = o.n ?? 4;
    const sd = o.seed ?? 3;
    const cols = this.P.cloud;
    const span = LW * 2.2;
    const sp = o.speed ?? 2.6;
    const sz = o.size ?? 1;
    for (let i = 0; i < n; i++) {
      const r = rnd(`cl${sd}_${i}`);
      const w = (24 + r() * 34) * sz;
      const cy = (o.y ?? 70) + (r() - 0.5) * (o.dy ?? 44);
      let cx = r() * span + t * sp * (0.6 + r() * 0.6);
      cx = ((((cx - this.OX + 80) % span) + span) % span) - 80 + this.OX;
      const bot = Math.round(cy + 5 * sz);
      const pf: [number, number, number][] = [];
      const k = 3 + Math.floor(r() * 3);
      for (let j = 0; j < k; j++) {
        const f = j / (k - 1);
        pf.push([
          cx - w / 2 + f * w,
          cy - Math.sin(f * Math.PI) * 6 * sz - r() * 3 * sz,
          (5 + Math.sin(f * Math.PI) * 7 + r() * 3) * sz,
        ]);
      }
      this.clip(-1e5, -1e5, 2e5, bot + 1e5 + 1);
      for (const [x, y, rr] of pf) this.disc(x + 1, y + 2, rr, cols[0]);
      for (const [x, y, rr] of pf) this.disc(x, y, rr, cols[1]);
      this.clip(-1e5, -1e5, 2e5, bot - 2 + 1e5 + 1);
      for (const [x, y, rr] of pf) this.disc(x - 2, y - 2, rr * 0.72, cols[2]);
      this.noclip();
      this.rect(cx - w / 2 - 5 * sz, bot - 1, w + 10 * sz, 1, cols[0], 0.5);
    }
    this.layer(1);
  }

  public city(
    base: number,
    o: { c?: string; win?: string; lit?: number; par?: number; seed?: number; hmin?: number; hmax?: number } = {}
  ): void {
    const par = o.par ?? 0.45;
    this.layer(par, par * 0.6);
    const cw = 18;
    const sd = o.seed ?? 7;
    const c = this.C(o.c || this.P.far[0]);
    const dk = this.shade(c, -1);
    const win = this.C(o.win || this.P.light[1]);
    const lit = o.lit ?? 0.3;
    const x0 = Math.floor((this.OX - 36) / cw);
    const x1 = Math.ceil((this.OX + LW + 36) / cw);
    for (let i = x0; i <= x1; i++) {
      const r = rnd(`bld${sd}_${i}`);
      const w = 11 + Math.floor(r() * 10);
      const h = (o.hmin ?? 24) + Math.floor(r() * r() * ((o.hmax ?? 95) - (o.hmin ?? 24)));
      const x = i * cw + Math.floor(r() * 5) - 2;
      const y = base - h;
      this.rect(x, y, w, h + 60, c);
      const roof = r();
      if (roof > 0.7) this.line(x + 3, y - 1, x + 3, y - 6 - r() * 6, c);
      else if (roof > 0.45) this.rect(x + 2, y - 3, w - 4, 3, c);
      else if (roof > 0.3) this.poly([[x, y], [x + w / 2, y - 5], [x + w, y]], c);
      for (let wy = y + 3; wy < base - 2; wy += 4) {
        for (let wx = x + 2; wx < x + w - 2; wx += 3) {
          const on = hash(i * 91 + wx * 7.1 + wy * 3.3 + sd) < lit;
          this.px(wx, wy, on ? win : dk);
          if (on) this.px(wx, wy + 1, win);
        }
      }
    }
    this.layer(1);
  }

  public rain(
    t: number,
    o: { n?: number; slant?: number; ground?: number; par?: number; c?: string; fps?: number } = {}
  ): void {
    this.layer(o.par ?? 0);
    const n = o.n ?? 120;
    const c = this.C(o.c || this.P.cool[1]);
    const c2 = this.shade(c, 1);
    const ts = onStep(t, o.fps ?? 24);
    const sl = o.slant ?? 2;
    const gy = o.ground;
    for (let i = 0; i < n; i++) {
      const sp = 250 + hash(i * 1.7) * 120;
      const span = LH + 30;
      const y = ((hash(i * 3.3) * span + ts * sp) % span) - 15;
      const x =
        ((((hash(i * 5.1) * (LW + 40) - (y * sl) / 4 - this.OX) % (LW + 40)) + LW + 40) % (LW + 40)) - 20;
      if (gy != null && y > gy - this.OY) {
        const a = (hash(i * 9.1) * 3 + ts * 12) % 3 | 0;
        if (a < 2) {
          this._p(Math.round(x) - 1 - a, gy - this.OY - 1 - a, c2);
          this._p(Math.round(x) + 1 + a, gy - this.OY - 1 - a, c2);
        }
        continue;
      }
      this.line(x + this.OX, y + this.OY, x + this.OX - sl, y + this.OY + 4, hash(i) > 0.7 ? c2 : c);
    }
    this.layer(1);
  }

  public snow(t: number, o: { n?: number; par?: number; c?: string; wind?: number } = {}): void {
    this.layer(o.par ?? 0.2);
    const n = o.n ?? 100;
    const c = this.C(o.c || "#e8f3ff");
    const ts = onStep(t, 12);
    const wd = o.wind ?? 18;
    for (let i = 0; i < n; i++) {
      const sp = 20 + hash(i * 1.7) * 26;
      const span = LH + 12;
      const y = ((hash(i * 3.3) * span + ts * sp) % span) - 6;
      const x =
        ((((hash(i * 5.1) * (LW + 24) + ts * wd + Math.sin(ts * 1.5 + i) * 6 - this.OX) % (LW + 24)) +
          LW +
          24) %
          (LW + 24)) -
        12;
      const big = hash(i * 7.3) > 0.75;
      this._p(Math.round(x), Math.round(y), c);
      if (big) {
        this._p(Math.round(x) + 1, Math.round(y), c);
        this._p(Math.round(x), Math.round(y) + 1, c);
      }
    }
    this.layer(1);
  }

  public petals(
    t: number,
    o: { n?: number; cols?: string[]; speedX?: number; speedY?: number; par?: number } = {}
  ): void {
    this.layer(o.par ?? 0.8);
    const n = o.n ?? 26;
    const cs = o.cols || [this.P.accent[2], this.P.light[1]];
    const ts = onStep(t, 12);
    const sx = o.speedX ?? 26;
    const sy = o.speedY ?? 15;
    for (let i = 0; i < n; i++) {
      const sp = sy + hash(i) * 14;
      const span = LH + 24;
      const y = ((hash(i * 3.3) * span + ts * sp) % span) - 12;
      const x =
        ((hash(i * 5.1) * (LW + 40) + ts * sx + Math.sin(ts * 2.2 + i) * 7) % (LW + 40)) - 20 + this.OX;
      const c = cs[i % cs.length];
      this.px(x, y + this.OY, c);
      if ((Math.floor(ts * 6) + i) % 3) this.px(x + 1, y + this.OY, this.shade(c, -1));
    }
    this.layer(1);
  }

  public sparkles(
    t: number,
    x: number,
    y: number,
    w: number,
    h: number,
    o: { n?: number; c?: string; c2?: string; seed?: number; period?: number } = {}
  ): void {
    const n = o.n ?? 6;
    const c = o.c || this.P.light[2];
    const c2 = o.c2 || this.P.light[1];
    const ts = onStep(t, 12);
    const sd = o.seed ?? 1;
    const per = o.period ?? 0.7;
    for (let i = 0; i < n; i++) {
      const ph = hash(i * 1.37 + sd) * per;
      const cyc = Math.floor((ts + ph) / per);
      const a = ((ts + ph) % per) / per;
      const r = rnd(`sp${sd}${i}_${cyc}`);
      const sx = x + r() * w;
      const sy = y + r() * h;
      const f = Math.floor(a * 7);
      if (f > 5) continue;
      const s = [0, 1, 2, 3, 2, 1][f];
      this.px(sx, sy, s >= 2 ? c : c2);
      for (let k = 1; k <= s; k++) {
        const cc = k === s ? c2 : c;
        this.px(sx - k, sy, cc);
        this.px(sx + k, sy, cc);
        this.px(sx, sy - k, cc);
        this.px(sx, sy + k, cc);
      }
    }
  }

  // ---------- Pixel Transitions ----------
  public dissolve(k: number, c: ColorInput = this.P.ink): void {
    if (k <= 0) return;
    const u = this.C(c);
    if (k >= 1) {
      this.FB.fill(u);
      return;
    }
    for (let y = 0; y < LH; y++) {
      const r = (y & 7) << 3;
      const row = y * LW;
      for (let x = 0; x < LW; x++) {
        if (BAY8[r | (x & 7)] < k) this.FB[row + x] = u;
      }
    }
  }

  public iris(
    k: number,
    x: number,
    y: number,
    o: { c?: ColorInput; shape?: "circle" | "diamond" | "square"; edge?: number } = {}
  ): void {
    if (k <= 0) return;
    const u = this.C(o.c || this.P.ink);
    const sx = Math.round(x) - this.OX;
    const sy = Math.round(y) - this.OY;
    const sh = o.shape || "circle";
    const [vx, vy, vw, vh] = this.viewRect();
    const far =
      Math.max(Math.hypot(Math.max(sx - vx, vx + vw - sx), Math.max(sy - vy, vy + vh - sy)), 1) *
      (sh === "diamond" ? 1.45 : 1);
    const R = far * (1 - ease(k));
    const e = o.edge ?? 4;
    for (let py = 0; py < LH; py++) {
      for (let px_ = 0; px_ < LW; px_++) {
        const dx = px_ - sx;
        const dy = py - sy;
        const d =
          sh === "diamond"
            ? Math.abs(dx) + Math.abs(dy)
            : sh === "square"
              ? Math.max(Math.abs(dx), Math.abs(dy) * 1.4)
              : Math.sqrt(dx * dx + dy * dy);
        const v = (d - R) / e;
        if (v > 1 || (v > 0 && BAY4[((py & 3) << 2) | (px_ & 3)] < v)) {
          this.FB[py * LW + px_] = u;
        }
      }
    }
  }

  private viewRect(): [number, number, number, number, number] {
    return this.PUNCH
      ? [this.PUNCH.sx, this.PUNCH.sy, LW / this.PUNCH.z, LH / this.PUNCH.z, this.PUNCH.z]
      : [0, 0, LW, LH, 1];
  }

  public diamonds(
    k: number,
    o: { c?: ColorInput; size?: number; dir?: "right" | "left" | "down" | "up" | "center" } = {}
  ): void {
    if (k <= 0) return;
    const [vx, vy, vw, vh, z] = this.viewRect();
    const u = this.C(o.c || this.P.ink);
    const s = (o.size ?? 18) / z;
    const dir = o.dir || "right";
    const sp = 0.9;
    for (let y = vy; y < vy + vh; y++) {
      for (let x = vx; x < vx + vw; x++) {
        const lx = x - vx;
        const ly = y - vy;
        const cx = Math.floor(lx / s);
        const cy = Math.floor(ly / s);
        const gx = (cx + 0.5) * s;
        const gy = (cy + 0.5) * s;
        const f =
          dir === "right"
            ? gx / vw
            : dir === "left"
              ? 1 - gx / vw
              : dir === "down"
                ? gy / vh
                : dir === "up"
                  ? 1 - gy / vh
                  : Math.hypot(gx - vw / 2, gy - vh / 2) / Math.hypot(vw / 2, vh / 2);
        const loc = clamp(k * (1 + sp) - f * sp);
        const d = (Math.abs(lx + 0.5 - gx) + Math.abs(ly + 0.5 - gy)) / s;
        if (loc > 0 && d <= loc + 0.001) this.FB[y * LW + x] = u;
      }
    }
  }

  public crossDither(k: number, drawA: () => void, drawB: () => void): void {
    drawA();
    this.FB2.set(this.FB);
    drawB();
    for (let y = 0; y < LH; y++) {
      const r = (y & 7) << 3;
      const row = y * LW;
      for (let x = 0; x < LW; x++) {
        if (BAY8[r | (x & 7)] >= k) this.FB[row + x] = this.FB2[row + x];
      }
    }
  }

  // ---------- Emote bubbles ----------
  public emote(kind: string, x: number, y: number, o: { age?: number; bubble?: boolean; bg?: string } = {}): void {
    const age = o.age ?? 1;
    const f = Math.floor(onStep(age, 12) * 12);
    if (age < 0) return;
    x = Math.round(x);
    y = Math.round(y);
    if (f < 1) {
      this.beginSpr();
      const c = "#fff8e8";
      this.px(x + 4, y - 6, c);
      this.px(x + 2, y - 8, c);
      this.px(x + 6, y - 8, c);
      this.px(x + 4, y - 10, c);
      this.endSpr({ tint: null });
      return;
    }
    const EMO_ART: Record<string, string[]> = {
      "!": [".kk.", ".kk.", ".kk.", ".kk.", "....", ".kk."],
      "?": [".kkk.", "kk.kk", "...kk", "..kk.", "..k..", ".....", "..k.."],
      heart: [".rr.rr.", "rwrrrrr", "rrrrrrr", ".rrrrr.", "..rrr..", "...r..."],
      sweat: ["..b..", "..b..", ".bbb.", "bbbbb", "bwbbb", ".bbb."],
      dots: [".......", ".......", ".......", "k..k..k"],
    };
    const EMO_COL = { k: "#2a1f3a", r: "#e8485c", w: "#ffffff", b: "#70c4f8" };
    const art = EMO_ART[kind] || EMO_ART["!"];
    const bw = Math.max(11, art[0].length + 6);
    const bh = art.length + 6;
    const bob = f < 2 ? -3 : f < 3 ? -1 : 0;
    const bx = x;
    const by = y - bh - 3 + bob;
    this.beginSpr();
    if (o.bubble !== false) {
      const wc = o.bg || "#fff8e8";
      this.rect(bx + 1, by, bw - 2, bh, wc);
      this.rect(bx, by + 1, bw, bh - 2, wc);
      this.poly([[bx + 2, by + bh - 1], [bx + 7, by + bh - 1], [bx + 1, by + bh + 3]], wc);
      this.part(false);
      this.rect(bx + 1, by + bh - 1, bw - 2, 1, this.shade(wc, -1));
    }
    this.part(false);
    this.spriteGrid(art, EMO_COL, bx + Math.floor(bw / 2), by + 3 + art.length, { ax: 0.5, ay: 1, z: 1 });
    this.endSpr({ tint: null, k: -3 });
  }

  // ---------- Crisp Zpix Chinese Pixel Text Rasterizer (Overlay at 1080x1920) ----------
  public pxGlyphImg(
    s: string,
    o: { fg?: string; ol?: string; sh?: string; fs?: number } = {}
  ): { canvas: HTMLCanvasElement; w: number; h: number } {
    const fs = o.fs ?? 24;
    const fgHex = o.fg || "#f5efe6";
    const olHex = o.ol || "#121324";
    const shHex = o.sh || "#080912";
    const key = `${s}|${fs}|${fgHex}|${olHex}|${shHex}`;
    const cached = this.txCache.get(key);
    if (cached) return cached;

    const X = this.txx;
    const pad = 2;
    X.clearRect(0, 0, this.txc.width, this.txc.height);
    X.textBaseline = "alphabetic";
    X.fillStyle = "#ffffff";
    X.font = `${fs}px "Zpix", "PingFang SC", "Noto Sans SC", monospace`;
    X.fillText(s, pad, pad + Math.round(fs * 0.85));

    const w = Math.max(4, Math.ceil(X.measureText(s).width + pad * 2));
    const h = fs + pad * 2 + 2;
    const id = X.getImageData(0, 0, w, h);
    const d = id.data;
    const m = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      m[i] = d[i * 4 + 3] > 105 ? 1 : 0;
    }

    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    const cx = cv.getContext("2d");
    if (!cx) throw new Error("Failed to get glyph canvas context");
    const oi = cx.createImageData(w, h);
    const od = new Uint32Array(oi.data.buffer);
    const fg = this.C(fgHex);
    const ol = this.C(olHex);
    const sh = this.C(shHex);

    for (let y = 0; y < h; y++) {
      for (let xx = 0; xx < w; xx++) {
        const i = y * w + xx;
        if (m[i]) {
          od[i] = fg;
          continue;
        }
        let n = 0;
        for (let b = -1; b <= 1; b++) {
          for (let a = -1; a <= 1; a++) {
            const x2 = xx + a;
            const y2 = y + b;
            if (x2 >= 0 && y2 >= 0 && x2 < w && y2 < h && m[y2 * w + x2]) n = 1;
          }
        }
        if (n) od[i] = ol;
        else if (y > 1 && xx > 0 && m[(y - 2) * w + xx - 1]) od[i] = sh;
      }
    }
    cx.putImageData(oi, 0, 0);
    const res = { canvas: cv, w, h };
    this.txCache.set(key, res);
    return res;
  }

  public pxText(
    ctx: CanvasRenderingContext2D,
    s: string,
    x: number,
    y: number,
    o: { k?: number; align?: "center" | "left" | "right"; fg?: string; ol?: string; sh?: string; fs?: number } = {}
  ): number {
    const k = o.k ?? 2;
    const im = this.pxGlyphImg(s, o);
    const w = im.w * k;
    const xx = o.align === "left" ? x : o.align === "right" ? x - w : x - w / 2;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(im.canvas, Math.round(xx / k) * k, Math.round(y / k) * k, w, im.h * k);
    ctx.restore();
    return w;
  }
}
