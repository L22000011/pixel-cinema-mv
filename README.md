# pixel-cinema-mv (v2.0)

An Antigravity / Claude Code **end-to-end production skill** for creating authentic **16-bit/32-bit discrete pixel-art narrative Music Videos (MV)** in **Remotion + Python**, outputting crisp `4×` nearest-neighbor **9:16 (`1080×1920`, Douyin/TikTok ready)** and **16:9 (`1920×1080`)** MP4s with **Whisper exact vocal-onset lyric sync** and automated `film_gate` QA.

## What's New in v2.0

- **Pure `Uint32Array` Software Pixel Framebuffer (`templates/pixel_fb_engine/`)**:
  - Native `270×480` → `×4` nearest-neighbor `1080×1920` (`imageRendering: "pixelated"`), zero mixels or vector blur.
  - `4×4` / `8×8` ordered Bayer dithering for night skies, streetlamp cones, and sunrise halos.
  - `beginSpr()`/`endSpr()` automatic 1px selective-hue pixel outline + `punch(2)` crisp integer close-ups.
  - 4-view (`front`, `q`, `side`, `back`) character acting rig with 16 facial expressions & causal physical props.
  - `Zpix` bitmap-quantized Chinese pixel subtitles with vocal-onset bounce highlight.
- **Whisper Exact Vocal-Onset Sync (`scripts/transcribe_whisper_sync.py`)**:
  - Decodes local `.mp3`/`.wav`/`.flac` via `ffmpeg` float32 PCM pipe into local `faster-whisper` (`word_timestamps=True`) to eliminate internet LRC offset errors.
- **Automated `film_gate` + OpenCV QA (`scripts/verify_mv_v2.py`)**:
  - Enforces `dead_gap <= 1.0s`, `flicker == 0`, `moving_share >= 0.6` (`1.0` target), BT.709 tags, CFR `30fps`, and exports a 12-frame visual contact sheet.

## Repository Structure

```text
pixel-cinema-mv/
├── SKILL.md                          # v2.0 Agent skill specification & 6-phase pipeline
├── WORKFLOW_SUMMARY.md               # Architecture & lessons learned
├── references/architecture.md        # Framebuffer & timeline technical notes
├── scripts/
│   ├── transcribe_whisper_sync.py    # ffmpeg + local faster-whisper word-level onset extractor
│   ├── verify_mv_v2.py               # ffprobe + film_gate + OpenCV motion + contact sheet QA
│   ├── swap_audio.py                 # One-command licensed audio hot-swap & re-render
│   ├── build_qingtian_timeline.py    # 3-level timeline generator (v1 reference)
│   └── verify_cinema_mv.py           # v1 OpenCV motion QA
└── templates/
    ├── pixel_fb_engine/              # v2.0 Uint32Array software pixel framebuffer engine & cast rig
    └── qingtian_cinema/              # v1.0 SpriteGrid reference template
```

## Install as an Antigravity Skill

```bash
git clone https://github.com/L22000011/pixel-cinema-mv.git ~/.gemini/config/skills/pixel-cinema-mv
```

Once installed, simply ask your agent to make a pixel-art MV for any song (e.g., *"用 pixel-cinema-mv 制作周杰伦《我落泪情绪零碎》9:16 竖屏像素 MV"*).
