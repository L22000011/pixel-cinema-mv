# pixel-cinema-mv

> An Antigravity / AI Agent Skill & complete Remotion + Python workflow for producing **HUD-free, 16-bit/32-bit discrete pixel-art narrative music videos (MV)** synced to real audio beats and character-level lyric timings.

## Features

- **Pure Discrete Pixel-Grid Characters (`SpriteGrid`)**: `56×62` integer pixel matrix with automatic 4-neighbor `1px` `#151320` outline dilation, 4-frame walk cycles, expressive `2×3` eyes + catchlights, blush, sunset rim pixels, and full acting props (bags, ribbons, folded/open/shared umbrellas).
- **Exact `4×` Integer Scaling**: `480×270` (`16:9` → `1920×1080`) and dedicated recomposed `270×480` (`9:16` → `1080×1920`) rendered onto HTML5 `<canvas>` with `image-rendering: pixelated` and lossless PNG intermediates.
- **Zero Game HUD**: Pure cinema framing with clean borderless lyrics and per-character gold sweep highlights (hidden during instrumental gaps).
- **3-Level Audio-Synced Timeline**: Python generator produces `timeline_master.json`, `timeline_shots.csv`, `lyrics_alignment.json`, `character_actions.json`, and `scene_events.json`.
- **Automated QA**: `ffprobe` container/stream verification + OpenCV per-shot motion activity checks (`verify_cinema_mv.py`).

## Repository Structure

```text
pixel-cinema-mv/
├── SKILL.md                  # Agent Skill definition (installable via ~/.gemini/config/skills/)
├── WORKFLOW_SUMMARY.md       # Full end-to-end production workflow & architecture summary (ZH)
├── README.md                 # Repo overview & quickstart
├── references/
│   └── architecture.md       # Pixel-grid, 9:16 re-composition & depth occlusion rules
├── scripts/
│   ├── build_qingtian_timeline.py   # 3-level timeline & lyric alignment builder
│   └── verify_cinema_mv.py          # ffprobe + OpenCV motion QA script
└── templates/
    └── qingtian_cinema/             # Complete Remotion TypeScript canvas pixel engine
```

## Install as an Antigravity Skill

```bash
ln -s "$(pwd)" ~/.gemini/config/skills/pixel-cinema-mv
```

See [WORKFLOW_SUMMARY.md](WORKFLOW_SUMMARY.md) for the complete step-by-step production pipeline and render commands.
