import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender } from "remotion";
import { ensureZpixLoaded } from "./fonts";
import { ARM, PROPS, drawBoy, drawGirl, type ExprName } from "./engine/CastEngine";
import { PALETTES } from "./engine/Palettes";
import { H, LW, PixelFB, W } from "./engine/PixelFB";

export const CharacterDesignSheet: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fb = useMemo(() => new PixelFB(), []);
  const [fontHandle] = useState(() => delayRender("Loading Zpix font for design sheet"));
  const [fontReady, setFontReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    ensureZpixLoaded()
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setFontReady(true);
          continueRender(fontHandle);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [fontHandle]);

  useLayoutEffect(() => {
    if (!fontReady) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    fb.begin(0.5, "midnight");
    fb.fill("#11172b");

    // 1. Boy 4 Views + Sit & Crouch Poses (Row 1)
    const views: Array<{ view: "front" | "q" | "side" | "back"; x: number }> = [
      { view: "front", x: 34 },
      { view: "q", x: 78 },
      { view: "side", x: 122 },
      { view: "back", x: 166 },
    ];
    views.forEach(({ view, x }) => {
      fb.footShadow(x, 112, 11);
      drawBoy(fb, x, 112, { view, face: "melancholy", tint: null, t: 0.5 });
    });
    fb.footShadow(208, 112, 12);
    drawBoy(fb, 208, 112, { view: "q", posture: "sit", face: "sad", tint: null, t: 0.5 });
    fb.footShadow(246, 112, 13);
    drawBoy(fb, 246, 112, { view: "q", posture: "crouch", face: "cry", tint: null, t: 0.5 });

    // 2. Boy Expressions Showcase (Row 2)
    const exprs: ExprName[] = ["neutral", "sad", "cry", "bitter_smile", "surprised", "happy"];
    exprs.forEach((face, idx) => {
      const x = 28 + idx * 42;
      fb.footShadow(x, 198, 11);
      drawBoy(fb, x, 198, { face, view: "front", tint: null, t: 0.5 });
    });

    // 3. Memory Girl 4 Views + Held Props (Row 3)
    const gViews: Array<{ view: "front" | "q" | "side" | "back"; x: number }> = [
      { view: "front", x: 36 },
      { view: "q", x: 82 },
      { view: "side", x: 128 },
      { view: "back", x: 174 },
    ];
    gViews.forEach(({ view, x }) => {
      fb.footShadow(x, 286, 10);
      drawGirl(fb, x, 286, { view, face: "melancholy", tint: null, t: 0.5 });
    });
    // Boy holding umbrella + Boy holding paper plane
    fb.footShadow(226, 286, 11);
    drawBoy(fb, 226, 286, {
      view: "q",
      face: "sad",
      arm: [ARM.down, 0.5],
      bend: [0.2, 0.9],
      hold: [null, (hx, hy) => PROPS.umbrella(fb, hx, hy, -0.05)],
      tint: null,
      t: 0.5,
    });

    // 4. Key Props Showcase (Row 4)
    fb.rect(18, 312, LW - 36, 48, "#171f38");
    PROPS.letter(fb, 42, 336, false, false);
    PROPS.letter(fb, 76, 336, true, false);
    PROPS.letter(fb, 110, 336, true, true);
    PROPS.whiteRose(fb, 144, 344, -Math.PI / 2);
    PROPS.briarRose(fb, 178, 342);
    PROPS.coffeeMug(fb, 212, 342);
    PROPS.paperPlane(fb, 244, 336, -0.2);

    // 5. All 5 Palette Swatches (Row 5)
    const palList = Object.values(PALETTES);
    palList.forEach((p, rIdx) => {
      const y = 376 + rIdx * 14;
      const swatches = [p.ink, ...p.sky.slice(0, 4), ...p.light.slice(0, 2), ...p.accent.slice(0, 2)];
      swatches.forEach((col, cIdx) => {
        fb.rect(20 + cIdx * 24, y, 20, 10, col);
      });
    });

    fb.end(ctx);

    // Crisp Zpix title & labels on overlay
    fb.pxText(ctx, "《我落泪·情绪零碎》角色与视觉设定表", 540, 36, { k: 2, align: "center", fg: "#ffd278", fs: 24 });
    fb.pxText(ctx, "林默 (正 / 3/4 / 侧 / 背 / 坐 / 跪哭)", 540, 470, { k: 1, align: "center", fg: "#d4d8e4", fs: 24 });
    fb.pxText(ctx, "微表情：平静 / 悲伤 / 落泪 / 苦笑 / 惊愕 / 释怀", 540, 818, { k: 1, align: "center", fg: "#d4d8e4", fs: 24 });
    fb.pxText(ctx, "记忆中的她 & 雨伞道具", 540, 1172, { k: 1, align: "center", fg: "#d4d8e4", fs: 24 });
    fb.pxText(ctx, "核心道具：诗页 / 折信 / 红章退信 / 白玫瑰 / 蔷薇 / 冷咖啡 / 纸飞机", 540, 1458, { k: 1, align: "center", fg: "#d4d8e4", fs: 24 });
    fb.pxText(ctx, "五幕调色盘：深夜书房 / 暖秋回忆 / 冷雨咖啡 / 霓虹暴雪 / 破晓天桥", 540, 1812, { k: 1, align: "center", fg: "#ffd278", fs: 24 });
  }, [fb, fontReady]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#060812" }}>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ width: "100%", height: "100%", imageRendering: "pixelated", display: "block" }}
      />
    </AbsoluteFill>
  );
};
