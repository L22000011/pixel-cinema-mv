import React from "react";
import { Composition } from "remotion";
import { LuoleiPixelMV } from "./LuoleiPixelMV";
import { CharacterDesignSheet } from "./CharacterDesignSheet";
import timelineData from "./data/lyrics_timeline.json";

const META = timelineData as { fps: number; totalFrames: number; width: number; height: number; audioFile: string };

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LuoleiPixelMV-9x16"
        component={LuoleiPixelMV}
        durationInFrames={META.totalFrames || 2160}
        fps={META.fps || 30}
        width={META.width || 1080}
        height={META.height || 1920}
        defaultProps={{
          audioFile: META.audioFile || "audio/luolei_temp_ost.wav",
        }}
      />
      <Composition
        id="CharacterDesignSheet"
        component={CharacterDesignSheet}
        durationInFrames={1}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
