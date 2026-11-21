#!/usr/bin/env python3
"""
Replace the temporary OST with a user-supplied licensed audio track (and optional .lrc)
for 《我落泪·情绪零碎》, re-running beat/energy analysis via song_facts.py and updating
src/data/lyrics_timeline.json + public/audio/.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

ROOT_DIR = Path(__file__).resolve().parents[1]
FFMPEG_BIN = "/Users/eagle/Desktop/Video/bin/ffmpeg"
FFPROBE_BIN = "/Users/eagle/Desktop/Video/bin/ffprobe"
PYTHON_BIN = "/Users/eagle/Desktop/Video/AI-MV-Workflow/.venv312/bin/python"
SONG_FACTS = "/Users/eagle/.gemini/antigravity/scratch/song-video-director/skills/video-director/scripts/song_facts.py"


def parse_lrc(lrc_path: Path, clip_start: float, clip_dur: float) -> List[Tuple[float, str]]:
    pat = re.compile(r"\[(\d+):(\d+(?:\.\d+)?)\](.*)")
    rows: List[Tuple[float, str]] = []
    for raw in lrc_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        m = pat.match(raw.strip())
        if not m:
            continue
        t_abs = int(m.group(1)) * 60.0 + float(m.group(2))
        text = m.group(3).strip()
        if not text:
            continue
        t_rel = t_abs - clip_start
        if -0.2 <= t_rel < clip_dur:
            rows.append((max(0.0, t_rel), text))
    rows.sort(key=lambda x: x[0])
    return rows


def main() -> int:
    ap = argparse.ArgumentParser(description="Swap temporary OST with licensed audio for Luolei Pixel MV.")
    ap.add_argument("--audio", required=True, help="Path to licensed audio file (.mp3/.wav/.flac/.m4a)")
    ap.add_argument("--start", type=float, default=0.0, help="Highlight start offset in seconds (default 0.0)")
    ap.add_argument("--duration", type=float, default=72.0, help="Target clip duration in seconds (default 72.0)")
    ap.add_argument("--lrc", default=None, help="Optional .lrc file aligned to original full track")
    ap.add_argument("--render", action="store_true", help="Also run Remotion final render after swapping")
    args = ap.parse_args()

    src_audio = Path(args.audio).expanduser().resolve()
    if not src_audio.exists():
        print(f"ERROR: audio file not found: {src_audio}", file=sys.stderr)
        return 2

    out_wav = ROOT_DIR / "public" / "audio" / "luolei_licensed_clip.wav"
    out_wav.parent.mkdir(parents=True, exist_ok=True)

    # Extract deterministic PCM WAV clip of exact duration
    subprocess.run(
        [
            FFMPEG_BIN,
            "-y",
            "-ss",
            f"{args.start:.3f}",
            "-t",
            f"{args.duration:.3f}",
            "-i",
            str(src_audio),
            "-ar",
            "44100",
            "-ac",
            "2",
            "-af",
            f"afade=t=in:st=0:d=0.25,afade=t=out:st={max(0.0, args.duration - 1.5):.3f}:d=1.5",
            str(out_wav),
            "-loglevel",
            "error",
        ],
        check=True,
    )

    # Re-run song_facts.py
    facts_out = ROOT_DIR / "src" / "data" / "song_facts.json"
    env_cmd = [
        PYTHON_BIN,
        "-I",
        SONG_FACTS,
        "--audio",
        str(out_wav),
        "--out",
        str(facts_out),
        "--fps",
        "30",
        "--bpm-range",
        "60,150",
    ]
    subprocess.run(env_cmd, check=True, env={"PATH": "/Users/eagle/Desktop/Video/bin:/usr/bin:/bin"})
    (ROOT_DIR / "docs" / "song_facts.json").write_text(facts_out.read_text(encoding="utf-8"), encoding="utf-8")

    # Update lyrics_timeline.json
    tl_path = ROOT_DIR / "src" / "data" / "lyrics_timeline.json"
    tl = json.loads(tl_path.read_text(encoding="utf-8"))
    tl["audioFile"] = "audio/luolei_licensed_clip.wav"
    tl["audioNote"] = f"Licensed audio clip ({src_audio.name}, {args.start:.2f}s..{args.start + args.duration:.2f}s)"
    facts = json.loads(facts_out.read_text(encoding="utf-8"))
    tl["beats"] = facts.get("beats", tl.get("beats", []))
    tl["bpm"] = facts.get("bpm", tl.get("bpm"))

    if args.lrc:
        lrc_rows = parse_lrc(Path(args.lrc).expanduser().resolve(), args.start, args.duration)
        if lrc_rows:
            new_lyrics = []
            for idx, (st_t, txt) in enumerate(lrc_rows):
                ed_t = lrc_rows[idx + 1][0] - 0.12 if idx + 1 < len(lrc_rows) else min(args.duration - 0.5, st_t + 3.4)
                ed_t = max(st_t + 0.8, min(args.duration, ed_t))
                chars_only = [c for c in txt if c != " "]
                step = ((ed_t - st_t) * 0.82) / max(1, len(chars_only))
                char_items = []
                k = 0
                for ch in txt:
                    char_items.append({"char": ch, "at": round(st_t + k * step, 3)})
                    if ch != " ":
                        k += 1
                new_lyrics.append({
                    "index": idx + 1,
                    "start": round(st_t, 3),
                    "end": round(ed_t, 3),
                    "text": txt,
                    "note": "LRC synced",
                    "chars": char_items,
                })
            tl["lyrics"] = new_lyrics

    tl_json = json.dumps(tl, ensure_ascii=False, indent=2)
    tl_path.write_text(tl_json, encoding="utf-8")
    (ROOT_DIR / "docs" / "lyrics_timeline.json").write_text(tl_json, encoding="utf-8")
    print(f"[swap_audio] Updated audio -> {out_wav} and synced song_facts.json + lyrics_timeline.json")

    if args.render:
        subprocess.run(
            ["/Users/eagle/.nvm/versions/node/v22.23.4/bin/npm", "run", "render:final"],
            cwd=str(ROOT_DIR),
            check=True,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
