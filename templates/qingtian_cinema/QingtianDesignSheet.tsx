import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { renderCharacterToContext } from "./CharacterRenderer";

export const QingtianDesignSheet: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const w = 480;
  const h = 270;

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#5d7388";
    ctx.fillRect(0, 0, w, h);

    // Subtle ground stage band
    ctx.fillStyle = "#48596b";
    ctx.fillRect(0, 128, w, 4);
    ctx.fillRect(0, 250, w, 4);

    const boySamples = [
      { x: 48, pose: "walk", expr: "neutral_gentle", prop: "bag", step: 0.15, rim: 0 },
      { x: 118, pose: "reach_hand_walk", expr: "warm_smile", prop: "bag", step: 0.35, rim: 0 },
      { x: 188, pose: "shield_rain", expr: "surprised_worry", prop: "bag", step: 0.0, rim: 0 },
      { x: 258, pose: "lean_rail_gaze", expr: "warm_wistful", prop: "bag", step: 0.0, rim: 0.9 },
      { x: 328, pose: "hold_umbrella_close", expr: "sad", prop: "shared_umbrella", step: 0.0, rim: 0 },
      { x: 412, pose: "stand_watch_fade", expr: "bittersweet_smile", prop: "bag", step: 0.0, rim: 0 },
    ];

    boySamples.forEach((b, i) => {
      renderCharacterToContext(ctx, {
        role: "boy",
        footX: b.x,
        footY: 128,
        facing: i === 5 ? "left" : "right",
        pose: b.pose,
        expression: b.expr,
        prop: b.prop,
        handTarget: "swing",
        scale: 1.08,
        stepPhase: b.step,
        wind: 0.45,
        animTick: 8,
        blinking: false,
        sunsetRim: b.rim,
      });
    });

    const girlSamples = [
      { x: 48, pose: "walk", expr: "soft_smile", prop: "folded_umbrella", step: 0.25, rim: 0 },
      { x: 118, pose: "glance_shy_walk", expr: "blush_smile", prop: "folded_umbrella", step: 0.4, rim: 0 },
      { x: 188, pose: "open_umbrella", expr: "wistful", prop: "open_umbrella", step: 0.0, rim: 0 },
      { x: 258, pose: "sunset_wind_hair", expr: "warm_smile", prop: "none", step: 0.0, rim: 0.9 },
      { x: 328, pose: "sit_desk_gaze", expr: "wistful", prop: "none", step: 0.0, rim: 0 },
      { x: 412, pose: "wave_then_walk_away", expr: "sad_smile", prop: "open_umbrella", step: 0.25, rim: 0 },
    ];

    girlSamples.forEach((g, i) => {
      renderCharacterToContext(ctx, {
        role: "girl",
        footX: g.x,
        footY: 250,
        facing: i === 1 || i === 4 ? "left" : "right",
        pose: g.pose,
        expression: g.expr,
        prop: g.prop,
        handTarget: "hold",
        scale: 1.08,
        stepPhase: g.step,
        wind: 0.65,
        animTick: 8,
        blinking: false,
        sunsetRim: g.rim,
      });
    });
  }, []);

  return (
    <AbsoluteFill style={{ backgroundColor: "#5d7388" }}>
      <canvas
        ref={canvasRef}
        width={w}
        height={h}
        style={{
          width: "100%",
          height: "100%",
          imageRendering: "pixelated",
          display: "block",
        }}
      />
    </AbsoluteFill>
  );
};
