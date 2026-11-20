export type Facing = "right" | "left";

export interface CharacterRenderState {
  role: "boy" | "girl";
  /** World anchor foot X in destination canvas pixels (integer) */
  footX: number;
  /** World anchor foot Y in destination canvas pixels (integer) */
  footY: number;
  facing: Facing;
  pose: string;
  expression: string;
  prop: string;
  handTarget: string;
  /** Sprite height multiplier (1.0 => cellSize=2, 1.3 => cellSize=3, 1.75 => cellSize=4) */
  scale: number;
  /** Continuous cycle 0..1 */
  stepPhase: number;
  /** Continuous wind strength 0..1 */
  wind: number;
  /** 12fps animation tick */
  animTick: number;
  /** Whether eye blink is active */
  blinking: boolean;
  /** Sunset rim strength 0..1 */
  sunsetRim: number;
  /** Misty glass tint when Boy is outside corridor behind window */
  behindGlass?: boolean;
  /** Opacity 0..1 */
  opacity?: number;
}

const GRID_W = 56;
const GRID_H = 62;
const ORIGIN_X = 28;
const FOOT_Y = 58;

const PALETTE: Record<string, string> = {
  O: "#151320", // crisp dark outline
  // Skin + expression
  S: "#FCE3D2", // skin light
  s: "#E5B79B", // skin shadow
  C: "#F08592", // rose cheek blush
  E: "#1B2136", // pupil/eye iris
  W: "#FFFFFF", // pure white catchlight / shirt / socks
  Q: "#9D5E58", // soft mouth / lip tone
  // Boy (Lin Chen)
  H: "#3B251E", // dark brown hair
  h: "#5B3B2B", // mid chestnut hair
  L: "#7D543D", // hair top highlight
  B: "#28354D", // navy blazer mid
  b: "#1B2436", // navy blazer shadow
  T: "#8B98AE", // silver tie light
  t: "#4C586E", // tie stripe shadow
  Y: "#DFB15B", // gold buttons
  P: "#3E4554", // charcoal-grey trousers
  p: "#2A2F3B", // trouser shadow
  K: "#1A2133", // messenger bag dark / strap
  G: "#354359", // messenger bag flap highlight
  M: "#5B3726", // brown loafers
  m: "#3D2218", // loafer shadow
  // Girl (Su Qing)
  J: "#151A29", // black hair shadow
  j: "#252F47", // black hair mid
  k: "#3D4C70", // black hair glossy band
  N: "#21304E", // sailor navy mid
  n: "#152038", // sailor pleated shadow
  R: "#D84252", // crimson bow
  r: "#9E2A38", // crimson bow shadow
  // Umbrella
  u: "#EDF6FF", // umbrella canopy highlight
  U: "#B7DCF5", // umbrella canopy mid
  d: "#82A9CA", // umbrella canopy shadow
  X: "#A3B8CF", // shaft/handle metal
  // Sunset gold rim accent
  Z: "#FFD28A",
};

class SpriteGrid {
  cells: (string | null)[];

  constructor() {
    this.cells = new Array<string | null>(GRID_W * GRID_H).fill(null);
  }

  get(x: number, y: number): string | null {
    if (x < 0 || x >= GRID_W || y < 0 || y >= GRID_H) return null;
    return this.cells[y * GRID_W + x];
  }

  set(x: number, y: number, ch: string | null): void {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || ix >= GRID_W || iy < 0 || iy >= GRID_H) return;
    this.cells[iy * GRID_W + ix] = ch;
  }

  rect(x: number, y: number, w: number, h: number, ch: string): void {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        this.set(x + dx, y + dy, ch);
      }
    }
  }

  /** Draw a clean 1-cell #151320 pixel outline around every opaque pixel group. */
  applyOutline(): void {
    const snapshot = this.cells.slice();
    for (let y = 1; y < GRID_H - 1; y++) {
      for (let x = 1; x < GRID_W - 1; x++) {
        const idx = y * GRID_W + x;
        if (snapshot[idx] === null) {
          if (
            snapshot[idx - 1] !== null ||
            snapshot[idx + 1] !== null ||
            snapshot[idx - GRID_W] !== null ||
            snapshot[idx + GRID_W] !== null
          ) {
            this.cells[idx] = "O";
          }
        }
      }
    }
  }

  /** Optional sunset rim highlight along the sun-facing edge just inside outline. */
  applySunsetRim(dir: number, strength: number): void {
    if (strength < 0.15) return;
    const snap = this.cells.slice();
    for (let y = 14; y < FOOT_Y - 4; y++) {
      for (let x = 2; x < GRID_W - 2; x++) {
        const idx = y * GRID_W + x;
        const c = snap[idx];
        if (c && c !== "O" && c !== "U" && c !== "u" && c !== "d" && c !== "X") {
          const outer = snap[idx + dir];
          if (outer === "O") {
            this.cells[idx] = "Z";
          }
        }
      }
    }
  }

  /** Flip horizontally around ORIGIN_X if facing left. */
  mirrorXIfNeeded(facing: Facing): void {
    if (facing === "right") return;
    const copy = this.cells.slice();
    this.cells.fill(null);
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const val = copy[y * GRID_W + x];
        if (val !== null) {
          const mx = ORIGIN_X * 2 - x;
          if (mx >= 0 && mx < GRID_W) {
            this.cells[y * GRID_W + mx] = val;
          }
        }
      }
    }
  }
}

function drawSteppedUmbrella(
  g: SpriteGrid,
  cx: number,
  topY: number,
  handX: number,
  handY: number,
  isWide: boolean
): void {
  const rad = isWide ? 16 : 12;
  // Shaft from canopy center down to hand
  for (let y = topY + 2; y <= handY; y++) {
    g.set(cx, y, "X");
  }
  if (Math.abs(handX - cx) > 0) {
    const step = handX > cx ? 1 : -1;
    for (let x = Math.min(cx, handX); x <= Math.max(cx, handX); x++) {
      g.set(x, handY, "X");
    }
    void step;
  }
  // Curved pixel dome silhouette
  const rows = [
    { dy: 0, span: Math.round(rad * 0.28), hi: true },
    { dy: 1, span: Math.round(rad * 0.55), hi: true },
    { dy: 2, span: Math.round(rad * 0.78), hi: false },
    { dy: 3, span: Math.round(rad * 0.92), hi: false },
    { dy: 4, span: rad, hi: false },
    { dy: 5, span: rad, hi: false },
  ];
  for (const r of rows) {
    for (let dx = -r.span; dx <= r.span; dx++) {
      let col = "U";
      if (r.hi || (r.dy <= 3 && dx < 0 && dx > -r.span + 2)) {
        col = "u";
      } else if (r.dy === 5 || dx > r.span - 3) {
        col = "d";
      }
      g.set(cx + dx, topY + r.dy, col);
    }
  }
  // Scalloped lower rim nibs
  g.set(cx - rad, topY + 6, "d");
  g.set(cx, topY + 6, "d");
  g.set(cx + rad, topY + 6, "d");
  // Umbrella tip finial
  g.set(cx, topY - 1, "X");
}

function drawFaceGrid(
  g: SpriteGrid,
  cx: number,
  headTopY: number,
  role: "boy" | "girl",
  expression: string,
  blinking: boolean
): void {
  const browColor = role === "boy" ? "H" : "J";
  const eyeColor = "E";
  const skinBase = "S";

  // Clear crisp skin block for face area (width 11, height 10) below bangs!
  g.rect(cx - 5, headTopY + 5, 11, 9, skinBase);
  // Chin taper & soft side jaw shading
  g.set(cx - 5, headTopY + 13, null);
  g.set(cx + 5, headTopY + 13, null);
  g.set(cx - 5, headTopY + 12, "s");
  g.rect(cx - 4, headTopY + 13, 8, 1, "s");
  g.rect(cx - 3, headTopY + 13, 6, 1, skinBase);
  // Subtle ear on left back side of 3/4 head
  g.rect(cx - 6, headTopY + 8, 1, 3, "s");

  // Eyebrows at row headTopY + 6 (well clear above eyes at +7..+9!)
  const sad =
    expression.includes("sad") ||
    expression.includes("look_down") ||
    expression.includes("worry") ||
    expression.includes("wistful");
  const happy = expression.includes("smile") || expression.includes("hopeful") || expression.includes("surprise");
  const by = headTopY + (happy ? 5 : 6);
  if (sad) {
    g.set(cx - 3, by, browColor);
    g.set(cx - 2, by + 1, browColor);
    g.set(cx + 2, by + 1, browColor);
    g.set(cx + 3, by, browColor);
  } else {
    g.rect(cx - 3, by, 2, 1, browColor);
    g.rect(cx + 2, by, 2, 1, browColor);
  }

  // Crisp Anime-RPG 2x3 Eyes at rows +7..+9 (back eye x=cx-3..cx-2, front eye x=cx+2..cx+3)
  const ey = headTopY + 7;
  if (blinking) {
    g.rect(cx - 3, ey + 1, 2, 1, "O");
    g.rect(cx + 2, ey + 1, 2, 1, "O");
  } else {
    // Left (back) eye
    g.rect(cx - 3, ey, 2, 3, eyeColor);
    g.set(cx - 3, ey, "W"); // luminous pixel catchlight!
    // Right (front) eye
    g.rect(cx + 2, ey, 2, 3, eyeColor);
    g.set(cx + 2, ey, "W"); // luminous pixel catchlight!
  }

  // Rose Blush cheeks (+10 row)
  if (
    role === "girl" ||
    expression === "blush_smile" ||
    expression === "warm_smile" ||
    expression === "soft_smile"
  ) {
    g.rect(cx - 4, ey + 3, 2, 1, "C");
    g.rect(cx + 3, ey + 3, 2, 1, "C");
  }

  // Expressive pixel mouth at row +11..+12
  const my = headTopY + 11;
  if (
    expression === "warm_smile" ||
    expression === "blush_smile" ||
    expression === "soft_smile" ||
    expression === "hopeful_smile" ||
    expression === "wistful_smile" ||
    expression === "bittersweet_smile" ||
    expression === "sad_smile"
  ) {
    g.set(cx, my + 1, "Q");
    g.set(cx + 1, my + 1, "Q");
    g.set(cx - 1, my, "Q");
    g.set(cx + 2, my, "Q");
  } else if (expression.includes("surprise")) {
    g.rect(cx, my, 2, 2, "Q");
  } else if (expression === "sad" || expression === "look_down" || expression === "surprised_worry") {
    g.rect(cx, my + 1, 2, 1, "Q");
  } else {
    g.rect(cx, my, 2, 1, "Q");
  }
}

function buildBoyGrid(st: CharacterRenderState): SpriteGrid {
  const g = new SpriteGrid();
  const walkStep = Math.floor(st.stepPhase * 4) % 4;
  const isWalking =
    st.pose === "walk" ||
    st.pose === "reach_hand_walk" ||
    st.pose === "look_up_walk" ||
    st.pose === "walk_corridor_behind_glass" ||
    st.pose === "walk_look_back";
  const bob = isWalking && walkStep % 2 === 1 ? -1 : !isWalking && st.animTick % 12 >= 6 ? -1 : 0;
  const headPitch =
    st.pose === "look_up_walk" ? -1 : st.pose === "stand_watch_fade" || st.pose === "look_look_down" ? 1 : 0;

  const windShift = Math.round(Math.sin(st.animTick * 0.5) * (st.wind > 0.4 ? 1 : 0));
  const cx = ORIGIN_X;
  const hy = 18 + bob + headPitch;

  // --- 1. Crossbody Messenger Bag behind left hip ---
  if (st.prop === "bag") {
    const bagY = 40 + bob;
    const bagSw = isWalking ? (walkStep === 0 ? -1 : walkStep === 2 ? 1 : 0) : 0;
    g.rect(cx - 9 + bagSw, bagY, 4, 7, "K");
    g.rect(cx - 8 + bagSw, bagY + 1, 2, 2, "G");
  }

  // --- 2. Legs & Loafers (rows 43..57) ---
  const legTop = 43 + bob;
  if (!isWalking) {
    // Natural relaxed standing stance
    g.rect(cx - 4, legTop, 4, 12, "p");
    g.rect(cx + 1, legTop, 4, 12, "P");
    g.rect(cx - 4, FOOT_Y - 3, 5, 2, "m");
    g.rect(cx + 1, FOOT_Y - 3, 5, 2, "M");
  } else if (walkStep === 0) {
    // Wide stride A
    g.rect(cx - 5, legTop, 4, 7, "p");
    g.rect(cx - 6, legTop + 6, 4, 6, "p");
    g.rect(cx - 6, FOOT_Y - 3, 5, 2, "m");
    g.rect(cx + 1, legTop, 4, 7, "P");
    g.rect(cx + 2, legTop + 6, 4, 5, "P");
    g.rect(cx + 2, FOOT_Y - 4, 5, 2, "M");
  } else if (walkStep === 2) {
    // Opposite wide stride B
    g.rect(cx - 2, legTop, 4, 7, "p");
    g.rect(cx - 1, legTop + 6, 4, 5, "p");
    g.rect(cx - 1, FOOT_Y - 4, 5, 2, "m");
    g.rect(cx + 1, legTop, 4, 7, "P");
    g.rect(cx - 3, legTop + 6, 4, 6, "P");
    g.rect(cx - 3, FOOT_Y - 3, 5, 2, "M");
  } else {
    // Passing mid-stride with -1px bob
    g.rect(cx - 3, legTop, 3, 12, "p");
    g.rect(cx + 1, legTop, 3, 12, "P");
    g.rect(cx - 3, FOOT_Y - 3, 4, 2, "m");
    g.rect(cx + 1, FOOT_Y - 3, 4, 2, "M");
  }

  // --- 3. Torso: Navy Blazer, White Shirt, Striped Tie, Gold Buttons (rows 33..43) ---
  const ty = 33 + bob;
  g.rect(cx - 5, ty, 10, 11, "B");
  // Blazer shadow side
  g.rect(cx - 5, ty + 1, 2, 10, "b");
  // White shirt V + diagonal striped grey tie
  g.rect(cx - 1, ty, 4, 4, "W");
  g.set(cx + 1, ty + 1, "t");
  g.rect(cx + 1, ty + 2, 1, 5, "T");
  g.set(cx + 1, ty + 3, "t");
  g.set(cx + 1, ty + 5, "t");
  // 2 Gold blazer buttons
  g.set(cx + 2, ty + 6, "Y");
  g.set(cx + 2, ty + 8, "Y");
  // Crossbody strap diagonally across chest
  for (let d = 0; d < 8; d++) {
    g.set(cx + 3 - d, ty + d, "K");
  }

  // --- 4. Head & Hair (rows hy..hy+14) ---
  // Back hair & crown volume
  g.rect(cx - 6, hy + 1, 13, 11, "h");
  g.rect(cx - 7, hy + 3, 2, 7, "H"); // back hair lock behind ear
  // Hair crown shine
  g.rect(cx - 4, hy + 2, 7, 2, "L");
  // Playful anime ahoge cowlick shifting in breeze
  g.rect(cx - 1 + windShift, hy - 1, 2, 2, "H");
  g.set(cx + windShift, hy - 2, "h");

  // Face skin & crisp facial features
  drawFaceGrid(g, cx, hy, "boy", st.expression, st.blinking);

  // Fluffy parted brown front bangs ending cleanly at headTopY+4 (NEVER covering brows/eyes!)
  g.rect(cx - 6, hy + 2, 13, 3, "h");
  g.set(cx - 6, hy + 5, "H");
  g.set(cx - 5, hy + 5, "h");
  g.set(cx - 1, hy + 5, "h");
  g.set(cx + 1, hy + 5, "H");
  g.set(cx + 5, hy + 5, "h");
  g.set(cx + 6, hy + 5, "H");

  // --- 5. Arms & Props ---
  let handX = cx - 4;
  let handY = ty + 8;

  if (st.pose === "reach_hand_walk") {
    // Reach arm gently right toward Girl!
    g.rect(cx - 6, ty + 1, 2, 7, "b"); // back arm
    g.rect(cx - 6, ty + 8, 2, 2, "S");
    g.rect(cx + 3, ty + 3, 6, 2, "B"); // reaching sleeve
    g.rect(cx + 9, ty + 3, 2, 2, "S"); // reaching warm pixel hand!
    handX = cx + 9;
    handY = ty + 3;
  } else if (st.pose === "shield_rain") {
    // Raised sleeve shielding brow from rain
    g.rect(cx + 4, ty - 2, 2, 5, "B");
    g.rect(cx + 4, hy + 4, 2, 2, "S");
    handX = cx + 4;
    handY = hy + 4;
  } else if (st.pose === "hold_umbrella_close") {
    // Extended arm holding shared umbrella overhead
    g.rect(cx + 4, ty - 4, 2, 8, "B");
    g.rect(cx + 5, ty - 4, 2, 2, "S");
    handX = cx + 5;
    handY = ty - 4;
    drawSteppedUmbrella(g, handX + 6, hy - 14, handX, handY, true);
  } else if (isWalking) {
    const swing = walkStep === 0 ? 2 : walkStep === 2 ? -2 : 0;
    // Back arm behind blazer
    g.rect(cx - 6 - Math.sign(swing), ty + 1, 2, 7, "b");
    g.rect(cx - 6 - Math.sign(swing), ty + 8, 2, 2, "S");
    // Front swinging sleeve
    g.rect(cx - 2 + swing, ty + 2, 3, 6, "B");
    g.rect(cx - 2 + swing, ty + 8, 2, 2, "S");
    handX = cx - 2 + swing;
    handY = ty + 8;
  } else {
    g.rect(cx - 6, ty + 1, 2, 7, "b");
    g.rect(cx - 6, ty + 8, 2, 2, "S");
    g.rect(cx + 3, ty + 2, 2, 6, "B");
    g.rect(cx + 3, ty + 8, 2, 2, "S");
    handX = cx + 3;
    handY = ty + 8;
  }

  g.applyOutline();
  g.applySunsetRim(1, st.sunsetRim);
  g.mirrorXIfNeeded(st.facing);

  return g;
}

function buildGirlGrid(st: CharacterRenderState): SpriteGrid {
  const g = new SpriteGrid();
  const isSitting = st.pose === "sit_desk_gaze";
  const walkStep = Math.floor(st.stepPhase * 4) % 4;
  const isWalking =
    st.pose === "walk" ||
    st.pose === "glance_shy_walk" ||
    st.pose === "umbrella_walk" ||
    st.pose === "walk_away_wind" ||
    (st.pose === "wave_then_walk_away" && st.stepPhase > 0.48);

  const bob = isSitting
    ? 6
    : isWalking && walkStep % 2 === 1
    ? -1
    : !isWalking && st.animTick % 12 >= 6
    ? -1
    : 0;
  const headPitch = st.pose === "look_up_sky" ? -1 : st.pose === "look_down" ? 1 : 0;
  const hairWind = Math.round((st.wind * 2.2 + Math.sin(st.animTick * 0.55) * 1.1));

  const cx = ORIGIN_X;
  const hy = 18 + bob + headPitch;
  const ty = 33 + bob;

  // --- 1. Long Silky Flowing Back Hair behind body (rows hy+3..ty+10) ---
  g.rect(cx - 8 - Math.min(2, hairWind), hy + 3, 5, 16, "J");
  g.rect(cx - 9 - Math.max(0, hairWind), ty + 2, 4, 8, "j");
  g.rect(cx - 7, hy + 11, 3, 10, "j");

  // --- 2. Legs, White Socks, Brown Loafers ---
  const legTop = 47 + bob;
  if (isSitting) {
    // Seated lower calves + white socks + loafers tucked forward under desk
    g.rect(cx - 2, FOOT_Y - 9, 2, 4, "S");
    g.rect(cx + 2, FOOT_Y - 9, 2, 4, "s");
    g.rect(cx - 2, FOOT_Y - 5, 2, 2, "W");
    g.rect(cx + 2, FOOT_Y - 5, 2, 2, "W");
    g.rect(cx - 2, FOOT_Y - 3, 3, 2, "M");
    g.rect(cx + 2, FOOT_Y - 3, 3, 2, "m");
  } else if (!isWalking) {
    g.rect(cx - 3, legTop, 2, 5, "s");
    g.rect(cx + 1, legTop, 2, 5, "S");
    g.rect(cx - 3, legTop + 5, 2, 3, "W");
    g.rect(cx + 1, legTop + 5, 2, 3, "W");
    g.rect(cx - 3, FOOT_Y - 3, 4, 2, "m");
    g.rect(cx + 1, FOOT_Y - 3, 4, 2, "M");
  } else if (walkStep === 0) {
    g.rect(cx - 4, legTop, 2, 5, "s");
    g.rect(cx - 4, legTop + 5, 2, 3, "W");
    g.rect(cx - 4, FOOT_Y - 3, 4, 2, "m");
    g.rect(cx + 2, legTop, 2, 4, "S");
    g.rect(cx + 3, legTop + 4, 2, 3, "W");
    g.rect(cx + 3, FOOT_Y - 4, 4, 2, "M");
  } else if (walkStep === 2) {
    g.rect(cx + 2, legTop, 2, 5, "s");
    g.rect(cx + 2, legTop + 5, 2, 3, "W");
    g.rect(cx + 2, FOOT_Y - 3, 4, 2, "m");
    g.rect(cx - 4, legTop, 2, 4, "S");
    g.rect(cx - 4, legTop + 4, 2, 3, "W");
    g.rect(cx - 4, FOOT_Y - 4, 4, 2, "M");
  } else {
    g.rect(cx - 2, legTop, 2, 5, "s");
    g.rect(cx + 1, legTop, 2, 5, "S");
    g.rect(cx - 2, legTop + 5, 2, 3, "W");
    g.rect(cx + 1, legTop + 5, 2, 3, "W");
    g.rect(cx - 2, FOOT_Y - 3, 3, 2, "m");
    g.rect(cx + 1, FOOT_Y - 3, 3, 2, "M");
  }

  // --- 3. Sailor Uniform + Double White Collar Stripes + Crimson Ribbon Bow + Pleated Skirt ---
  g.rect(cx - 4, ty, 9, 8, "N");
  g.rect(cx - 4, ty + 1, 2, 7, "n");
  // Sailor collar V with white dual stripes
  g.rect(cx - 2, ty, 6, 3, "n");
  g.rect(cx - 2, ty + 2, 6, 1, "W");
  g.rect(cx - 1, ty + 1, 4, 1, "W");
  // Vivid Crimson Ribbon Bow
  g.rect(cx, ty + 3, 4, 2, "R");
  g.set(cx + 1, ty + 3, "r");
  g.set(cx, ty + 5, "r");
  g.set(cx + 2, ty + 5, "r");

  // Pleated Skirt (flaring nicely with stride / wind!)
  const flare = isWalking && walkStep % 2 === 0 ? 1 : st.wind > 0.65 ? 1 : 0;
  g.rect(cx - 5 - flare, ty + 8, 11 + flare * 2, 7, "N");
  // Alternating vertical pleats
  for (let px = cx - 4; px <= cx + 4; px += 2) {
    g.rect(px, ty + 9, 1, 6, "n");
  }

  // --- 4. Head & Silky Hime-Cut Bangs ---
  g.rect(cx - 6, hy + 1, 13, 11, "j");
  // Crisp hair sheen highlights
  g.rect(cx - 4, hy + 2, 8, 1, "k");
  g.rect(cx - 3, hy + 3, 4, 1, "k");

  // Face skin & expressive eyes/blush/mouth
  drawFaceGrid(g, cx, hy, "girl", st.expression, st.blinking);

  // Hime bangs cleanly ending at headTopY+4 ABOVE eyebrows!
  g.rect(cx - 6, hy + 2, 13, 3, "j");
  g.rect(cx - 6, hy + 5, 2, 12, "J"); // cheek-framing long left hime lock
  g.rect(cx + 5, hy + 5, 2, 11, "j"); // cheek-framing right hime lock (strictly outside right eye!)

  // --- 5. Arms & Umbrella / Acting Poses ---
  let handX = cx - 1;
  let handY = ty + 8;

  if (st.pose === "sit_desk_gaze") {
    // Chin rested softly on hand over classroom desk
    g.rect(cx + 2, ty + 3, 2, 6, "N");
    g.rect(cx + 2, hy + 11, 2, 3, "S");
    handX = cx + 2;
    handY = hy + 11;
  } else if (st.pose === "open_umbrella" || st.pose === "umbrella_walk") {
    g.rect(cx - 6, ty + 1, 2, 7, "n");
    g.rect(cx - 6, ty + 8, 2, 2, "S");
    g.rect(cx + 4, ty - 2, 2, 6, "N");
    g.rect(cx + 4, ty - 3, 2, 2, "S");
    handX = cx + 4;
    handY = ty - 3;
    drawSteppedUmbrella(g, handX, hy - 12, handX, handY, false);
  } else if (st.pose === "wave_then_walk_away" && st.stepPhase <= 0.48) {
    const waveOffset = Math.sin(st.animTick * 1.1) > 0 ? 1 : 0;
    g.rect(cx - 6, ty + 1, 2, 7, "n");
    g.rect(cx - 6, ty + 8, 2, 2, "S");
    // Raised waving sleeve & bright small hand above head!
    g.rect(cx + 4, ty - 4, 2, 6, "N");
    g.rect(cx + 5 + waveOffset, hy + 3, 2, 2, "S");
    handX = cx + 5 + waveOffset;
    handY = hy + 3;
    if (st.prop === "open_umbrella") {
      drawSteppedUmbrella(g, cx, hy - 12, cx - 5, ty + 2, false);
    }
  } else if (st.pose === "glance_shy_walk" || st.pose === "lean_close_under_umbrella") {
    // Gently reaching hand toward Boy!
    g.rect(cx + 3, ty + 3, 5, 2, "N");
    g.rect(cx + 8, ty + 3, 2, 2, "S");
    handX = cx + 8;
    handY = ty + 3;
  } else if (isWalking) {
    const swing = walkStep === 0 ? 2 : walkStep === 2 ? -2 : 0;
    g.rect(cx - 5 - Math.sign(swing), ty + 1, 2, 7, "n");
    g.rect(cx - 5 - Math.sign(swing), ty + 8, 2, 2, "S");
    g.rect(cx - 1 + swing, ty + 2, 3, 6, "N");
    g.rect(cx - 1 + swing, ty + 8, 2, 2, "S");
    handX = cx - 1 + swing;
    handY = ty + 8;
    if (st.prop === "open_umbrella") {
      drawSteppedUmbrella(g, handX + 1, hy - 12, handX, handY, false);
    }
  } else {
    g.rect(cx - 5, ty + 1, 2, 7, "n");
    g.rect(cx - 5, ty + 8, 2, 2, "S");
    g.rect(cx + 3, ty + 2, 2, 6, "N");
    g.rect(cx + 3, ty + 8, 2, 2, "S");
    handX = cx + 3;
    handY = ty + 8;
  }

  // Folded blue-white umbrella hanging cleanly from hand when standing/walking
  if (st.prop === "folded_umbrella" && !isSitting) {
    g.rect(handX, handY - 1, 2, 1, "X");
    g.rect(handX, handY + 1, 2, 11, "U");
    g.rect(handX + 1, handY + 1, 1, 10, "u");
    g.set(handX, handY + 12, "X");
  }

  g.applyOutline();
  g.applySunsetRim(1, st.sunsetRim);
  g.mirrorXIfNeeded(st.facing);

  return g;
}

export function renderCharacterToContext(
  destCtx: CanvasRenderingContext2D,
  st: CharacterRenderState
): { handWorldX: number; handWorldY: number } {
  const grid = st.role === "boy" ? buildBoyGrid(st) : buildGirlGrid(st);
  // Crisp integer sprite cell size:
  // medium_wide (1.0) => 2px/cell (~78px tall = 29% of 270px)
  // medium (1.15-1.28) => 3px/cell (~117px tall = 43% of 270px)
  // closeup (1.55-1.78) => 4px/cell (~156px tall = 58% of 270px)
  const cellSize = Math.max(2, Math.round(2.15 * st.scale));
  const originLeft = Math.round(st.footX - ORIGIN_X * cellSize);
  const originTop = Math.round(st.footY - FOOT_Y * cellSize);

  destCtx.save();
  if (st.behindGlass) {
    destCtx.globalAlpha = 0.62;
  } else if (st.opacity !== undefined) {
    destCtx.globalAlpha = Math.max(0, Math.min(1, st.opacity));
  }

  for (let y = 0; y < GRID_H; y++) {
    let x = 0;
    while (x < GRID_W) {
      const ch = grid.cells[y * GRID_W + x];
      if (!ch || !PALETTE[ch]) {
        x += 1;
        continue;
      }
      // Run-length horizontal span batching for super fast crisp rendering!
      let runEnd = x + 1;
      while (runEnd < GRID_W && grid.cells[y * GRID_W + runEnd] === ch) {
        runEnd += 1;
      }
      destCtx.fillStyle = PALETTE[ch];
      destCtx.fillRect(
        originLeft + x * cellSize,
        originTop + y * cellSize,
        (runEnd - x) * cellSize,
        cellSize
      );
      x = runEnd;
    }
  }

  destCtx.restore();

  const dir = st.facing === "right" ? 1 : -1;
  return {
    handWorldX: Math.round(st.footX + dir * 8 * cellSize),
    handWorldY: Math.round(st.footY - 21 * cellSize),
  };
}
