---
name: pixel-cinema-mv
description: End-to-end production workflow for creating authentic 16-bit/32-bit discrete pixel-art narrative music videos (MV) in Remotion + Python without game HUDs. Covers audio/beat/syllable alignment, 3-level timeline generation, discrete Pixel-Grid character sprites with 4-frame walk/acting cycles, multi-layer campus/narrative scenes with weather & depth occlusion, 4x integer nearest-neighbor 16:9 (1920x1080) & recomposed 9:16 (1080x1920) rendering, and OpenCV + ffprobe motion QA. 中文触发：像素风MV工作流、像素小人MV、无HUD音乐短片、竖屏横屏像素MV。
license: MIT
---

# Pixel Cinema MV — Discrete Pixel-Grid Music Video Workflow

Create narrative, HUD-free 16-bit/32-bit indie pixel-art music videos synced to real audio beats and character-level lyric timings, outputting crisp integer-scaled **16:9 (`1920×1080`)** and dedicated recomposed **9:16 (`1080×1920`)** MP4s.

---

## Core Design Principles (Non-Negotiable)

1. **Pure Discrete Pixel-Grid Characters (No Vector Curves/Capsules)**
   - Render characters on a discrete integer cell grid (e.g., `56×62` cells) using run-length horizontal spans, automated 4-neighbor `1`-cell `#151320` outline dilation, and integer `cellSize` scaling (`2~4 px` per cell depending on shot scale).
   - Keep forehead/bangs strictly above eyebrows (`y_bangs_bottom < y_brows`), use `2×3` eyes with `1×1` white catchlights, cheek blush, expressive mouths, and 4-frame walk cycles with 1-cell vertical bobbing.
2. **Exact Integer Canvas Scaling (`4×` Nearest-Neighbor)**
   - `16:9`: Logical `<canvas width={480} height={270}>` → `1920×1080` (`imageRendering: "pixelated"`, `--image-format=png`).
   - `9:16`: Logical `<canvas width={270} height={480}>` → `1080×1920` (recomposed vertical framing—never blind center-cropping!).
3. **Zero Game HUD / UI Chrome**
   - No `STAGE`, `SHOT`, `BPM`, `MEMORY LOG`, or progress bars.
   - Render only clean, borderless cinema subtitles (`PingFang SC` / `Noto Sans SC`) with subtle per-character gold sweep during vocal spans and hidden during instrumental gaps.
4. **Stepped Pixel Backgrounds & Physical Depth Ordering**
   - Clouds use `3×3` stepped pixel clusters; trees use `2×2` clustered pixel foliage + leaf dots; skies use ordered `4×4` Bayer dithering.
   - Indoor/window scenes clip rain strictly outside windowpanes and layer exterior passersby *behind* glass mullions & billowing curtains.
5. **Dedicated 9:16 Portrait Re-composition**
   - Pull ground horizon to `~68%` height so tall sky/trees breathe above and subtitles sit safely below (`bottom: 22%`).
   - Enforce minimum horizontal separation (`minHalfSep`) between co-visible characters so faces never overlap on narrow portrait frames.

---

## 6-Phase Execution Pipeline

### Phase 1: Audio & Lyric Alignment
1. Slice or load target audio (`audio_clip_60s.wav`), extract `bpm` and beat timestamps (`audio_analysis.json`).
2. Align verified Chinese/target lyric lines with exact character-by-character onset/offset timestamps (`lyrics_alignment.json`).

### Phase 2: 3-Level Timeline Generation
Run `scripts/build_qingtian_timeline.py` (or adapt `SHOTS_SPEC` + `CORRECTED_LYRICS_SPEC` for a new song) to generate:
- `timeline_master.json` (master frame-exact schedule consumed by Remotion & QA)
- `timeline_shots.csv` (shot-by-shot audit table)
- `lyrics_alignment.json`, `character_actions.json`, `scene_events.json`

### Phase 3: Visual Design Inspection (Before Video Render)
Typecheck and render a character design sheet + 1 representative still per scene:
```bash
npx tsc --noEmit
npx remotion still QingtianDesignSheet qc_strips/character_design_sheet.png --image-format=png --overwrite
npx remotion still QingtianCinema-16x9 qc_strips/scene_01.png --frame=125 --image-format=png --overwrite
```
Inspect stills visually before full rendering to verify bangs/eyes clarity, outfit consistency, rain occlusion, and subtitle clearance.

### Phase 4: 10-Second Pilot Sample Verification
Render a `300`-frame (`10s`) high-interaction segment and inspect extracted frames:
```bash
npx remotion render QingtianCinema-16x9 output/pilot_10s.mp4 \
  --frames=0-299 --image-format=png --codec=h264 --crf=16 --overwrite
```

### Phase 5: Full 16:9 & Recomposed 9:16 Production Renders
Never overwrite prior milestone renders when iterating; export versioned filenames:
```bash
npx remotion render QingtianCinema-16x9 output/mv_16x9.mp4 --image-format=png --codec=h264 --crf=16 --overwrite
npx remotion render QingtianCinema-9x16 output/mv_9x16.mp4 --image-format=png --codec=h264 --crf=16 --overwrite
```

### Phase 6: Automated QA & Frame Audit
Run `scripts/verify_cinema_mv.py` to validate:
- `ffprobe` container, resolution (`1920×1080` / `1080×1920`), `30 fps`, duration parity, and AAC audio.
- OpenCV per-shot luminance frame difference (`mean_luma_diff > 0.25` across all shots, guaranteeing zero frozen/static shots).
- Keyframe PNG extraction for both `16:9` and `9:16` visual sign-off.
