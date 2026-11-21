import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

let fontPromise: Promise<void> | null = null;

export function ensureZpixLoaded(): Promise<void> {
  if (!fontPromise) {
    fontPromise = loadFont({
      family: "Zpix",
      url: staticFile("fonts/zpix.ttf"),
      format: "truetype",
      weight: "400",
      style: "normal",
    }).then(async () => {
      // Pre-warm glyph atlas in Chrome before frame capture
      await document.fonts.load('24px "Zpix"', "我落泪情绪零碎随手撕下这一页");
    });
  }
  return fontPromise;
}
