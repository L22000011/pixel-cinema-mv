import {
  ARM,
  PROPS,
  act,
  drawBoy,
  drawGirl,
  type CharacterOpts,
} from "./CastEngine";
import {
  BAY4,
  LH,
  LW,
  PixelFB,
  clamp,
  ease,
  easeIn,
  easeOut,
  frac,
  hash,
  lerp,
  onStep,
  qd,
  seg,
  shakeXY,
  st,
} from "./PixelFB";
import timelineData from "../data/lyrics_timeline.json";

export interface LyricChar {
  char: string;
  at: number;
}

export interface LyricCue {
  index: number;
  start: number;
  end: number;
  text: string;
  note: string;
  chars: LyricChar[];
}

export const LYRICS: LyricCue[] = (timelineData as { lyrics: LyricCue[] }).lyrics;

// Scene boundaries (exact alignment with Whisper-synced Jay Chou vocals on 43.0s..139.0s)
export const T_S1_END = 28.75; // Scene 1: midnight_desk (0.00s - 28.75s)
export const T_S2_END = 51.50; // Scene 2: amber_memory (28.75s - 51.50s)
export const T_S3_END = 57.70; // Scene 3: rainy_cafe_window (51.50s - 57.70s)
export const T_S4_END = 90.20; // Scene 4: rain_street_breakdown (57.70s - 90.20s)
export const T_END = 96.00;    // Scene 5: dawn_overpass (90.20s - 96.00s)

// =========================================================================
// SCENE 1: MIDNIGHT DESK & RAINY WINDOW (0.00s - 28.75s)
// =========================================================================
function drawScene1(fb: PixelFB, t: number, allowPunch = true): void {
  fb.pal("midnight");
  const s = st(t);
  // Steady cinematic push/pan so integer pixel camera steps occur >2x/sec (prevents dead_gap)
  const camX = t < 2.60 ? lerp(144, 136, seg(t, 0, 2.60)) : lerp(136, 120, seg(t, 2.60, 28.75)) + Math.sin(t * 2.1) * 1.2;
  const camY = lerp(235, 246, seg(t, 0, 28.75));
  const [shx, shy] = t >= 26.88 && t < 27.25 ? shakeXY(t, 2) : [0, 0];
  fb.camAt(camX + shx, camY + shy);

  // Room back wall with warm wooden wainscoting
  fb.fill("#11172b");
  fb.rect(0, 0, LW, 232, "#151c33");
  for (let x = 10; x < LW; x += 24) {
    fb.rect(x, 0, 2, 232, "#12182d");
  }
  fb.rect(0, 232, LW, 58, "#1b1420");
  fb.rect(0, 232, LW, 2, "#32222c");

  // Tall bedroom window (clipped exterior night city & rain)
  const wx = 44;
  const wy = 44;
  const ww = 182;
  const wh = 162;
  fb.rect(wx - 4, wy - 4, ww + 8, wh + 8, "#0c1020");
  fb.rect(wx - 2, wy - 2, ww + 4, wh + 4, "#242e4d");

  fb.clip(wx, wy, ww, wh);
  fb.sky(fb.P.sky, { y0: wy, y1: wy + wh, soft: 0.5 });
  fb.stars(t, { n: 26, y1: wy + 75, seed: 3 });
  fb.sunDisc(wx + 142, wy + 34, 9, { moon: true, halo: true });
  fb.city(wy + wh - 10, { c: "#0f172e", lit: 0.25, hmin: 22, hmax: 68, seed: 9, par: 0 });
  // Rain strictly clipped outside window glass
  fb.rain(t, { n: 110, slant: 2, par: 0, c: "#7aa4d4" });
  for (let i = 0; i < 20; i++) {
    const dx = wx + 8 + ((i * 29 + Math.floor(hash(i) * 19)) % (ww - 16));
    const dy = wy + ((hash(i * 5.7) * wh + onStep(t, 8) * (9 + (i % 4) * 2)) % wh);
    fb.line(dx, dy, dx, dy + 3, "#9cc2e8");
  }
  fb.noclip();

  // Window mullions & sill
  fb.rect(wx + ww / 2 - 2, wy, 4, wh, "#1e2742");
  fb.rect(wx, wy + Math.round(wh * 0.55), ww, 3, "#1e2742");
  fb.rect(wx - 6, wy + wh, ww + 12, 5, "#332229");
  fb.rect(wx - 6, wy + wh + 5, ww + 12, 2, "#19111a");

  // Swaying left & right curtains
  const sway = Math.round(Math.sin(onStep(t, 6) * 2.1) * 1.5);
  fb.poly(
    [
      [wx - 4, wy - 2],
      [wx + 22 + sway, wy - 2],
      [wx + 16 + sway * 1.5, wy + wh + 4],
      [wx - 4, wy + wh + 4],
    ],
    "#1c2647",
    0.85
  );
  fb.poly(
    [
      [wx + ww + 4, wy - 2],
      [wx + ww - 22 - sway, wy - 2],
      [wx + ww - 16 - sway * 1.5, wy + wh + 4],
      [wx + ww + 4, wy + wh + 4],
    ],
    "#1c2647",
    0.85
  );
  fb.rect(wx - 10, wy - 6, ww + 20, 3, "#362530");

  // Floorboards below desk
  fb.rect(0, 290, LW, LH - 290, "#100c16");
  for (let y = 302; y < LH; y += 22) {
    fb.rect(0, y, LW, 1, "#1c1524");
  }

  // Wall clock subtly ticking
  fb.disc(240, 96, 10, "#293354");
  fb.disc(240, 96, 8, "#d4d8e4");
  const secAng = -Math.PI / 2 + (Math.floor(t) % 60) * ((Math.PI * 2) / 60);
  fb.line(240, 96, 240 + Math.cos(secAng) * 5, 96 + Math.sin(secAng) * 5, "#8e253e");
  fb.line(240, 96, 240 + 3, 96 - 2, "#1a1f36");

  // Boy seated on wooden chair: lowered deskY=278 & raised boyY=298 so face + chin + arms stay 100% clear above desk!
  const boyX = 114;
  const boyY = 298;
  fb.rect(boyX - 18, boyY - 40, 6, 26, "#3a252a");
  fb.rect(boyX - 20, boyY - 17, 26, 4, "#472f34");
  fb.rect(boyX - 19, boyY - 13, 3, 14, "#29191d");
  fb.rect(boyX + 1, boyY - 13, 3, 14, "#29191d");

  const boyFace = act(t, [
    { t: 0.0, face: "thinking", look: [1, 0], take: 0 },
    { t: 2.6, face: "sad", look: [1, 1], take: 0.5 },
    { t: 15.3, face: "melancholy", look: [1, 1], take: 0.3 },
    { t: 26.88, face: "surprised", look: [1, 1], take: 0.9, emote: "!" },
    { t: 27.9, face: "sad", look: [1, 1], emote: null, take: 0.4 },
  ]);

  let arm: [number, number] = [ARM.low, -0.35];
  let bend: [number, number] = [0.2, 0.55];
  let holdRight: CharacterOpts["hold"] = [null, null];

  if (t < 2.2) {
    const wr = t < 1.6 ? Math.sin(s * 12) * 0.1 : 0;
    arm = [ARM.low, -0.25 + wr];
    holdRight = [null, (hx, hy) => PROPS.pen(fb, hx, hy, -0.5 + wr)];
  } else if (t >= 2.6 && t < 8.4) {
    const pull = ease(seg(t, 3.8, 5.4));
    arm = [-0.25, lerp(-0.3, 0.25, pull)];
    bend = [0.4, 0.5];
    if (t >= 4.0 && t < 7.8) {
      holdRight = [null, (hx, hy) => PROPS.letter(fb, hx + 2, hy, false, false)];
    }
  } else if (t >= 8.4 && t < 19.1) {
    const breath = Math.sin(t * 1.8) * 0.08;
    arm = [-0.35 + breath, -0.4 - breath];
    bend = [0.35, 0.45];
  } else if (t >= 19.1 && t < 23.2) {
    const fold = Math.sin(seg(t, 19.3, 22.8) * Math.PI * 3) * 0.18;
    arm = [-0.2 + fold, -0.2 - fold];
    holdRight = [null, (hx, hy) => PROPS.letter(fb, hx + 2, hy, t > 21.0, false)];
  } else if (t >= 23.2 && t < 26.85) {
    const reach = ease(seg(t, 23.4, 25.5));
    arm = [-0.3, lerp(-0.2, 0.15, reach)];
    holdRight = [null, (hx, hy) => PROPS.whiteRose(fb, hx + 2, hy + 1, -1.1)];
  } else if (t >= 26.88) {
    arm = [-0.4, -0.5];
  }

  fb.footShadow(boyX, boyY, 13);
  drawBoy(fb, boyX, boyY, {
    ...boyFace,
    t: s,
    view: "q",
    posture: "sit",
    arm,
    bend,
    scarf: false,
    hold: holdRight,
    seed: 1,
  });

  // Wooden Desk foreground (deskY = 278: sits at waist/forearm level, NEVER covers face!)
  const deskY = 278;
  fb.rect(58, deskY, 168, 7, "#472e32");
  fb.rect(58, deskY, 168, 2, "#6e4b4f");
  fb.rect(62, deskY + 7, 160, 4, "#291a20");
  fb.rect(66, deskY + 11, 8, 36, "#24171c");
  fb.rect(208, deskY + 11, 8, 36, "#24171c");

  // Desk items: Warm Amber Lamp on right
  const lx = 196;
  const ly = deskY;
  fb.rect(lx - 7, ly - 3, 14, 3, "#2a314a");
  fb.line(lx, ly - 3, lx + 3, ly - 24, "#3b4566", 2);
  fb.line(lx + 3, ly - 24, lx - 6, ly - 32, "#3b4566", 2);
  fb.poly([[lx - 15, ly - 24], [lx - 9, ly - 35], [lx + 1, ly - 35], [lx + 4, ly - 24]], "#e69b45");
  fb.rect(lx - 11, ly - 25, 12, 2, "#fff4cb");

  // Soft warm amber glow cone under lamp
  const lampPulse = 0.34 + 0.04 * Math.sin(t * 2.4);
  fb.glow(lx - 6, ly - 16, 44, "#e69b45", lampPulse, { bands: 3, pow: 1.5 });
  fb.light(158, deskY - 12, 52, 0.52, { ry: 38 });
  fb.sparkles(t, 142, deskY - 30, 56, 26, { n: 8, seed: 12, period: 0.55, c: "#ffd278", c2: "#fff4cb" });

  // Desk props: Notebook, White Rose in glass vase, Letter/Returned Envelope
  fb.rect(128, deskY - 2, 22, 3, "#dcd2c4");
  if (t < 23.2) {
    fb.rect(166, deskY - 12, 7, 12, "#4c749e");
    fb.rect(168, deskY - 11, 3, 9, "#8eb8e0");
    PROPS.whiteRose(fb, 169, deskY - 12, -1.4);
  } else {
    fb.rect(166, deskY - 12, 7, 12, "#4c749e");
  }

  // Torn paper scraps falling to floor (`5.5s - 14.8s`)
  if (t >= 5.5 && t < 15.0) {
    for (let i = 0; i < 6; i++) {
      const dt = t - (5.5 + i * 0.42);
      if (dt < 0) continue;
      const p = clamp(dt / 2.2);
      const px_ = 132 + Math.sin(dt * 4 + i * 2) * 14 + i * 4;
      const py_ = lerp(deskY - 10, 304 + (i % 3) * 3, easeOut(p));
      fb.rect(px_, py_, 4, 3, i % 2 ? "#f5efe6" : "#d4d8e4");
    }
  }

  // Returned red-stamped envelope dropping onto desk at 26.88s ("你将爱退回")
  if (t >= 26.88) {
    const dt = t - 26.88;
    const ey = dt < 0.25 ? lerp(deskY - 48, deskY - 3, easeIn(dt / 0.25)) : deskY - 3;
    PROPS.letter(fb, 142, ey, true, true);
    if (dt >= 0.25) {
      for (let i = 0; i < 5; i++) {
        const dp = clamp((dt - 0.25) / 1.4);
        const rx = 142 + (i - 2) * 11 * dp + Math.sin(dt * 3 + i) * 2;
        const ry = lerp(deskY - 4, deskY + 24 + (i % 2) * 5, dp);
        fb.rect(rx, ry, 2, 2, "#f5efe6");
      }
    }
  }

  fb.vignette(0.42);

  // Punch-in medium close-up (`2.60s - 8.40s`) centered cleanly on face + desk
  if (allowPunch && t >= 2.60 && t < 8.40) {
    fb.punch(2, 132, 254);
  }

  fb.screenSpace();
  if (t < 0.5) fb.dissolve(1 - seg(t, 0, 0.5), "#060812");
}

// =========================================================================
// SCENE 2: AMBER AUTUMN MEMORY STREET (18.00s - 28.80s)
// =========================================================================
function drawAutumnTree(fb: PixelFB, x: number, y: number, seed: number, t: number): void {
  const sw = Math.round(Math.sin(onStep(t, 4) * 1.8 + seed) * 1);
  fb.beginSpr();
  fb.poly([[x - 3, y], [x - 5, y + 1], [x - 2, y - 34], [x + 2, y - 34], [x + 4, y + 1], [x + 2, y]], "#4a282c");
  fb.line(x - 1, y - 22, x - 12, y - 38, "#4a282c", 2);
  fb.line(x + 1, y - 26, x + 11, y - 40, "#4a282c", 2);
  fb.part();
  const blobs: [number, number, number][] = [
    [x - 14 + sw, y - 44, 12],
    [x + 14 + sw, y - 43, 11],
    [x - 6 + sw, y - 54, 14],
    [x + 8 + sw, y - 52, 13],
    [x + sw, y - 45, 14],
  ];
  for (const [bx, by, r] of blobs) fb.oval(bx, by + 2, r, r * 0.82, "#7d3833");
  for (const [bx, by, r] of blobs) fb.oval(bx - 1, by - 1, r * 0.9, r * 0.72, "#bd5c42");
  for (const [bx, by, r] of blobs) fb.oval(bx - 3, by - 4, r * 0.45, r * 0.34, "#eb9654");
  fb.endSpr({ tint: null });
}

function drawScene2(fb: PixelFB, t: number, allowPunch = true): void {
  fb.pal("dusk");
  const s = st(t);
  const lt = t - T_S1_END;
  const camX = lt < 13.5 ? lerp(128, 150, seg(lt, 0, 13.5)) : lerp(150, 126, seg(lt, 13.5, 22.75));
  fb.camAt(camX, 240);

  fb.sky(fb.P.sky, { soft: 0.55, par: 0.2, y0: 0, y1: 310 });
  fb.sunDisc(212, 128, 16, { par: 0.15 });
  fb.clouds(t, { y: 82, n: 4, par: 0.2, speed: 3.5 });
  fb.city(284, { c: fb.P.far[0], lit: 0.35, hmin: 20, hmax: 72, par: 0.38, seed: 12 });

  // Park railing & organic layered autumn trees
  fb.layer(0.75);
  fb.rect(-40, 276, 360, 10, "#4a2e42");
  fb.rect(-40, 286, 360, 40, "#362033");
  for (let x = -20; x < 340; x += 28) {
    fb.rect(x, 260, 4, 20, "#3b2338");
  }
  fb.rect(-40, 262, 360, 2, "#694156");
  for (let i = 0; i < 5; i++) {
    drawAutumnTree(fb, 20 + i * 68, 276, i + 1, t);
  }
  fb.layer(1);

  // Sidewalk ground
  const gy = 318;
  fb.rect(-40, gy, 360, LH - gy + 40, "#2f2238");
  fb.rect(-40, gy, 360, 3, "#875356");
  for (let x = -20; x < 340; x += 32) {
    fb.line(x, gy + 4, x - 12, gy + 58, "#45304d");
  }

  // Streetlamp on left casting warm halo
  fb.rect(48, gy - 134, 4, 134, "#24192e");
  fb.rect(45, gy - 136, 10, 4, "#663c48");
  fb.rect(44, gy - 148, 12, 12, "#ffd072");
  fb.glow(50, gy - 142, 26, "#ff964f", 0.28, { bands: 3 });

  const girlLeave = walkToGirl(lt);
  if (girlLeave.x < 310) {
    fb.footShadow(girlLeave.x, gy, 11);
    drawGirl(fb, girlLeave.x, gy, {
      t: s,
      view: lt < 6.5 ? "q" : "side",
      flip: lt < 6.5 ? true : false,
      face: lt < 4.0 ? "melancholy" : "closed",
      walk: girlLeave.walk,
      wind: lt > 6.0 ? 0.8 : 0.1,
      arm: lt < 2.5 ? [ARM.low, 0.1] : [ARM.down, ARM.down],
      hold: lt < 2.5 ? [null, (hx, hy) => PROPS.letter(fb, hx, hy, true, false)] : [null, null],
      seed: 9,
    });
  }

  const boyFace = act(lt, [
    { t: 0.0, face: "surprised", look: [1, 0], take: 0, emote: null },
    { t: 2.5, face: "bitter_smile", look: [1, 0], take: 0.5, emote: null },
    { t: 7.0, face: "sad", look: [1, 0], take: 0.4, emote: null },
    { t: 13.75, face: "closed", look: [1, 1], take: 0.3, emote: null },
  ]);
  const boyArm: [number, number] =
    lt < 2.5 ? [ARM.down, 0.05] : lt < 10.0 ? [ARM.down, -0.35] : [ARM.down, ARM.down];

  fb.footShadow(106, gy, 12);
  drawBoy(fb, 106, gy, {
    ...boyFace,
    t: s,
    view: "q",
    arm: boyArm,
    wind: lt > 6.0 ? 0.9 : 0.1,
    hold: lt >= 2.5 ? [null, (hx, hy) => PROPS.letter(fb, hx + 1, hy, true, false)] : [null, null],
    seed: 2,
  });

  const leafSpeedX = lt >= 6.0 ? 56 : 16;
  fb.petals(t, { n: lt >= 6.0 ? 36 : 14, cols: ["#e8864a", "#ffd072", "#d95064"], speedX: leafSpeedX, speedY: 12 });
  fb.vignette(0.55);

  if (allowPunch && lt >= 13.75 && lt < 21.5) {
    fb.punch(2, 108, gy - 36);
  }
}

function walkToGirl(lt: number): { x: number; walk: number | null } {
  if (lt < 6.5) return { x: 162, walk: null };
  const k = ease(seg(lt, 6.5, 14.0));
  const x = lerp(162, 316, k);
  return { x, walk: lt < 14.0 ? Math.abs(x - 162) / 20 : null };
}

// =========================================================================
// SCENE 3: RAINY CAFE WINDOW (28.80s - 39.60s)
// =========================================================================
function drawScene3(fb: PixelFB, t: number, allowPunch = true): void {
  fb.pal("cafe");
  const s = st(t);
  const lt = t - T_S2_END;
  fb.camAt(135, 240);

  // Cozy warm interior wall + wood wainscot below window
  fb.fill("#161a2b");
  fb.rect(0, 0, LW, 248, "#1b2136");
  fb.rect(0, 248, LW, 54, "#241921");
  fb.rect(0, 248, LW, 2, "#422a30");

  // Large rainy café street window
  const wx = 26;
  const wy = 48;
  const ww = 218;
  const wh = 192;
  fb.rect(wx - 4, wy - 4, ww + 8, wh + 8, "#0e121f");
  fb.clip(wx, wy, ww, wh);
  fb.sky(fb.P.sky, { y0: wy, y1: wy + wh, soft: 0.5 });
  fb.city(wy + wh - 16, { c: "#0d1629", lit: 0.32, hmin: 24, hmax: 72, par: 0, seed: 21 });
  // Passing car headlight sweep
  if (lt >= 3.6 && lt < 6.6) {
    const cx = lerp(wx - 40, wx + ww + 40, seg(lt, 3.6, 6.6));
    fb.glow(cx, wy + wh - 24, 42, "#ffd072", 0.48, { bands: 3 });
  }
  fb.rain(t, { n: 85, slant: 2, par: 0, c: "#6f99c7" });
  for (let i = 0; i < 16; i++) {
    const gx = wx + 10 + ((i * 37) % (ww - 20));
    const gy_ = wy + ((hash(i * 4.3) * wh + onStep(t, 6) * (9 + (i % 3) * 3)) % wh);
    fb.line(gx, gy_, gx, gy_ + 3, "#8cb8e0");
  }
  fb.noclip();

  // Window mullions & wooden counter ledge + small potted plant on sill
  fb.rect(wx + Math.round(ww * 0.5), wy, 3, wh, "#1b2236");
  fb.rect(wx - 4, wy + wh, ww + 8, 5, "#362024");
  fb.rect(206, wy + wh - 9, 10, 9, "#6e433a");
  fb.disc(211, wy + wh - 12, 4, "#2f6b4b");

  // Hanging café pendant bulb (subtle warm halo)
  fb.line(135, 0, 135, 92, "#121524", 1);
  fb.poly([[124, 98], [129, 90], [141, 90], [146, 98]], "#362024");
  fb.disc(135, 99, 3, "#fff2c6");
  fb.glow(135, 102, 22, "#e09446", 0.24, { bands: 3 });

  // Detailed Café wooden floorboards
  const floorY = 324;
  fb.rect(0, 302, LW, LH - 302, "#17111a");
  fb.rect(0, 302, LW, 2, "#38242b");
  for (let y = 316; y < LH; y += 20) {
    fb.rect(0, y, LW, 1, "#241924");
  }
  for (let x = 20; x < LW; x += 48) {
    fb.line(x, 304, x - 28, LH, "#211621");
  }

  // Two café chairs
  fb.rect(68, floorY - 40, 4, 24, "#42272c");
  fb.rect(68, floorY - 18, 24, 4, "#523131");
  fb.rect(70, floorY - 14, 3, 14, "#331d21");
  fb.rect(87, floorY - 14, 3, 14, "#331d21");

  fb.rect(198, floorY - 40, 4, 24, "#42272c");
  fb.rect(178, floorY - 18, 24, 4, "#523131");
  fb.rect(180, floorY - 14, 3, 14, "#331d21");
  fb.rect(197, floorY - 14, 3, 14, "#331d21");

  // Faint memory flicker of Girl in empty seat (`lt < 1.6s`)
  if (lt < 1.6) {
    const fade = 1 - seg(lt, 0.5, 1.6);
    if (fade > 0.1) {
      drawGirl(fb, 182, floorY - 4, {
        t: s,
        view: "q",
        flip: true,
        face: "happy",
        tint: ["#8cb8e0", 0.55],
        seed: 14,
      });
      for (let y = floorY - 68; y <= floorY; y++) {
        for (let x = 160; x <= 205; x++) {
          if (BAY4[((y & 3) << 2) | (x & 3)] > fade * 0.72) {
            fb.px(x, y, y < 240 ? "#14223b" : "#1b2136");
          }
        }
      }
    }
  }

  const standing = lt >= 3.4;
  const boyWalk = lt >= 4.0 ? seg(lt, 4.0, 6.0) : 0;
  const boyX = lt < 4.0 ? (standing ? lerp(86, 98, seg(lt, 3.4, 3.95)) : 84) : lerp(98, 232, ease(boyWalk));
  const boyY = floorY;

  const sipping = lt >= 0.6 && lt < 2.4;
  const cupRaised = lt >= 0.8 && lt < 2.2;
  const boyFace = act(lt, [
    { t: 0.0, face: "melancholy", look: [1, 0], take: 0 },
    { t: 0.9, face: "closed", look: [1, 0], take: 0.2 },
    { t: 2.4, face: "sad", look: [1, 1], take: 0.3, emote: "dots" },
    { t: 3.5, face: "melancholy", look: [1, 0], emote: null, take: 0.3 },
  ]);

  let arm: [number, number] = [ARM.low, -0.3];
  let bend: [number, number] = [0.2, 0.5];
  let hold: CharacterOpts["hold"] = [null, null];

  if (sipping) {
    const lift = Math.sin(seg(lt, 0.6, 2.4) * Math.PI);
    arm = [ARM.low, lerp(-0.3, 0.55, lift)];
    bend = [0.2, lerp(0.5, 1.3, lift)];
    hold = [null, (hx, hy) => PROPS.coffeeMug(fb, hx + 2, hy)];
  } else if (lt >= 3.7) {
    arm = [ARM.down, -0.8];
    hold = [null, (hx, hy) => fb.line(hx, hy, hx + 6, hy + 18, "#283963", 2)];
  }

  fb.footShadow(boyX, boyY, 12);
  drawBoy(fb, boyX, boyY, {
    ...boyFace,
    t: s,
    view: lt >= 4.0 ? "side" : "q",
    posture: standing ? "stand" : "sit",
    walk: lt >= 4.0 && lt < 6.0 ? Math.abs(boyX - 98) / 22 : null,
    arm,
    bend,
    hold,
    wind: 0.05,
    seed: 3,
  });

  // Cafe table foreground (lowered slightly so face is cleanly visible)
  fb.rect(104, floorY - 34, 62, 5, "#523131");
  fb.rect(104, floorY - 34, 62, 2, "#754642");
  fb.rect(133, floorY - 29, 4, 27, "#362024");
  fb.rect(121, floorY - 3, 28, 3, "#362024");

  if (!cupRaised) PROPS.coffeeMug(fb, 118, floorY - 34);
  fb.rect(148, floorY - 36, 10, 2, "#cfc6bc");

  // Warm subtle glow above table (avoid bright gray light disc on dark floor)
  fb.glow(135, floorY - 46, 36, "#ffd072", 0.16, { bands: 3 });
  fb.vignette(0.38);

  if (allowPunch && lt >= 1.2 && lt < 3.2) {
    fb.punch(2, 96, floorY - 40);
  }

  fb.screenSpace();
  if (lt < 0.45) fb.diamonds(1 - seg(lt, 0, 0.45), { dir: "left", size: 18 });
  if (lt > 5.75) fb.diamonds(seg(lt, 5.75, 6.2), { dir: "right", size: 18 });
}

// =========================================================================
// SCENE 4: NEON RAIN STREET BREAKDOWN -> BRIAR ROSE -> SNOW (57.70s - 90.20s)
// =========================================================================
function drawScene4(fb: PixelFB, t: number, allowPunch = true): void {
  const lt = t - T_S3_END;
  // Snow starts at lt=23.0s (`80.7s` "过去被翻阅 结局满天的风雪"), dense blizzard by lt=25.5s
  const snowShift = seg(lt, 23.0, 25.5);
  const dawnShift = seg(lt, 29.5, 32.5);
  fb.pal(dawnShift > 0.6 ? "midnight" : "storm");
  const s = st(t);

  const walk2 = seg(lt, 11.2, 13.8);
  const boyX =
    lt < 1.8
      ? lerp(62, 116, ease(seg(lt, 0, 1.8)))
      : lt < 11.2
        ? 116
        : lt < 13.8
          ? lerp(116, 180, ease(walk2))
          : lt < 29.8
            ? 180
            : lerp(180, 248, ease(seg(lt, 29.8, 32.5)));

  const camX = clamp(lerp(118, 156, seg(lt, 4.0, 28.0)), 116, 160);
  const [shx, shy] = lt >= 0.9 && lt < 1.25 ? shakeXY(t, 2) : [0, 0];
  fb.camAt(camX + shx, 240 + shy);

  fb.sky(fb.P.sky, { soft: 0.55, par: 0.15, y0: 0, y1: 295 });
  fb.city(285, { c: "#0c1224", lit: 0.36, hmin: 32, hmax: 112, par: 0.4, seed: 33 });

  // Grounded foreground left shop building + mounted vertical neon signs (never floating!)
  const gy = 316;
  fb.rect(-20, gy - 165, 74, 165, "#0d1224");
  fb.rect(-20, gy - 165, 74, 3, "#1f2a4a");
  // Shop awning & mounted neon signboards with wall brackets
  fb.rect(48, gy - 134, 6, 3, "#2a385c");
  fb.rect(48, gy - 108, 6, 3, "#2a385c");
  fb.rect(52, gy - 140, 11, 40, "#180d1e");
  fb.rect(54, gy - 138, 7, 36, "#c94152", 0.85);
  fb.rect(6, gy - 72, 34, 4, "#5c273b");
  fb.rect(8, gy - 68, 30, 68, "#111930");
  fb.rect(12, gy - 60, 22, 34, "#1e3259");

  // Second midground building with blue neon sign cleanly attached
  fb.rect(74, gy - 132, 32, 132, "#10172e");
  fb.rect(96, gy - 118, 10, 28, "#0e1a30");
  fb.rect(98, gy - 116, 6, 24, "#56b8e8", 0.78);

  // Wrought-iron fence & brick gate pillar on right (`门外的蔷薇`, shifted to 194 so boy sits cleanly beside it)
  const gateX = 194;
  fb.rect(gateX, gy - 92, 110, 92, "#101526");
  fb.rect(gateX - 4, gy - 96, 12, 96, "#1f2438");
  fb.rect(gateX + 88, gy - 96, 12, 96, "#1f2438");
  for (let bx = gateX + 12; bx < gateX + 86; bx += 8) {
    fb.rect(bx, gy - 84, 2, 84, "#242c47");
    fb.px(bx, gy - 86, "#566894");
  }
  fb.rect(gateX + 8, gy - 72, 80, 2, "#242c47");
  fb.rect(gateX + 8, gy - 26, 80, 2, "#242c47");

  // Thorny briar rose vines woven organically across the wrought-iron gate bars!
  fb.curve([[gateX + 10, gy - 4], [gateX + 20, gy - 32], [gateX + 34, gy - 54], [gateX + 52, gy - 66]], "#244f38", 1);
  fb.curve([[gateX + 16, gy - 28], [gateX + 26, gy - 42], [gateX + 18, gy - 58]], "#244f38", 1);
  fb.px(gateX + 15, gy - 26, "#572d38");
  fb.px(gateX + 24, gy - 40, "#572d38");
  fb.px(gateX + 30, gy - 50, "#572d38");
  PROPS.briarRose(fb, gateX + 18, gy - 34);
  PROPS.briarRose(fb, gateX + 32, gy - 52);
  PROPS.briarRose(fb, gateX + 48, gy - 64);
  PROPS.briarRose(fb, gateX + 20, gy - 58);

  // Vintage streetlamp with subtle warm halo + soft downward light cone (no big polka dot circle!)
  fb.rect(128, gy - 144, 4, 144, "#182038");
  fb.rect(124, gy - 148, 12, 4, "#4b5a82");
  fb.rect(125, gy - 160, 10, 12, "#ffd278");
  fb.glow(130, gy - 154, 24, "#e08844", 0.25, { bands: 3 });
  fb.poly([[124, gy - 148], [136, gy - 148], [164, gy], [96, gy]], "#ffd278", 0.125);

  // Wet asphalt street & puddle reflections
  fb.rect(-30, gy, 340, LH - gy + 40, "#080b16");
  fb.rect(-30, gy, 340, 2, "#223052");
  fb.oval(88, gy + 18, 28, 5, "#152342");
  fb.oval(162, gy + 26, 36, 6, "#152342");
  fb.rect(76, gy + 17, 16, 2, "#c94152", 0.5);
  fb.rect(148, gy + 25, 22, 2, "#56b8e8", 0.5);
  for (let i = 0; i < 3; i++) {
    const rp = frac(t * 1.1 + i * 0.33);
    const rx = 88 + (i % 2) * 72;
    const ry = gy + 18 + (i % 2) * 8;
    fb.oval(rx, ry, Math.round(3 + rp * 8), 2, "#80b4eb", qd((1 - rp) * 0.7));
  }

  const umbrellaDropped = lt >= 1.1;
  const crouching = lt >= 23.0 && lt < 29.8;
  const standingBackUp = lt >= 29.8;
  const walkingNow = lt < 1.8 || (lt >= 11.2 && lt < 13.8) || (lt >= 29.8 && lt < 32.5);

  const boyFace = act(lt, [
    { t: 0.0, face: "sad", look: [1, 0], take: 0 },
    { t: 1.0, face: "surprised", look: [1, -1], take: 0.7, emote: "!" },
    { t: 1.8, face: "cry", look: [0, 1], take: 0.4, emote: null },
    { t: 11.2, face: "sad", look: [1, 0], take: 0.3 },
    { t: 15.2, face: "surprised", look: [1, 0], take: 0.8, emote: "!" },
    { t: 16.5, face: "cry", look: [1, 1], take: 0.3, emote: null },
    { t: 29.8, face: "melancholy", look: [1, 0], take: 0.3 },
  ]);

  let arm: [number, number] = [ARM.down, ARM.down];
  let bend: [number, number] = [0.22, 0.22];
  let hold: CharacterOpts["hold"] = [null, null];

  if (lt < 1.1) {
    arm = [ARM.down, 0.55];
    bend = [0.2, 0.9];
    hold = [null, (hx, hy) => PROPS.umbrella(fb, hx, hy, -0.08)];
  } else if (lt >= 14.5 && lt < 16.5) {
    const reach = lt < 15.5 ? seg(lt, 14.5, 15.4) : 1 - seg(lt, 15.5, 16.45);
    arm = [ARM.down, lerp(ARM.down, 0.2, reach)];
    bend = [0.2, lerp(0.2, 0.1, reach)];
  } else if (crouching) {
    arm = [ARM.low, 0.3];
    bend = [0.4, 1.3];
  } else if (standingBackUp) {
    arm = [ARM.down, -0.45];
    hold = [null, (hx, hy) => PROPS.letter(fb, hx + 1, hy, true, false)];
  }

  fb.footShadow(boyX, gy, crouching ? 14 : 12);
  drawBoy(fb, boyX, gy, {
    ...boyFace,
    t: s,
    view: lt >= 1.8 && lt < 11.0 ? "front" : lt >= 29.8 ? "side" : "q",
    posture: crouching ? "crouch" : "stand",
    walk: walkingNow ? Math.abs(boyX - 62) / 22 : null,
    arm,
    bend,
    hold,
    wind: snowShift > 0.3 ? 1.0 : 0.75,
    tears: lt >= 1.6 && lt < 29.5,
    seed: 4,
  });

  if (umbrellaDropped) {
    const dt = lt - 1.1;
    const ux = dt < 0.7 ? lerp(124, 90, easeOut(dt / 0.7)) : 90;
    const uy = dt < 0.7 ? lerp(gy - 28, gy + 2, easeIn(dt / 0.7)) : gy + 2;
    const utilt = dt < 0.7 ? lerp(0.1, -1.35, dt / 0.7) : -1.35;
    PROPS.umbrella(fb, ux, uy, utilt);
  }

  if (lt >= 5.2 && lt < 14.0) {
    for (let i = 0; i < 12; i++) {
      const fx = ((hash(i * 4.1) * 320 + lt * (38 + (i % 3) * 14)) % 320) - 20;
      const fy = ((hash(i * 8.3) * 260 + Math.sin(lt * 2.5 + i) * 24 + lt * 12) % 280) + 40;
      if (i % 3 === 0) fb.rect(fx, fy, 4, 3, "#f0b878");
      else fb.rect(fx, fy, 2, 2, i % 2 ? "#f2747d" : "#fff4cb");
    }
  }

  if (snowShift < 0.92) {
    fb.rain(t, { n: Math.round(135 * (1 - snowShift * 0.85)), slant: 3, ground: gy, c: "#6ca3d9" });
  }
  if (snowShift > 0.05) {
    const snowDensity =
      lt > 27.5 ? Math.round(120 * (1 - seg(lt, 27.5, 32.5) * 0.65)) : Math.round(180 * snowShift);
    fb.snow(t, { n: snowDensity, wind: 24 });
  }

  fb.vignette(0.45);

  if (allowPunch && lt >= 1.8 && lt < 10.8) {
    fb.punch(2, boyX, gy - 42);
  }

  fb.screenSpace();
  if (lt < 0.45) fb.diamonds(1 - seg(lt, 0, 0.45), { dir: "left", size: 18 });
}

// =========================================================================
// SCENE 5: DAWN OVERPASS RELEASE (90.20s - 96.00s)
// =========================================================================
function drawScene5(fb: PixelFB, t: number, allowPunch = true): void {
  fb.pal("dawn");
  const s = st(t);
  const lt = t - T_S4_END;
  // Cinematic camera slow drift: subtle lift towards the rising sun
  const camY = lerp(242, 236, ease(seg(lt, 0, 5.8)));
  const camX = lerp(132, 138, ease(seg(lt, 0, 5.8)));
  fb.camAt(camX, camY);

  fb.sky(fb.P.sky, { soft: 0.6, y0: 0, y1: 315 });
  const sunY = lerp(228, 196, ease(seg(lt, 0, 5.5)));
  fb.sunDisc(182, sunY, 15, { par: 0.1 });
  fb.clouds(t, { y: 92, n: 6, par: 0.2, speed: 6 });
  fb.city(284, { c: "#26284a", lit: 0.12, hmin: 20, hmax: 68, par: 0.4, seed: 44 });

  // Overpass deck with warm perspective stone joints & edge curb
  const deckY = 322;
  fb.rect(0, deckY, LW, LH - deckY, "#1d203b");
  fb.rect(0, deckY, LW, 3, "#a892b3");
  fb.rect(0, deckY + 3, LW, 3, "#363a61");
  for (let y = deckY + 24; y < LH; y += 26) {
    fb.rect(0, y, LW, 1, "#2a2e52");
  }
  for (let x = 22; x < LW; x += 46) {
    fb.line(x, deckY + 6, x - 34, LH, "#282c4d");
  }

  // Handrail posts & top rail
  fb.rect(0, deckY - 38, LW, 3, "#4e5282");
  fb.rect(0, deckY - 39, LW, 1, "#ffd09e");
  fb.rect(0, deckY - 19, LW, 2, "#353961");
  for (let x = 14; x < LW; x += 28) {
    fb.rect(x, deckY - 38, 3, 38, "#353961");
  }

  if (lt < 2.6) {
    fb.snow(t, { n: Math.max(25, Math.round(55 * (1 - lt / 2.6))), wind: 14, c: "#ffe6d4" });
  }
  fb.sparkles(t, 16, 120, 240, 190, { n: 12, seed: 19, period: 0.6, c: "#ffd791", c2: "#f3b07a" });

  const wIn = seg(lt, 0, 1.1);
  const boyX = lerp(88, 122, ease(wIn));
  const released = lt >= 2.5;

  const boyFace = act(lt, [
    { t: 0.0, face: "melancholy", look: [1, 0], take: 0 },
    { t: 1.5, face: "thinking", look: [1, -1], take: 0.2 },
    { t: 2.6, face: "closed", look: [1, 0], take: 0.3 },
    { t: 3.3, face: "bitter_smile", look: [1, -1], take: 0.4 },
    { t: 3.9, face: "happy", look: [1, -1], take: 0.5 },
  ]);

  let view: CharacterOpts["view"] = "q";
  let arm: [number, number] = [ARM.down, -0.4];
  let bend: [number, number] = [0.2, 0.4];
  let hold: CharacterOpts["hold"] = [null, null];

  if (lt < 1.1) {
    view = "side";
  } else if (lt < 1.6) {
    view = "back";
  } else if (lt < 2.5) {
    view = "q";
    const prep = ease(seg(lt, 1.6, 2.45));
    arm = [ARM.down, lerp(-0.4, 0.85, prep)];
    bend = [0.2, 0.45];
    hold = [null, (hx, hy) => PROPS.paperPlane(fb, hx + 2, hy - 2, -0.25)];
  } else if (lt < 3.2) {
    view = "q";
    const follow = easeOut(seg(lt, 2.5, 3.1));
    arm = [ARM.down, lerp(0.85, 0.25, follow)];
  } else {
    view = "q";
    arm = [ARM.down, ARM.down];
  }

  fb.footShadow(boyX, deckY, 12);
  drawBoy(fb, boyX, deckY, {
    ...boyFace,
    t: s,
    view,
    walk: lt < 1.1 ? Math.abs(boyX - 88) / 20 : null,
    arm,
    bend,
    hold,
    wind: 0.4,
    seed: 5,
  });

  if (released) {
    const p = clamp((lt - 2.5) / 2.6);
    const px_ = lerp(boyX + 14, 245, easeOut(p));
    const py_ = lerp(deckY - 46, sunY - 12, p) - Math.sin(p * Math.PI) * 32;
    PROPS.paperPlane(fb, px_, py_, lerp(-0.35, -0.1, p));
    if (p < 0.85) {
      fb.sparkles(t, px_ - 12, py_ - 8, 16, 16, { n: 3, seed: 8, c: "#ffe6b3", c2: "#f3b07a" });
    }
  }

  fb.light(182, sunY, 88, 0.4, { ry: 68 });
  fb.vignette(0.32);

  if (allowPunch && lt >= 3.4 && lt < 4.9) {
    fb.punch(2, boyX + 6, deckY - 40);
  }

  fb.screenSpace();
  if (lt >= 4.85) {
    fb.iris(seg(lt, 4.85, 5.75), 182, sunY, { c: "#131224", shape: "circle" });
  }
}

// =========================================================================
// MAIN WORLD RENDERER + TRANSITIONS + ZPIX PIXEL LYRICS & TITLE OVERLAY
// =========================================================================
export function renderPixelWorldAt(fb: PixelFB, outCtx: CanvasRenderingContext2D, t: number): void {
  if (t < T_S1_END - 0.55) {
    fb.begin(t, "midnight");
    drawScene1(fb, t, true);
    fb.end(outCtx);
  } else if (t < T_S1_END) {
    const k = ease(seg(t, T_S1_END - 0.55, T_S1_END));
    fb.begin(t, "midnight");
    fb.crossDither(
      k,
      () => drawScene1(fb, t, false),
      () => drawScene2(fb, T_S1_END, false)
    );
    fb.end(outCtx);
  } else if (t < T_S2_END) {
    fb.begin(t, "dusk");
    drawScene2(fb, t, true);
    fb.end(outCtx);
  } else if (t < T_S3_END) {
    fb.begin(t, "cafe");
    drawScene3(fb, t, true);
    fb.end(outCtx);
  } else if (t < T_S4_END - 0.55) {
    fb.begin(t, "storm");
    drawScene4(fb, t, true);
    fb.end(outCtx);
  } else if (t < T_S4_END) {
    const k = ease(seg(t, T_S4_END - 0.55, T_S4_END));
    fb.begin(t, "storm");
    fb.crossDither(
      k,
      () => drawScene4(fb, t, false),
      () => drawScene5(fb, T_S4_END, false)
    );
    fb.end(outCtx);
  } else {
    fb.begin(t, "dawn");
    drawScene5(fb, t, true);
    fb.end(outCtx);
  }

  // Atmospheric Opening Title Hook (`0.25s - 2.55s`) in crisp Zpix pixel font
  if (t >= 0.25 && t < 2.55) {
    const alpha = seg(t, 0.25, 0.7) * (1 - seg(t, 1.9, 2.55));
    if (alpha > 0.03) {
      outCtx.save();
      outCtx.globalAlpha = alpha;
      fb.pxText(outCtx, "我落泪 · 情绪零碎", 540, 224, {
        k: 2,
        align: "center",
        fg: "#ffe8a3",
        ol: "#090c1a",
        sh: "#060812",
        fs: 24,
      });
      fb.pxText(outCtx, "周杰伦  ·  方文山", 540, 294, {
        k: 1,
        align: "center",
        fg: "#c8d2eb",
        ol: "#090c1a",
        sh: "#060812",
        fs: 24,
      });
      outCtx.restore();
    }
  }

  drawLyricOverlay(fb, outCtx, t);
}

function drawLyricOverlay(fb: PixelFB, ctx: CanvasRenderingContext2D, t: number): void {
  const cue = LYRICS.find((c) => c.start <= t && t < c.end);
  if (!cue) return;

  const chars = cue.chars;
  const kScale = 2; // 24px native Zpix * 2 = 48px crisp pixel characters
  const stepX = chars.length > 13 ? 52 : 58;
  const totalW = (chars.length - 1) * stepX + 48;
  const plaqueW = Math.max(480, Math.min(960, totalW + 108));
  const plaqueH = 92;
  const centerX = 540;
  const plaqueY = 1485;

  const fadeIn = clamp((t - cue.start) / 0.14);
  const fadeOut = clamp((cue.end - t) / 0.16);
  const alpha = Math.min(fadeIn, fadeOut);
  if (alpha <= 0.02) return;

  ctx.save();
  ctx.globalAlpha = alpha * 0.86;
  const px0 = Math.round((centerX - plaqueW / 2) / 4) * 4;
  ctx.fillStyle = "#121324";
  ctx.fillRect(px0 + 8, plaqueY, plaqueW - 16, plaqueH);
  ctx.fillRect(px0, plaqueY + 8, plaqueW, plaqueH - 16);
  ctx.globalAlpha = alpha * 0.92;
  ctx.fillStyle = "#6e7ca8";
  ctx.fillRect(px0 + 16, plaqueY + 4, plaqueW - 32, 4);

  const prog = clamp((t - cue.start) / (cue.end - cue.start));
  ctx.fillStyle = "#e6b468";
  ctx.fillRect(px0 + 16, plaqueY + plaqueH - 8, Math.round((plaqueW - 32) * prog), 4);
  ctx.restore();

  let curIdx = -1;
  chars.forEach((ch, idx) => {
    if (t >= ch.at) curIdx = idx;
  });

  const leftX = centerX - ((chars.length - 1) * stepX) / 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  chars.forEach((ch, idx) => {
    if (ch.char === " ") return;
    const dt = t - ch.at;
    const bounce =
      dt >= 0 && dt < 0.28 ? Math.sin((Math.PI * dt) / 0.28) * Math.exp(-dt * 1.8) : 0;
    const fg = idx === curIdx ? "#ffe89e" : dt >= 0 ? "#fff7eb" : "#9aa6c9";
    const x = Math.round(leftX + idx * stepX);
    const y = Math.round(plaqueY + 16 - bounce * 10);
    fb.pxText(ctx, ch.char, x, y, {
      k: kScale,
      align: "center",
      fg,
      ol: "#121324",
      sh: "#080912",
      fs: 24,
    });
  });
  ctx.restore();
}
