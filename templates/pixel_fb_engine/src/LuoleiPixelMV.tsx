import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ensureZpixLoaded } from "./fonts";
import { H, PixelFB, W } from "./engine/PixelFB";
import { renderPixelWorldAt } from "./engine/Scenes";
import timelineData from "./data/lyrics_timeline.json";

export interface LuoleiMVProps {
  audioFile?: string;
}

const DEFAULT_AUDIO = (timelineData as { audioFile?: string }).audioFile || "audio/luolei_temp_ost.wav";

export const LuoleiPixelMV: React.FC<LuoleiMVProps> = ({ audioFile = DEFAULT_AUDIO }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fb = useMemo(() => new PixelFB(), []);

  const [fontHandle] = useState(() => delayRender("Loading Zpix pixel font"));
  const [fontReady, setFontReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    ensureZpixLoaded()
      .catch((err) => {
        console.warn("Zpix font load warning:", err);
      })
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
    const t = frame / fps;
    renderPixelWorldAt(fb, ctx, t);
  }, [fb, fontReady, frame, fps]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#060812", overflow: "hidden" }}>
      <Audio src={staticFile(audioFile)} />
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
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
