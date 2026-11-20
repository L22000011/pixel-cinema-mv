import {
  MOOD_PALETTES,
  MoodId,
  ScenePalette,
  clamp,
  drawBayerSky,
  drawPixelEllipse,
  drawPixelLine,
  pxDot,
  pxRect,
} from "./palette";

export type SceneId =
  | "campus_path"
  | "rainy_camphor_road"
  | "classroom_window"
  | "playground_overpass_sunset"
  | "streetlamp_rain_corner";

export interface SceneEnvParams {
  wind: number;
  rain: number;
  sunbeams: number;
  leaves: number;
  curtain: number;
  lamp: number;
  puddles: number;
}

export interface SceneFrameInput {
  scene: SceneId;
  mood: MoodId;
  w: number;
  h: number;
  panX: number;
  panY: number;
  timeSec: number;
  animTick: number;
  env: SceneEnvParams;
  groundYRatio: number;
}

function hash01(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

/** Fill an organic shape quantized onto an integer pixel-block grid (g x g) for pure pixel art. */
function drawSteppedBlockCluster(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  g: number,
  color: string
): void {
  ctx.fillStyle = color;
  const iry = Math.max(g, Math.round(ry / g) * g);
  const irx = Math.max(g, Math.round(rx / g) * g);
  for (let dy = -iry; dy <= iry; dy += g) {
    const ny = dy / iry;
    const span = Math.round((irx * Math.sqrt(Math.max(0, 1 - ny * ny))) / g) * g;
    if (span > 0) {
      ctx.fillRect(Math.round((cx - span) / g) * g, Math.round((cy + dy) / g) * g, span * 2, g);
    }
  }
}

function drawClouds(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  skyH: number,
  panX: number,
  timeSec: number,
  pal: ScenePalette
): void {
  const cloudDrift = timeSec * 2.2 - panX * 0.12;
  const specs = [
    { x: 0.14, y: 0.21, scale: 0.9 },
    { x: 0.44, y: 0.15, scale: 1.15 },
    { x: 0.78, y: 0.24, scale: 1.0 },
    { x: 1.08, y: 0.18, scale: 0.85 },
  ];
  const g = 3;
  for (let i = 0; i < specs.length; i++) {
    const sp = specs[i];
    const k = sp.scale;
    const cx = Math.round((((sp.x * w + cloudDrift) % (w + 150)) - 75) / g) * g;
    const cy = Math.round((sp.y * skyH) / g) * g;
    const puffs = [
      { dx: -24 * k, dy: 4 * k, rx: 14 * k, ry: 8 * k },
      { dx: -10 * k, dy: -3 * k, rx: 16 * k, ry: 11 * k },
      { dx: 6 * k, dy: -5 * k, rx: 18 * k, ry: 12 * k },
      { dx: 22 * k, dy: 1 * k, rx: 14 * k, ry: 9 * k },
      { dx: 33 * k, dy: 5 * k, rx: 9 * k, ry: 6 * k },
    ];
    // Crisp stepped pixel flat-bottom shadow
    for (const pf of puffs) {
      drawSteppedBlockCluster(ctx, cx + pf.dx + g, cy + pf.dy + g, pf.rx, pf.ry, g, pal.cloudSh);
    }
    pxRect(ctx, Math.round((cx - 34 * k) / g) * g, cy + g, Math.round((72 * k) / g) * g, g * 2, pal.cloudSh);
    // Crisp stepped sunlit cumulus top puffs
    for (const pf of puffs) {
      drawSteppedBlockCluster(ctx, cx + pf.dx, cy + pf.dy, pf.rx * 0.92, pf.ry * 0.88, g, pal.cloudHi);
    }
    pxRect(ctx, Math.round((cx - 32 * k) / g) * g, cy, Math.round((68 * k) / g) * g, g * 2, pal.cloudHi);
  }
}

function drawUtilityWires(
  ctx: CanvasRenderingContext2D,
  w: number,
  topY: number,
  panX: number,
  color: string,
  poleXList: number[]
): void {
  for (let i = 0; i < poleXList.length; i++) {
    const px = Math.round(poleXList[i] - panX * 0.45);
    pxRect(ctx, px, topY - 46, 3, 98, color);
    pxRect(ctx, px - 6, topY - 38, 15, 2, color);
    if (i < poleXList.length - 1) {
      const nx = Math.round(poleXList[i + 1] - panX * 0.45);
      // Catenary sag
      const segs = 12;
      for (let s = 0; s < segs; s++) {
        const t0 = s / segs;
        const t1 = (s + 1) / segs;
        const x0 = px + (nx - px) * t0;
        const x1 = px + (nx - px) * t1;
        const y0 = topY - 37 + Math.sin(t0 * Math.PI) * 9;
        const y1 = topY - 37 + Math.sin(t1 * Math.PI) * 9;
        drawPixelLine(ctx, x0, y0, x1, y1, color, 1);
      }
    }
  }
  if (w > 0 && poleXList.length === 0) return;
}

function drawTreeCanopy(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  windOffset: number,
  pal: ScenePalette,
  trunkBottomY: number,
  trunkColor: string
): void {
  // Trunk & fork branches
  pxRect(ctx, cx - 4, cy + ry * 0.3, 8, trunkBottomY - (cy + ry * 0.3), trunkColor);
  drawPixelLine(ctx, cx, cy + ry * 0.55, cx - rx * 0.42, cy + 2, trunkColor, 2);
  drawPixelLine(ctx, cx + 1, cy + ry * 0.55, cx + rx * 0.4, cy, trunkColor, 2);

  // Multi-cluster pixel-stepped foliage (2x2 pixel blocks + leaf speckles) matching RPG sprites
  const g = 2;
  const sw = Math.round(windOffset / g) * g;
  const clusters = [
    { dx: -rx * 0.58, dy: 5, rrx: rx * 0.48, rry: ry * 0.62, sway: 0.5 },
    { dx: rx * 0.56, dy: 6, rrx: rx * 0.46, rry: ry * 0.58, sway: 0.6 },
    { dx: -rx * 0.28, dy: -ry * 0.26, rrx: rx * 0.52, rry: ry * 0.64, sway: 0.8 },
    { dx: rx * 0.28, dy: -ry * 0.22, rrx: rx * 0.50, rry: ry * 0.60, sway: 0.8 },
    { dx: 0, dy: -ry * 0.44, rrx: rx * 0.44, rry: ry * 0.52, sway: 1.0 },
    { dx: 0, dy: 4, rrx: rx * 0.68, rry: ry * 0.56, sway: 0.5 },
  ];
  for (const cl of clusters) {
    drawSteppedBlockCluster(ctx, cx + cl.dx + sw * cl.sway, cy + cl.dy + g * 2, cl.rrx, cl.rry, g, pal.treeDark);
  }
  for (const cl of clusters) {
    drawSteppedBlockCluster(ctx, cx + cl.dx + sw * cl.sway, cy + cl.dy - g, cl.rrx * 0.86, cl.rry * 0.84, g, pal.treeMid);
  }
  drawSteppedBlockCluster(ctx, cx - rx * 0.22 + sw, cy - ry * 0.36, rx * 0.36, ry * 0.38, g, pal.treeHi);
  drawSteppedBlockCluster(ctx, cx + rx * 0.26 + sw, cy - ry * 0.26, rx * 0.30, ry * 0.34, g, pal.treeHi);
  // Crisp individual 2x2 pixel leaf clusters around canopy rim
  for (let d = 0; d < 18; d++) {
    const a = (d / 18) * Math.PI * 2;
    const lx = Math.round((cx + Math.cos(a) * rx * 0.82 + sw) / g) * g;
    const ly = Math.round((cy + Math.sin(a) * ry * 0.72) / g) * g;
    pxRect(ctx, lx, ly, g, g, d % 3 === 0 ? pal.treeHi : pal.treeDark);
  }
}

function drawWetPuddlesAndReflections(
  ctx: CanvasRenderingContext2D,
  w: number,
  groundY: number,
  h: number,
  rainStrength: number,
  timeSec: number,
  pal: ScenePalette
): void {
  if (rainStrength <= 0.05) return;
  const puddles = [
    { x: w * 0.22, y: groundY + Math.round((h - groundY) * 0.42), rx: 32, ry: 6 },
    { x: w * 0.56, y: groundY + Math.round((h - groundY) * 0.56), rx: 44, ry: 7 },
    { x: w * 0.82, y: groundY + Math.round((h - groundY) * 0.38), rx: 28, ry: 5 },
  ];
  for (let i = 0; i < puddles.length; i++) {
    const p = puddles[i];
    drawPixelEllipse(ctx, p.x, p.y, p.rx, p.ry, pal.skyBot);
    drawPixelEllipse(ctx, p.x + 2, p.y + 1, p.rx - 4, Math.max(2, p.ry - 2), pal.skyMid);
    // Concentric expanding ripple rings
    const cycle = (timeSec * 1.45 + i * 0.37) % 1;
    const rr = Math.round(4 + cycle * (p.rx * 0.65));
    const rry = Math.max(2, Math.round(rr * 0.24));
    ctx.strokeStyle = pal.rainColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(Math.round(p.x), Math.round(p.y), rr, rry, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export function drawSceneBackground(ctx: CanvasRenderingContext2D, inp: SceneFrameInput): void {
  const { scene, mood, w, h, panX, panY, timeSec, env, groundYRatio } = inp;
  const pal = MOOD_PALETTES[mood];
  const groundY = Math.round(h * groundYRatio + panY * 0.4);
  const horizonY = Math.round(groundY - 36);
  const windSway = Math.sin(timeSec * (2.6 + env.wind * 2.2)) * (1.5 + env.wind * 4.5);

  if (scene === "classroom_window") {
    // Sky viewed outside windowpanes (left 58% of frame)
    drawBayerSky(ctx, Math.round(w * 0.72), Math.round(h * 0.74), pal.skyTop, pal.skyMid, pal.skyBot);
    drawClouds(ctx, w, h, Math.round(h * 0.62), panX * 0.3, timeSec, pal);

    // Distant courtyard school roof & camphor canopy seen through window
    const winHorizon = Math.round(h * 0.56 + panY * 0.2);
    pxRect(ctx, 0, winHorizon, w * 0.72, 34, pal.farBldg);
    drawTreeCanopy(
      ctx,
      Math.round(w * 0.16 - panX * 0.25),
      winHorizon - 14,
      36,
      24,
      windSway,
      pal,
      winHorizon + 30,
      "#2e2b36"
    );
    drawTreeCanopy(
      ctx,
      Math.round(w * 0.42 - panX * 0.25),
      winHorizon - 8,
      28,
      20,
      windSway * 0.8,
      pal,
      winHorizon + 30,
      "#2e2b36"
    );

    // Falling outdoor rain clipped strictly to the courtyard outside the window!
    if (env.rain > 0.05) {
      const outsideDrops = Math.round(28 + env.rain * 75);
      for (let i = 0; i < outsideDrops; i++) {
        const speedY = 190 + hash01(i * 11) * 90;
        const rx = Math.round((hash01(i * 31) * (w * 0.72) - timeSec * (25 + env.wind * 40)) % (w * 0.72));
        const finalX = rx < 0 ? rx + Math.round(w * 0.72) : rx;
        const ry = Math.round((hash01(i * 47) * (h * 0.72) + timeSec * speedY) % (h * 0.72));
        drawPixelLine(ctx, finalX, ry, finalX - 2, ry + 6, pal.rainColor, 1);
      }
    }

    // Note: Boy walking in outside corridor sits BETWEEN courtyard trees and interior classroom wall!
    return;
  }

  // Outdoor Sky
  drawBayerSky(ctx, w, groundY + 4, pal.skyTop, pal.skyMid, pal.skyBot);
  drawClouds(ctx, w, h, horizonY, panX, timeSec, pal);

  // Far Mountains / City Skyline
  const farShift = Math.round(-panX * 0.18);
  for (let i = 0; i < 8; i++) {
    const bx = i * 74 + farShift - 30;
    const bh = 22 + Math.round(hash01(i + 11) * 32);
    pxRect(ctx, bx, horizonY - bh + 20, 62, bh + 24, pal.farBldg);
    // Warm lit building windows at sunset/night
    if (env.lamp > 0.1) {
      for (let wy = horizonY - bh + 26; wy < horizonY + 8; wy += 8) {
        for (let wx = bx + 6; wx < bx + 54; wx += 10) {
          if (hash01(wx * 3 + wy) > 0.42) {
            pxRect(ctx, wx, wy, 4, 4, pal.farBldgWin);
          }
        }
      }
    }
  }

  if (scene === "campus_path" || scene === "rainy_camphor_road") {
    // Low brick & plaster school courtyard wall + iron railing along horizon
    const wallY = groundY - 26;
    pxRect(ctx, 0, wallY, w, 26, "#464d5e");
    pxRect(ctx, 0, wallY, w, 3, "#6b7387");
    for (let x = -Math.round(panX * 0.6) % 14; x < w; x += 14) {
      pxRect(ctx, x, wallY - 11, 2, 11, "#2a3040");
    }
    pxRect(ctx, 0, wallY - 12, w, 2, "#242938");

    // Tall Japanese high-school teaching building wing on far left
    const schX = Math.round(18 - panX * 0.35);
    pxRect(ctx, schX, horizonY - 56, 138, 76, "#5a657a");
    pxRect(ctx, schX, horizonY - 60, 142, 4, "#3b4354");
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 6; col++) {
        pxRect(ctx, schX + 10 + col * 20, horizonY - 48 + row * 20, 12, 13, pal.farBldgWin);
      }
    }

    // Lush Camphor & Cherry trees lining the campus path
    const treePositions = [0.22, 0.48, 0.78, 0.96];
    for (let i = 0; i < treePositions.length; i++) {
      const tx = Math.round(treePositions[i] * w - panX * 0.55);
      const scaleH = i % 2 === 0 ? 1.15 : 0.95;
      drawTreeCanopy(
        ctx,
        tx,
        Math.round(groundY - 92 * scaleH),
        Math.round(42 * scaleH),
        Math.round(28 * scaleH),
        windSway * (0.8 + i * 0.12),
        pal,
        groundY - 4,
        "#36282a"
      );
      // Pink blossom speckles on clear_breeze spring morning
      if (mood === "clear_breeze") {
        for (let b = 0; b < 9; b++) {
          const bx = tx - 26 + Math.round(hash01(i * 19 + b) * 52 + windSway);
          const by = Math.round(groundY - 98 * scaleH + hash01(i * 31 + b) * 32);
          pxDot(ctx, bx, by, pal.accent, 2);
        }
      }
    }

    drawUtilityWires(ctx, w, horizonY - 32, panX, "#252b3b", [90, 290, 460]);

    // Ground asphalt / sandstone sidewalk
    pxRect(ctx, 0, groundY - 4, w, 6, pal.groundHi);
    pxRect(ctx, 0, groundY + 2, w, h - groundY, pal.groundMid);
    pxRect(ctx, 0, Math.round(groundY + (h - groundY) * 0.65), w, h, pal.groundSh);

    // Sidewalk stone slabs
    for (let x = -Math.round(panX) % 44; x < w; x += 44) {
      drawPixelLine(ctx, x, groundY + 2, x - 16, h, pal.groundSh, 1);
    }
    if (scene === "rainy_camphor_road") {
      // Crosswalk white zebra stripes
      for (let i = 0; i < 4; i++) {
        pxRect(ctx, Math.round(w * 0.25 + i * 54 - panX * 0.8), groundY + 12, 34, 8, "#aebad1");
      }
      drawWetPuddlesAndReflections(ctx, w, groundY, h, env.puddles, timeSec, pal);
    }
  } else if (scene === "playground_overpass_sunset") {
    // Glowing Sunset Sun Orb hugging overpass skyline
    const sunX = Math.round(w * 0.72 - panX * 0.2);
    const sunY = Math.round(horizonY - 12);
    drawPixelEllipse(ctx, sunX, sunY, 26, 26, "#ffae6e");
    drawPixelEllipse(ctx, sunX, sunY, 17, 17, "#ffe6a3");

    // Athletic track & red brick pavilion far below overpass
    pxRect(ctx, 0, horizonY + 12, w, 30, "#4a3346");
    pxRect(ctx, 0, groundY - 38, w, 38, pal.groundSh);
    // Overpass deck & guardrail
    pxRect(ctx, 0, groundY - 4, w, h - groundY + 4, pal.groundMid);
    pxRect(ctx, 0, groundY - 3, w, 4, pal.groundHi);
    // Guardrail bars behind characters
    pxRect(ctx, 0, groundY - 34, w, 2, "#2f2336");
    pxRect(ctx, 0, groundY - 20, w, 1, "#2f2336");
    for (let x = -Math.round(panX * 0.8) % 28; x < w; x += 28) {
      pxRect(ctx, x, groundY - 34, 2, 32, "#251c2e");
    }
    drawUtilityWires(ctx, w, horizonY - 26, panX, "#3b283f", [60, 260, 440]);
  } else if (scene === "streetlamp_rain_corner") {
    // Evening convenience store / quiet residential block silhouette
    const shopX = Math.round(28 - panX * 0.4);
    pxRect(ctx, shopX, groundY - 92, 118, 92, "#192036");
    pxRect(ctx, shopX + 8, groundY - 58, 72, 38, "#3e5375");
    // Warm shop glow sign & interior shelves
    pxRect(ctx, shopX + 6, groundY - 68, 96, 8, "#ffd078");
    pxRect(ctx, shopX + 12, groundY - 54, 64, 30, "#8f6d4a");
    pxRect(ctx, shopX + 16, groundY - 48, 56, 10, "#ffdd9c");

    // Opposite brick wall & distant trees
    drawTreeCanopy(
      ctx,
      Math.round(w * 0.78 - panX * 0.5),
      groundY - 90,
      46,
      28,
      windSway,
      pal,
      groundY - 2,
      "#131826"
    );

    // Vintage Streetlamp standing at center-left
    const lampX = Math.round(w * 0.37 - panX * 0.75);
    const lampTopY = Math.round(groundY - 126);
    pxRect(ctx, lampX - 1, lampTopY + 12, 3, 114, "#111524");
    pxRect(ctx, lampX - 5, lampTopY + 8, 12, 4, "#242c44");
    pxRect(ctx, lampX - 3, lampTopY + 2, 8, 6, "#ffe99e");
    // Warm amber radial light pool behind characters
    if (env.lamp > 0.1) {
      ctx.save();
      const grad = ctx.createRadialGradient(lampX + 2, lampTopY + 6, 4, lampX + 2, groundY - 20, 140);
      grad.addColorStop(0, "rgba(255, 224, 138, 0.34)");
      grad.addColorStop(0.55, "rgba(255, 190, 96, 0.12)");
      grad.addColorStop(1, "rgba(255, 190, 96, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // Wet night cobblestone & asphalt ground
    pxRect(ctx, 0, groundY - 2, w, h - groundY + 2, pal.groundMid);
    pxRect(ctx, 0, groundY - 2, w, 3, pal.groundHi);
    drawWetPuddlesAndReflections(ctx, w, groundY, h, env.puddles, timeSec, pal);
    // Warm amber glow pool reflected on puddle below lamp!
    drawPixelEllipse(ctx, lampX + 4, groundY + 22, 30, 6, "rgba(255, 206, 110, 0.28)");
  }

  // Sunbeams (Tyndall shafts during clear morning & after_rain_sunbeam)
  if (env.sunbeams > 0.2) {
    ctx.save();
    ctx.fillStyle = `rgba(255, 245, 204, ${(0.09 * env.sunbeams).toFixed(3)})`;
    for (let b = 0; b < 3; b++) {
      const bx = w * (0.15 + b * 0.28) - panX * 0.25;
      ctx.beginPath();
      ctx.moveTo(bx, 0);
      ctx.lineTo(bx + 36, 0);
      ctx.lineTo(bx + 112, h);
      ctx.lineTo(bx + 42, h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

export function drawClassroomInteriorLayer(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  panX: number,
  timeSec: number,
  env: SceneEnvParams,
  pal: ScenePalette
): void {
  const winW = Math.round(w * 0.62);
  const winBottom = Math.round(h * 0.72);
  const winTop = Math.round(h * 0.08);

  // Misty glass wash & falling rain droplets outside glass (in front of distant Boy!)
  ctx.save();
  ctx.fillStyle = "rgba(180, 212, 242, 0.18)";
  ctx.fillRect(0, winTop, winW, winBottom - winTop);
  ctx.restore();

  // Crawling window raindrops on glass
  for (let d = 0; d < 26; d++) {
    const rx = Math.round(12 + hash01(d * 17) * (winW - 24));
    const speed = 14 + hash01(d * 29) * 18;
    const ry = winTop + Math.round(((hash01(d * 7) * 200 + timeSec * speed) % (winBottom - winTop - 6)));
    pxRect(ctx, rx, ry, 1, 3, pal.rainColor);
    pxDot(ctx, rx, ry + 3, "#ffffff", 1);
  }

  // Classroom cream plaster wall around right half + below window sill
  pxRect(ctx, winW, 0, w - winW, h, "#cfc6b8");
  pxRect(ctx, 0, 0, w, winTop, "#c4baa8");
  pxRect(ctx, 0, winBottom, w, h - winBottom, "#b5aa98");

  // Chalkboard edge hint on far right
  pxRect(ctx, Math.round(w * 0.78 - panX * 0.1), Math.round(h * 0.14), w, Math.round(h * 0.44), "#2c4d41");
  pxRect(ctx, Math.round(w * 0.78 - panX * 0.1), Math.round(h * 0.14), 4, Math.round(h * 0.44), "#7d5b42");

  // Wooden window frames & vertical mullions
  const frameCol = "#694d38";
  pxRect(ctx, 0, winBottom - 4, winW + 4, 6, "#8c664a");
  pxRect(ctx, winW - 4, winTop, 6, winBottom - winTop, frameCol);
  pxRect(ctx, Math.round(winW * 0.5), winTop, 4, winBottom - winTop, frameCol);
  pxRect(ctx, 0, Math.round((winTop + winBottom) * 0.52), winW, 3, frameCol);

  // Translucent White Breeze Curtain billowing from right window edge!
  const curtainW = Math.round(28 + env.curtain * 24 + Math.sin(timeSec * 3.1) * 7);
  const cLeft = winW - curtainW;
  ctx.save();
  ctx.fillStyle = "rgba(244, 248, 255, 0.78)";
  ctx.beginPath();
  ctx.moveTo(winW, winTop);
  ctx.lineTo(winW - 14, winTop);
  for (let s = 0; s <= 10; s++) {
    const t = s / 10;
    const cy = winTop + (winBottom - winTop) * t;
    const wave = Math.sin(t * 4.5 - timeSec * 4.2) * (6 * env.curtain);
    ctx.lineTo(cLeft + wave + (1 - t) * 10, cy);
  }
  ctx.lineTo(winW, winBottom);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export interface ClassroomDeskAnchor {
  girlFootX?: number;
  girlFootY?: number;
  girlScale?: number;
}

export function drawSceneForeground(
  ctx: CanvasRenderingContext2D,
  inp: SceneFrameInput,
  deskAnchor?: ClassroomDeskAnchor
): void {
  const { scene, mood, w, h, timeSec, env } = inp;
  const pal = MOOD_PALETTES[mood];

  // Classroom wooden school desk properly scaled & positioned in front of seated Su Qing
  if (scene === "classroom_window" && deskAnchor?.girlFootY !== undefined) {
    const gs = deskAnchor.girlScale ?? 1.45;
    const gx = deskAnchor.girlFootX ?? Math.round(w * 0.56);
    const gy = deskAnchor.girlFootY;
    const deskW = Math.round(62 * gs);
    const deskX = Math.round(gx - deskW * 0.68);
    const deskY = Math.round(gy - 30 * gs);
    const legH = Math.round(gy - deskY - 2);
    // Wooden desk top + shelf box + steel legs
    pxRect(ctx, deskX, deskY, deskW, Math.max(4, Math.round(4 * gs)), "#9c734e");
    pxRect(ctx, deskX, deskY + Math.round(4 * gs), deskW, 2, "#5c3f29");
    pxRect(ctx, deskX + Math.round(5 * gs), deskY + Math.round(6 * gs), deskW - Math.round(10 * gs), Math.round(14 * gs), "#404552");
    pxRect(ctx, deskX + Math.round(3 * gs), deskY + Math.round(6 * gs), Math.max(2, Math.round(2.5 * gs)), legH, "#2b2f3b");
    pxRect(ctx, deskX + deskW - Math.round(6 * gs), deskY + Math.round(6 * gs), Math.max(2, Math.round(2.5 * gs)), legH, "#2b2f3b");
    // Open notebook & pencil on desk
    pxRect(ctx, deskX + Math.round(14 * gs), deskY - Math.round(2 * gs), Math.round(16 * gs), Math.max(2, Math.round(2 * gs)), "#eef2fa");
  }

  // Drifting leaves / cherry blossom petals driven by breeze (outdoors only)
  if (scene !== "classroom_window" && env.leaves > 0.08) {
    const count = Math.round(8 + env.leaves * 18);
    const col = mood === "clear_breeze" ? "#f9c0d2" : pal.treeHi;
    for (let i = 0; i < count; i++) {
      const speed = 28 + hash01(i * 13) * 32;
      const lx = Math.round((hash01(i * 5) * w + timeSec * speed * (0.6 + env.wind)) % (w + 16)) - 8;
      const ly = Math.round((hash01(i * 19) * h + timeSec * 14 + Math.sin(timeSec * 3 + i) * 6) % h);
      pxRect(ctx, lx, ly, i % 3 === 0 ? 3 : 2, 2, col);
    }
  }

  // Diagonal Pixel Rain + Ground Splash Crowns (outdoors only; classroom rain is outside window!)
  if (scene !== "classroom_window" && env.rain > 0.05) {
    const dropCount = Math.round(35 + env.rain * 135);
    const groundY = Math.round(h * inp.groundYRatio);
    for (let i = 0; i < dropCount; i++) {
      const speedY = 210 + hash01(i * 11) * 110;
      const dx = -2 - Math.round(env.wind * 2);
      const dy = 7 + Math.round(env.rain * 3);
      const rx = Math.round((hash01(i * 31) * (w + 80) - timeSec * (35 + env.wind * 55)) % (w + 40));
      const finalX = rx < 0 ? rx + w + 40 : rx;
      const ry = Math.round((hash01(i * 47) * h + timeSec * speedY) % h);
      drawPixelLine(ctx, finalX, ry, finalX + dx, ry + dy, pal.rainColor, 1);
      // Little crown splash near tarmac
      if (ry > groundY + 4 && hash01(i * 3 + Math.floor(timeSec * 12)) > 0.65) {
        pxDot(ctx, finalX - 1, groundY + 4 + (i % 24), "#ffffff", 1);
        pxDot(ctx, finalX + 1, groundY + 4 + (i % 24), "#ffffff", 1);
      }
    }
  }

  // Soft mood atmospheric tint
  ctx.save();
  ctx.fillStyle = pal.tintOverlay;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
