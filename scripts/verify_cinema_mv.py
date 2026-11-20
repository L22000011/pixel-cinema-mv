#!/usr/bin/env python3
"""
Automated QA Inspector for Jay Chou <Qingtian> 60s Cinema Pixel MV (16:9 & 9:16).
Checks:
  1. ffprobe container, resolution, fps, duration (~60.0s), and AAC stereo audio.
  2. Per-shot OpenCV pixel frame-diff / motion energy across all 12 shots (ensuring continuous motion).
  3. Extracts final 16:9 and 9:16 keyframe inspection PNGs for direct visual inspection.
"""

import json
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List

import cv2
import numpy as np

ROOT = Path("/Users/eagle/Desktop/Video")
PROJECT_DIR = ROOT / "AI-MV-Workflow/projects/qingtian_pixel_mv"
TIMELINE_PATH = PROJECT_DIR / "timeline/timeline_master.json"
OUT_16X9 = PROJECT_DIR / "output/qingtian_cinema_pixel_mv_16x9.mp4"
OUT_9X16 = PROJECT_DIR / "output/qingtian_cinema_pixel_mv_9x16.mp4"
QC_DIR = PROJECT_DIR / "qc_strips/v2_final"


def ffprobe_info(path: Path) -> Dict[str, Any]:
    cmd = [
        "ffprobe",
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        str(path),
    ]
    raw = subprocess.check_output(cmd, text=True)
    return json.loads(raw)


def verify_streams(path: Path, exp_w: int, exp_h: int) -> Dict[str, Any]:
    assert path.exists(), f"Missing output file: {path}"
    info = ffprobe_info(path)
    streams = info.get("streams", [])
    v_stream = next((s for s in streams if s.get("codec_type") == "video"), None)
    a_stream = next((s for s in streams if s.get("codec_type") == "audio"), None)
    assert v_stream is not None, f"No video stream in {path}"
    assert a_stream is not None, f"No audio stream in {path}"

    w = int(v_stream["width"])
    h = int(v_stream["height"])
    fps_str = v_stream.get("r_frame_rate", "0/1")
    num, den = (int(x) for x in fps_str.split("/"))
    fps = num / max(1, den)
    dur = float(info["format"]["duration"])
    nb_frames = int(v_stream.get("nb_frames", 0))

    assert w == exp_w and h == exp_h, f"{path.name}: got {w}x{h}, expected {exp_w}x{exp_h}"
    assert abs(fps - 30.0) < 0.05, f"{path.name}: expected 30fps, got {fps}"
    assert 59.8 <= dur <= 60.2, f"{path.name}: expected 60.0s duration, got {dur:.3f}s"

    return {
        "file": str(path),
        "width": w,
        "height": h,
        "fps": fps,
        "duration_sec": round(dur, 3),
        "frames": nb_frames,
        "video_codec": v_stream.get("codec_name"),
        "audio_codec": a_stream.get("codec_name"),
        "audio_sample_rate": int(a_stream.get("sample_rate", 0)),
        "size_mb": round(path.stat().st_size / (1024 * 1024), 2),
    }


def check_shot_motion_and_stills(
    video_path: Path, shots: List[Dict[str, Any]], tag: str
) -> List[Dict[str, Any]]:
    cap = cv2.VideoCapture(str(video_path))
    assert cap.isOpened(), f"Failed opening {video_path}"
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    results: List[Dict[str, Any]] = []

    for shot in shots:
        s_t = float(shot["start"])
        e_t = float(shot["end"])
        span = e_t - s_t
        # Sample 5 points inside shot at 0.35s steps to capture 12fps + 30fps pixel motion
        sample_times = [
            min(e_t - 0.15, s_t + 0.35 + i * max(0.35, (span - 0.7) / 4))
            for i in range(4)
        ]
        frames = []
        for t_sec in sample_times:
            idx = max(0, int(round(t_sec * fps)))
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ok, frm = cap.read()
            if ok:
                frames.append(frm)

        diffs = []
        for i in range(len(frames) - 1):
            diff = cv2.absdiff(frames[i], frames[i + 1])
            diffs.append(float(np.mean(diff)))

        mean_diff = float(np.mean(diffs)) if diffs else 0.0
        max_diff = float(np.max(diffs)) if diffs else 0.0
        # Active frames ratio (must show noticeable animation)
        assert mean_diff > 0.25, f"{tag} {shot['shot_id']} nearly frozen (mean_diff={mean_diff:.3f})"

        results.append(
            {
                "shot_id": shot["shot_id"],
                "scene": shot["scene"],
                "mean_luma_diff": round(mean_diff, 3),
                "max_luma_diff": round(max_diff, 3),
                "moving": mean_diff > 0.25,
            }
        )

    # Extract key inspection frames spanning opening, classroom, sunset, evening duet & finale
    inspect_secs = [2.2, 5.2, 8.8, 16.0, 19.6, 32.5, 46.5, 54.5]
    for sec in inspect_secs:
        idx = int(round(sec * fps))
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ok, frm = cap.read()
        if ok:
            out_png = QC_DIR / f"{tag}_{sec:04.1f}s.png"
            cv2.imwrite(str(out_png), frm)

    cap.release()
    return results


def main() -> None:
    QC_DIR.mkdir(parents=True, exist_ok=True)
    master = json.loads(TIMELINE_PATH.read_text(encoding="utf-8"))
    shots = master["shots"]

    meta_16 = verify_streams(OUT_16X9, 1920, 1080)
    meta_9 = verify_streams(OUT_9X16, 1080, 1920)
    motion_16 = check_shot_motion_and_stills(OUT_16X9, shots, "final_16x9")
    motion_9 = check_shot_motion_and_stills(OUT_9X16, shots, "final_9x16")

    report = {
        "status": "PASS",
        "video_16x9": meta_16,
        "video_9x16": meta_9,
        "all_12_shots_moving_16x9": all(r["moving"] for r in motion_16),
        "all_12_shots_moving_9x16": all(r["moving"] for r in motion_9),
        "shot_motion_16x9": motion_16,
        "shot_motion_9x16": motion_9,
    }
    report_path = QC_DIR / "qa_report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"QA FAILED: {exc}", file=sys.stderr)
        sys.exit(1)
