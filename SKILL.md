---
name: pixel-cinema-mv
description: End-to-end production workflow (v2.0) for creating authentic 16-bit/32-bit discrete pixel-art narrative music videos (MV) in Remotion + Python without game HUDs. Features a pure Uint32Array software pixel framebuffer (270x480 -> 4x nearest-neighbor 1080x1920), 4x4/8x8 Bayer ordered dithering, selective-hue 1px auto-outlines, causal physical prop storytelling, Whisper word-level vocal onset sync, Zpix pixel Chinese subtitles, BT.709 color delivery, and automated film_gate + OpenCV motion QA. 中文触发：像素风MV工作流、像素小人MV、无HUD音乐短片、竖屏横屏像素MV、复刻落泪MV流程。
license: MIT
---

# Pixel Cinema MV v2.0 — Software Pixel Framebuffer & Whisper-Synced MV Workflow

Create cinematic, HUD-free 16-bit/32-bit indie pixel-art narrative music videos synced to **exact Whisper vocal onsets** and audio beats, rendered via a deterministic `Uint32Array` software pixel framebuffer (`270×480` → `×4` nearest-neighbor `1080×1920`, `30 fps`, BT.709).

---

## Core Engineering & Aesthetic Rules (Non-Negotiable)

1. **Pure `Uint32Array` Software Pixel Framebuffer (Zero Mixels / Zero CSS Blur)**
   - Draw every background, light cone, weather particle, prop, and character onto an integer logical framebuffer (`270×480` for 9:16 portrait, `480×270` for 16:9 landscape) via `templates/pixel_fb_engine/src/engine/PixelFB.ts`.
   - Upscale strictly `4×` via `imageRendering: "pixelated"` + `--image-format=png` lossless intermediate frames.
   - Use ordered `4×4` / `8×8` Bayer dithering for night skies, streetlamp cones, and sunrise halos; use `beginSpr()`/`endSpr()` for automatic 1px selective-hue pixel outlines and `punch(2)` for crisp `2×` integer close-ups.

2. **Whisper Exact Vocal-Onset Sync (Never Trust Unverified Internet LRC)**
   - Always run `scripts/transcribe_whisper_sync.py` directly on the user's local audio track (`ffmpeg` float32 PCM decode → local `faster-whisper` with `word_timestamps=True`).
   - Map every lyric cue and every individual Chinese character's `at` timestamp directly to the real sung onset in the extracted clip so `Zpix` character bounce highlights fire on the exact syllable.

3. **Causal Physical Storytelling & Zero Game HUD**
   - Every shot follows a strict causal chain (`Trigger → Action → Contact/Feedback → Result → Transition`), never static slideshow/Ken Burns panning.
   - Zero HUD clutter (`STAGE`, `BPM`, `SCORE`, `MEMORY LOG` are strictly forbidden).
   - Keep main action in the vertical `14%–72%` safe zone and place `Zpix` binary-edged pixel subtitles in `74%–84%` (clearing Douyin/TikTok bottom caption & right icon zones).

4. **Anti-Dead-Gap Integer Camera Rule**
   - Because `camAt()` snaps to integer logical pixels (`Math.round`), never leave a slow scene camera static or stalled at a sine extremum for `> 1.0s`.
   - Combine steady linear camera drift (`>= 0.8 px/s`) with continuous ambient motion (window rain streaks, swaying curtains, lamp dust motes, drifting leaves/snow) so `film_gate.py` clears `dead_gap <= 1.0s` and `moving_share >= 0.90`.

5. **Standardized Naming, Clean `output/` (MP4-Only), & BT.709 Delivery**
   - Tag final H.264 MP4 with `-color_primaries bt709 -color_trc bt709 -colorspace bt709`.
   - Deliver final video named **`<歌曲名字>-<时长>s.mp4`** (e.g., `TAKE_ME-90s.mp4`, `我落泪情绪零碎-96s.mp4`) **directly inside `/Users/eagle/Desktop/Video/output/`** — keep `/Users/eagle/Desktop/Video/output/` strictly **`.mp4` files only** so the user can open/preview finished videos immediately.
   - Place all companion non-MP4 outputs (`.srt`, `.lrc`, `_contact_sheet.png`, `_qa_report.json`, `_timeline.json`) inside `/Users/eagle/Desktop/Video/workspace_assets/output_extras/` instead of cluttering `output/`.

---

## 7-Phase Production Pipeline

### Phase 1: Audio Inspection & Whisper Exact Sync
1. Check `audio/` for the user's licensed track (if missing, synthesize a tempo-matched temporary OST and provide `scripts/swap_audio.py`).
2. Slice the target emotional highlight (`60s–96s`) with `ffmpeg` (`-ar 44100 -ac 2`, smooth fade-in/out).
3. Run `scripts/transcribe_whisper_sync.py` on the exact clip to extract word/character timestamps:
   ```bash
   python scripts/transcribe_whisper_sync.py \
     --audio audio/song.mp3 --start 43.0 --duration 96.0 \
     --model small --out docs/whisper_exact.json
   ```
4. Extract BPM, beats, and RMS energy via `song_facts.py`.

### Phase 2: Storyboard, Palette Constitution & Timeline
1. Author `TASTE.md` (5-act color palettes, character canon, anti-slop rules) and `STORYBOARD.md` (4–6 fixed main scenes + causal shot table).
2. Generate `src/data/lyrics_timeline.json`, `.srt`, and `.lrc` with exact Whisper character `at` timestamps and shot boundaries aligned to real vocal transitions.

### Phase 3: Visual Design & Still Inspection
1. Scaffold from `templates/pixel_fb_engine/` (`PixelFB.ts`, `Palettes.ts`, `CastEngine.ts`, `Scenes.ts`, `fonts.ts`).
2. Run `npm run typecheck` and render `CharacterDesignSheet` + key scene stills (`remotion still`) and visually inspect character proportions, bangs/eyes clarity, and subtitle safe zones.

### Phase 4: 10-Second Pilot Sample Check
Render `frames=0-299` (`10s`) first to verify `Zpix` font loading, audio sync, and integer pixel crispness before committing to a full render:
```bash
npx remotion render src/index.ts LuoleiPixelMV-9x16 qc/pilot_10s.mp4 \
  --frames=0-299 --image-format=png --codec=h264 --audio-codec=aac --crf=16 --overwrite
```

### Phase 5: Full Render & BT.709 Packaging
```bash
npx remotion render src/index.ts LuoleiPixelMV-9x16 output/raw.mp4 \
  --image-format=png --codec=h264 --audio-codec=aac --crf=16 --overwrite

ffmpeg -y -i output/raw.mp4 -c:v copy -c:a copy \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
  "output/<歌曲名字>-<时长>s.mp4"
```

### Phase 6: Automated QA Gate & Contact Sheet Sign-Off
Run `scripts/verify_mv_v2.py` to enforce:
- `dead_gap <= 1.0s` (zero frozen spans)
- `flicker` (`0` luminance spikes)
- `slideshow` (`moving_share >= 0.60`, target `1.0`)
- `delivery` (`bt709=True`, CFR `30fps`, `av_offset_ms=0.0`)
- Visually inspect `qc/final_contact_sheet.png` across 12 sampled keyframes before delivery.
