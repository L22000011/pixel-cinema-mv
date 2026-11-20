export interface RGB {
  r: number;
  g: number;
  b: number;
}

export const INK = "#151320";

export const CHAR_PALETTE = {
  ink: "#151320",
  inkSoft: "#262338",
  // Skin ramp (warm nostalgic daylight)
  skinHi: "#fce3d2",
  skinMid: "#f2c6ac",
  skinSh: "#d99d82",
  blush: "#ea888d",
  // Boy (Lin Chen) - fluffy dark-brown hair, navy blazer, white shirt, striped tie, grey trousers, navy bag
  boyHairDark: "#2d1d18",
  boyHairMid: "#472f26",
  boyHairHi: "#694638",
  boyEye: "#221e2e",
  blazerDark: "#1c2335",
  blazerMid: "#29344d",
  blazerHi: "#3a496b",
  shirtHi: "#f3f5fb",
  shirtSh: "#cfd6e8",
  tieDark: "#2a3140",
  tieLight: "#7f8aa0",
  trouserDark: "#2f343f",
  trouserMid: "#424857",
  trouserHi: "#565e70",
  bagDark: "#161d2b",
  bagMid: "#232e42",
  goldBtn: "#dfb15b",
  shoeDark: "#3d2219",
  shoeMid: "#5b3528",
  // Girl (Su Qing) - silky blue-black hair, sailor uniform, twin white collar lines, red ribbon, pleated skirt
  girlHairDark: "#121521",
  girlHairMid: "#20273b",
  girlHairHi: "#35415e",
  girlEye: "#1e2238",
  sailorDark: "#1a2234",
  sailorMid: "#27334c",
  sailorHi: "#374768",
  ribbonDark: "#85222c",
  ribbonMid: "#b5333f",
  ribbonHi: "#dc515d",
  sockHi: "#f1f4fb",
  sockSh: "#c8d0e3",
  // Shared props (pearl-white umbrella)
  umbCanopyHi: "#eef4ff",
  umbCanopyMid: "#cbd9ee",
  umbCanopySh: "#99accb",
  umbHandle: "#d8dee9",
  // Catchlights & rim
  white: "#ffffff",
  sunsetRim: "#ffd28a",
} as const;

export type MoodId =
  | "clear_breeze"
  | "sudden_rain"
  | "heavy_rain"
  | "rain_window_wait"
  | "clearing_window"
  | "after_rain_sunbeam"
  | "golden_sunset"
  | "dusk_wind_drift"
  | "evening_lamp_rain"
  | "farewell_night_rain";

export interface ScenePalette {
  skyTop: string;
  skyMid: string;
  skyBot: string;
  cloudHi: string;
  cloudSh: string;
  farHill: string;
  farBldg: string;
  farBldgWin: string;
  treeDark: string;
  treeMid: string;
  treeHi: string;
  groundHi: string;
  groundMid: string;
  groundSh: string;
  accent: string;
  rainColor: string;
  tintOverlay: string;
}

export const MOOD_PALETTES: Record<MoodId, ScenePalette> = {
  clear_breeze: {
    skyTop: "#5a9ae0",
    skyMid: "#8cc3f2",
    skyBot: "#d2ecfc",
    cloudHi: "#ffffff",
    cloudSh: "#b8d4ee",
    farHill: "#84a4c4",
    farBldg: "#7287a6",
    farBldgWin: "#b8d5ef",
    treeDark: "#24473d",
    treeMid: "#396d53",
    treeHi: "#619e6e",
    groundHi: "#d4cec2",
    groundMid: "#b7b0a5",
    groundSh: "#8d8782",
    accent: "#f7b5c8", // cherry blossom / spring breeze petals
    rainColor: "#a6ccf0",
    tintOverlay: "rgba(255, 245, 220, 0.04)",
  },
  sudden_rain: {
    skyTop: "#36455c",
    skyMid: "#53657e",
    skyBot: "#7d8ea3",
    cloudHi: "#94a3b8",
    cloudSh: "#4a5970",
    farHill: "#445368",
    farBldg: "#394558",
    farBldgWin: "#7e95b0",
    treeDark: "#1c3335",
    treeMid: "#2c4d49",
    treeHi: "#426c5f",
    groundHi: "#6b778a",
    groundMid: "#525c6e",
    groundSh: "#394152",
    accent: "#b7d4ee",
    rainColor: "#c2dbf5",
    tintOverlay: "rgba(50, 75, 110, 0.14)",
  },
  heavy_rain: {
    skyTop: "#273347",
    skyMid: "#3c4c63",
    skyBot: "#5c6d82",
    cloudHi: "#75859c",
    cloudSh: "#344157",
    farHill: "#303d52",
    farBldg: "#283244",
    farBldgWin: "#677c96",
    treeDark: "#15282c",
    treeMid: "#213c3e",
    treeHi: "#325752",
    groundHi: "#546073",
    groundMid: "#3e4859",
    groundSh: "#2b3242",
    accent: "#a5c4e6",
    rainColor: "#d1e6fc",
    tintOverlay: "rgba(32, 52, 84, 0.22)",
  },
  rain_window_wait: {
    skyTop: "#495d78",
    skyMid: "#697e99",
    skyBot: "#93a8bf",
    cloudHi: "#aec0d4",
    cloudSh: "#5d718c",
    farHill: "#485a73",
    farBldg: "#3d4d63",
    farBldgWin: "#869db8",
    treeDark: "#213c3a",
    treeMid: "#345950",
    treeHi: "#4f7c6b",
    groundHi: "#b89674", // classroom wood tone
    groundMid: "#8c694b",
    groundSh: "#5d4330",
    accent: "#e2eaf5",
    rainColor: "#c6dcf5",
    tintOverlay: "rgba(45, 65, 95, 0.10)",
  },
  clearing_window: {
    skyTop: "#5582b8",
    skyMid: "#88b2db",
    skyBot: "#cce2f5",
    cloudHi: "#f5f9ff",
    cloudSh: "#9bb7d4",
    farHill: "#6586a8",
    farBldg: "#597494",
    farBldgWin: "#b8d6f0",
    treeDark: "#24473c",
    treeMid: "#3b6e56",
    treeHi: "#649e74",
    groundHi: "#cca882",
    groundMid: "#9c7856",
    groundSh: "#664a35",
    accent: "#fff0c2",
    rainColor: "#c2ddf7",
    tintOverlay: "rgba(255, 240, 210, 0.05)",
  },
  after_rain_sunbeam: {
    skyTop: "#4b8fd9",
    skyMid: "#7ec0f2",
    skyBot: "#d8f0ff",
    cloudHi: "#ffffff",
    cloudSh: "#b4d4f0",
    farHill: "#6e99c2",
    farBldg: "#607d9e",
    farBldgWin: "#d1ebff",
    treeDark: "#234a3c",
    treeMid: "#3c7858",
    treeHi: "#70b376",
    groundHi: "#d9d4c7",
    groundMid: "#b5b0a6",
    groundSh: "#858482",
    accent: "#fff2ba",
    rainColor: "#d9eeff",
    tintOverlay: "rgba(255, 245, 200, 0.06)",
  },
  golden_sunset: {
    skyTop: "#49477d",
    skyMid: "#c76868",
    skyBot: "#f7bc6f",
    cloudHi: "#ffe7ad",
    cloudSh: "#b85c6c",
    farHill: "#6e4b6e",
    farBldg: "#523a59",
    farBldgWin: "#ffb975",
    treeDark: "#2b2438",
    treeMid: "#4d3545",
    treeHi: "#8f514f",
    groundHi: "#c98569",
    groundMid: "#8f5a53",
    groundSh: "#543740",
    accent: "#ffd98e",
    rainColor: "#ffcf96",
    tintOverlay: "rgba(255, 165, 90, 0.10)",
  },
  dusk_wind_drift: {
    skyTop: "#363563",
    skyMid: "#995367",
    skyBot: "#e09569",
    cloudHi: "#ffcfa1",
    cloudSh: "#8a4a63",
    farHill: "#523b5e",
    farBldg: "#3d2d4a",
    farBldgWin: "#eb9e67",
    treeDark: "#221e33",
    treeMid: "#3c2c42",
    treeHi: "#6e444e",
    groundHi: "#9e6b63",
    groundMid: "#704a4f",
    groundSh: "#452e3a",
    accent: "#f7b388",
    rainColor: "#f0b899",
    tintOverlay: "rgba(180, 100, 95, 0.12)",
  },
  evening_lamp_rain: {
    skyTop: "#14182b",
    skyMid: "#1e2742",
    skyBot: "#2c3a5c",
    cloudHi: "#37466b",
    cloudSh: "#1a2138",
    farHill: "#182036",
    farBldg: "#141a2e",
    farBldgWin: "#f5c26b",
    treeDark: "#121b2b",
    treeMid: "#1c2b3d",
    treeHi: "#2b4254",
    groundHi: "#4c546e",
    groundMid: "#32384d",
    groundSh: "#1f2336",
    accent: "#ffd57a",
    rainColor: "#9ab5db",
    tintOverlay: "rgba(18, 26, 48, 0.18)",
  },
  farewell_night_rain: {
    skyTop: "#101424",
    skyMid: "#182036",
    skyBot: "#25314f",
    cloudHi: "#2f3d5e",
    cloudSh: "#151b2e",
    farHill: "#141b2e",
    farBldg: "#111626",
    farBldgWin: "#ebb460",
    treeDark: "#0f1726",
    treeMid: "#182536",
    treeHi: "#25384a",
    groundHi: "#41485e",
    groundMid: "#2b3042",
    groundSh: "#191c2b",
    accent: "#f7c974",
    rainColor: "#8faad1",
    tintOverlay: "rgba(14, 20, 40, 0.24)",
  },
};

export const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(t: number): number {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
}

/** Draw an integer pixel rectangle cleanly without antialiasing. */
export function pxRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
): void {
  const ix = Math.round(x);
  const iy = Math.round(y);
  const iw = Math.round(w);
  const ih = Math.round(h);
  if (iw <= 0 || ih <= 0) return;
  ctx.fillStyle = color;
  ctx.fillRect(ix, iy, iw, ih);
}

export function pxDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  size = 1
): void {
  pxRect(ctx, x, y, size, size, color);
}

/** Ordered 4x4 Bayer dithered sky/gradient band between three crisp colors. */
export function drawBayerSky(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  topCol: string,
  midCol: string,
  botCol: string
): void {
  pxRect(ctx, 0, 0, w, h, midCol);
  const topEnd = Math.floor(h * 0.48);
  const botStart = Math.floor(h * 0.42);
  // Top -> Mid dither
  ctx.fillStyle = topCol;
  for (let y = 0; y < topEnd; y++) {
    const ratio = y / topEnd;
    if (ratio < 0.38) {
      ctx.fillRect(0, y, w, 1);
      continue;
    }
    const row = BAYER4[y & 3];
    const thresh = (ratio - 0.38) / 0.62;
    for (let x = 0; x < w; x++) {
      if (row[x & 3] / 16 > thresh) {
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  // Mid -> Bot dither
  ctx.fillStyle = botCol;
  const botSpan = h - botStart;
  for (let y = botStart; y < h; y++) {
    const ratio = (y - botStart) / Math.max(1, botSpan);
    if (ratio > 0.72) {
      ctx.fillRect(0, y, w, 1);
      continue;
    }
    const row = BAYER4[y & 3];
    const thresh = ratio / 0.72;
    for (let x = 0; x < w; x++) {
      if (row[x & 3] / 16 < thresh) {
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
}

export function drawPixelEllipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: string
): void {
  const icx = Math.round(cx);
  const icy = Math.round(cy);
  const irx = Math.max(1, Math.round(rx));
  const iry = Math.max(1, Math.round(ry));
  ctx.fillStyle = color;
  for (let dy = -iry; dy <= iry; dy++) {
    const nx = Math.sqrt(Math.max(0, 1 - (dy * dy) / (iry * iry)));
    const span = Math.round(irx * nx);
    if (span > 0) {
      ctx.fillRect(icx - span, icy + dy, span * 2, 1);
    }
  }
}

export function drawPixelLine(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  thickness = 1
): void {
  let ix0 = Math.round(x0);
  let iy0 = Math.round(y0);
  const ix1 = Math.round(x1);
  const iy1 = Math.round(y1);
  const dx = Math.abs(ix1 - ix0);
  const dy = Math.abs(iy1 - iy0);
  const sx = ix0 < ix1 ? 1 : -1;
  const sy = iy0 < iy1 ? 1 : -1;
  let err = dx - dy;
  ctx.fillStyle = color;
  while (true) {
    ctx.fillRect(ix0, iy0, thickness, thickness);
    if (ix0 === ix1 && iy0 === iy1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      ix0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      iy0 += sy;
    }
  }
}
