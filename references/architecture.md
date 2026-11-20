# Pixel Cinema MV — Architecture & Craft Notes

## 1. Integer Canvas & Lossless Pixel Pipeline
- Always render on an exact integer divisor of target HD resolution:
  - **16:9**: `480 × 270` logical canvas × `4` = `1920 × 1080`
  - **9:16**: `270 × 480` logical canvas × `4` = `1080 × 1920`
- Set `ctx.imageSmoothingEnabled = false` and CSS `image-rendering: pixelated`.
- Render Remotion with `--image-format=png` so intermediate frames do not suffer JPEG mosquito noise around crisp `1px` character outlines.

## 2. Discrete `SpriteGrid` Rules
- Never use smooth vector strokes (`arc`, `ellipse`, `quadraticCurveTo`) for pixel characters; plot onto a discrete `SpriteGrid` and draw horizontal run-length `fillRect` spans scaled by integer `cellSize`.
- Apply automatic 4-neighbor `#151320` outline dilation *after* plotting body/clothes/hair/props.
- Keep bangs ending strictly above eyebrow rows (`y_bangs <= y_brows - 1`) so eyes (`2×3` + `1×1` catchlight) and expressions always read cleanly on bright skin.

## 3. Depth & Weather Occlusion
- **Indoor/Window Scenes**:
  1. Draw distant sky, clouds, and exterior trees.
  2. Draw exterior rain clipped to `[0..winW, 0..winBottom]` and exterior passersby (`globalAlpha ≈ 0.62` behind glass).
  3. Draw glass tint, crawling window droplets, mullions, interior wall, and billowing curtain.
  4. Draw indoor seated character + foreground desk scaled proportionally to `girl.scale`.
- Never allow outdoor diagonal rain or leaves to render across dry interior plaster/chalkboard layers.

## 4. Dedicated 9:16 Portrait Re-composition
- Do not crop a `16:9` render to `9:16`.
- Lower ground plane to `~68%` of `480px` height (`groundYRatio = 0.68`) so sky/clouds/canopy breathe at the top and vertical subtitles sit safely in the bottom `22%` safe zone.
- Enforce minimum horizontal separation (`minHalfSep`) between co-visible characters so faces never overlap on narrow `270px` width, tightening slightly (`~0.095`) only for shared-umbrella close holds.
