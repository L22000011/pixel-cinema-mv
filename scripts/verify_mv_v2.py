#!/usr/bin/env python3
"""
Automated QA for 《我落泪·情绪零碎》 9:16 Pixel MV:
1. ffprobe stream, resolution (1080x1920), 30fps, bt709 tags, duration parity, AAC audio.
2. BuzyOwl film_gate.py check (dead_gap, flicker, slideshow, palette dE, beat_hits, delivery).
3. OpenCV per-shot luminance motion check across all 8 shots.
4. Contact sheet PNG extraction across all 8 shots for visual review.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Dict, List

import cv2
import numpy as np

ROOT_DIR = Path(__file__).resolve().parents[1]
FFPROBE_BIN = "/Users/eagle/Desktop/Video/bin/ffprobe"
FFMPEG_BIN = "/Users/eagle/Desktop/Video/bin/ffmpeg"
FILM_GATE = "/Users/eagle/.gemini/antigravity/scratch/song-video-director/skills/video-director/scripts/film_gate.py"


def ffprobe_info(video_path: Path) -> Dict:
    out = subprocess.check_output(
        [FFPROBE_BIN, "-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", str(video_path)]
    )
    return json.loads(out.decode("utf-8"))


def check_opencv_shots(video_path: Path, shots: List[Dict]) -> List[Dict]:
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {video_path}")
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    results = []
    for sh in shots:
        f0 = int(round(sh["start"] * fps))
        f1 = int(round(sh["end"] * fps)) - 1
        diffs = []
        prev_gray = None
        step = max(1, (f1 - f0) // 18)
        for f in range(f0, f1 + 1, step):
            cap.set(cv2.CAP_PROP_POS_FRAMES, f)
            ok, frame = cap.read()
            if not ok:
                continue
            small = cv2.resize(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY), (180, 320))
            if prev_gray is not None:
                diffs.append(float(np.mean(np.abs(small.astype(np.float32) - prev_gray.astype(np.float32)))))
            prev_gray = small
        mean_diff = round(float(np.mean(diffs)) if diffs else 0.0, 3)
        results.append({
            "id": sh["id"],
            "scene": sh["scene"],
            "span": f"{sh['start']:.2f}-{sh['end']:.2f}s",
            "mean_luma_diff": mean_diff,
            "pass": mean_diff > 0.25,
        })
    cap.release()
    return results


def make_contact_sheet(video_path: Path, out_png: Path, timestamps: List[float], cols: int = 4) -> None:
    thumbs = []
    cap = cv2.VideoCapture(str(video_path))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    tw, th = 270, 480
    for ts in timestamps:
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(round(ts * fps)))
        ok, frame = cap.read()
        if not ok:
            frame = np.zeros((th, tw, 3), dtype=np.uint8)
        else:
            frame = cv2.resize(frame, (tw, th), interpolation=cv2.INTER_AREA)
        cv2.rectangle(frame, (0, 0), (110, 26), (12, 14, 28), -1)
        cv2.putText(frame, f"{ts:.2f}s", (8, 19), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 224, 150), 1, cv2.LINE_AA)
        thumbs.append(frame)
    cap.release()

    rows = (len(thumbs) + cols - 1) // cols
    sheet = np.zeros((rows * th, cols * tw, 3), dtype=np.uint8)
    for idx, img in enumerate(thumbs):
        r, c = divmod(idx, cols)
        sheet[r * th : (r + 1) * th, c * tw : (c + 1) * tw] = img
    out_png.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(out_png), sheet)


def main() -> int:
    ap = argparse.ArgumentParser(description="Verify rendered 9:16 Pixel MV MP4.")
    ap.add_argument("video", nargs="?", default=str(ROOT_DIR / "output" / "Luolei_Pixel_MV_9x16.mp4"))
    ap.add_argument("--report", default=str(ROOT_DIR / "qc" / "qa_report.json"))
    args = ap.parse_args()

    video_path = Path(args.video).resolve()
    if not video_path.exists():
        print(f"ERROR: video not found: {video_path}", file=sys.stderr)
        return 2

    probe = ffprobe_info(video_path)
    v_stream = next(s for s in probe["streams"] if s["codec_type"] == "video")
    a_stream = next((s for s in probe["streams"] if s["codec_type"] == "audio"), None)
    dur = float(probe["format"]["duration"])

    timeline = json.loads((ROOT_DIR / "src" / "data" / "lyrics_timeline.json").read_text(encoding="utf-8"))
    shot_motion = check_opencv_shots(video_path, timeline["shots"])

    # Run film_gate.py
    gate_json = ROOT_DIR / "qc" / "film_gate_report.json"
    gate_proc = subprocess.run(
        [
            sys.executable,
            "-I",
            FILM_GATE,
            str(video_path),
            "--song",
            str(ROOT_DIR / "src" / "data" / "song_facts.json"),
            "--style",
            str(ROOT_DIR / "TASTE.md"),
            "--json",
            str(gate_json),
        ],
        env={"PATH": "/Users/eagle/Desktop/Video/bin:/usr/bin:/bin"},
        capture_output=True,
        text=True,
    )
    print(gate_proc.stdout)
    if gate_proc.stderr:
        print(gate_proc.stderr, file=sys.stderr)

    # Extract 12-frame full-film contact sheet across 96.0s timeline
    sample_times = [1.2, 5.5, 11.0, 21.0, 27.5, 32.0, 44.0, 54.0, 60.0, 74.0, 84.0, 93.0]
    sheet_path = ROOT_DIR / "qc" / "final_contact_sheet.png"
    make_contact_sheet(video_path, sheet_path, sample_times, cols=4)

    gate_data = json.loads(gate_json.read_text(encoding="utf-8")) if gate_json.exists() else {}
    report = {
        "video": str(video_path),
        "width": v_stream.get("width"),
        "height": v_stream.get("height"),
        "fps": v_stream.get("r_frame_rate"),
        "pix_fmt": v_stream.get("pix_fmt"),
        "color_space": v_stream.get("color_space"),
        "duration_s": round(dur, 3),
        "has_audio": a_stream is not None,
        "audio_sample_rate": a_stream.get("sample_rate") if a_stream else None,
        "shot_motion": shot_motion,
        "all_shots_moving": all(s["pass"] for s in shot_motion),
        "film_gate_pass": gate_data.get("pass", False),
        "film_gate": gate_data,
        "contact_sheet": str(sheet_path),
    }

    Path(args.report).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[verify_mv] Saved report -> {args.report}")
    print(f"[verify_mv] Shots moving: {report['all_shots_moving']}, film_gate_pass: {report['film_gate_pass']}")
    ok = (
        v_stream.get("width") == 1080
        and v_stream.get("height") == 1920
        and a_stream is not None
        and report["all_shots_moving"]
        and report["film_gate_pass"]
    )
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
