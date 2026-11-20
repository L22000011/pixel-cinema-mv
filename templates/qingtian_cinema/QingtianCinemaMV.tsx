import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { ensureMvFontsLoaded, SANS_FONT } from "../fonts";
import { renderCharacterToContext } from "./CharacterRenderer";
import { MOOD_PALETTES, clamp } from "./palette";
import {
  drawClassroomInteriorLayer,
  drawSceneBackground,
  drawSceneForeground,
} from "./SceneRenderer";
import { evaluateTimelineAtFrame, TimelineMaster } from "./TimelineController";
import timelineData from "./timeline_master.json";

export type QingtianCinemaProps = {
  orientation: "16x9" | "9x16";
};

const MASTER = timelineData as unknown as TimelineMaster;

export const QingtianCinemaMV: React.FC<QingtianCinemaProps> = ({
  orientation,
}) => {
  ensureMvFontsLoaded();
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const evalState = evaluateTimelineAtFrame(MASTER, frame, orientation);
  const { w, h, panX, panY, groundYRatio, animTick, shot, timeSec, env } = {
    ...evalState,
    env: evalState.shot.environment,
  };

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);

    const sceneInput = {
      scene: shot.scene,
      mood: shot.mood,
      w,
      h,
      panX,
      panY,
      timeSec,
      animTick,
      env,
      groundYRatio,
    };

    // Layer 0..2: Sky, horizon, far architecture, outdoor trees & wet tarmac
    drawSceneBackground(ctx, sceneInput);

    // Special depth ordering for classroom_window: boy walks outside windowpanes!
    if (shot.scene === "classroom_window") {
      if (evalState.boy) {
        renderCharacterToContext(ctx, evalState.boy);
      }
      drawClassroomInteriorLayer(
        ctx,
        w,
        h,
        panX,
        timeSec,
        env,
        MOOD_PALETTES[shot.mood]
      );
      if (evalState.girl) {
        renderCharacterToContext(ctx, evalState.girl);
      }
      drawSceneForeground(ctx, sceneInput, {
        girlFootY: evalState.girl?.footY,
        girlScale: evalState.girl?.scale,
        girlFootX: evalState.girl?.footX,
      });
    } else {
      // Outdoor depth: render back character first, front character second
      if (evalState.boy && evalState.girl) {
        if (evalState.boy.footY <= evalState.girl.footY) {
          renderCharacterToContext(ctx, evalState.boy);
          renderCharacterToContext(ctx, evalState.girl);
        } else {
          renderCharacterToContext(ctx, evalState.girl);
          renderCharacterToContext(ctx, evalState.boy);
        }
      } else {
        if (evalState.boy) renderCharacterToContext(ctx, evalState.boy);
        if (evalState.girl) renderCharacterToContext(ctx, evalState.girl);
      }
      drawSceneForeground(ctx, sceneInput);
    }

    // Subtle film opening fade-in (0.0 -> 0.45s) and closing fade-out (58.8 -> 60.0s)
    if (timeSec < 0.45) {
      const a = clamp(1 - timeSec / 0.45, 0, 1);
      ctx.fillStyle = `rgba(12, 14, 24, ${a.toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);
    } else if (timeSec > 58.8) {
      const a = clamp((timeSec - 58.8) / 1.15, 0, 1);
      ctx.fillStyle = `rgba(12, 14, 24, ${a.toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);
    }
  }, [frame, orientation, w, h, panX, panY, groundYRatio, animTick, shot, timeSec, env, evalState]);

  const activeLyric = evalState.activeLyric;
  const sungProgress = evalState.sungCharProgress;

  // Clean cinema subtitle fade at phrase onset/offset (zero HUD!)
  let subOpacity = 0;
  if (activeLyric) {
    const fadeIn = clamp((timeSec - activeLyric.start) / 0.14, 0, 1);
    const fadeOut = clamp((activeLyric.end - timeSec) / 0.18, 0, 1);
    subOpacity = Math.min(fadeIn, fadeOut);
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0c0e18",
        overflow: "hidden",
      }}
    >
      <Audio src={staticFile("qingtian/audio_clip_60s.wav")} />

      {/* Crisp 4x Nearest-Neighbor Integer Canvas */}
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

      {/* Minimal Cinema Subtitles ONLY (no stage badges, no BPM, no logs, no boxes) */}
      {activeLyric && subOpacity > 0.01 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: orientation === "16x9" ? "3.8%" : "22%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            pointerEvents: "none",
            opacity: subOpacity,
            padding: "0 48px",
          }}
        >
          <div
            style={{
              fontFamily: `${SANS_FONT}, "PingFang SC", "Noto Sans SC", sans-serif`,
              fontSize: orientation === "16x9" ? 44 : 42,
              fontWeight: 600,
              letterSpacing: orientation === "16x9" ? "0.10em" : "0.08em",
              lineHeight: 1.25,
              textAlign: "center",
              textShadow:
                "0 2px 6px rgba(8, 10, 20, 0.92), 0 -1px 3px rgba(8, 10, 20, 0.78), 2px 0 3px rgba(8, 10, 20, 0.78), -2px 0 3px rgba(8, 10, 20, 0.78)",
              whiteSpace: "pre",
            }}
          >
            {activeLyric.chars.map((ch, idx) => {
              const lit = idx < Math.floor(sungProgress);
              const partial = idx === Math.floor(sungProgress) ? sungProgress % 1 : 0;
              const isHighlighted = lit || partial > 0.35;
              return (
                <span
                  key={`${activeLyric.id}_${idx}`}
                  style={{
                    color: isHighlighted ? "#ffe39c" : "#f7f6f2",
                    transition: "none",
                  }}
                >
                  {ch.char}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
