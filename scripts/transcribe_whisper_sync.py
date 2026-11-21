#!/usr/bin/env python3
"""
Extract exact word/character-level vocal onset timestamps from any local audio file
using ffmpeg PCM decoding + local faster-whisper (avoids PyAV metadata_errors bugs).

Usage:
  python transcribe_whisper_sync.py --audio song.mp3 --out whisper_exact.json --model small
  python transcribe_whisper_sync.py --audio song.mp3 --start 43.0 --duration 96.0 --out clip_sync.json
"""
from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path

import numpy as np
from faster_whisper import WhisperModel


def main() -> int:
    ap = argparse.ArgumentParser(description="Transcribe audio with exact word-level timestamps via Whisper.")
    ap.add_argument("--audio", required=True, help="Path to audio file (.mp3/.wav/.flac/.m4a)")
    ap.add_argument("--out", required=True, help="Output JSON path")
    ap.add_argument("--model", default="small", help="Local Whisper model size (small, medium, large-v3-turbo)")
    ap.add_argument("--language", default="zh", help="Language code (default: zh)")
    ap.add_argument("--prompt", default="", help="Optional initial prompt with known lyrics for higher accuracy")
    ap.add_argument("--start", type=float, default=0.0, help="Optional clip start offset in seconds (for relative timestamps)")
    ap.add_argument("--duration", type=float, default=0.0, help="Optional clip duration limit (0 = full track)")
    ap.add_argument("--ffmpeg", default="ffmpeg", help="ffmpeg executable path")
    args = ap.parse_args()

    cmd = [args.ffmpeg, "-y"]
    if args.start > 0:
        cmd += ["-ss", f"{args.start:.3f}"]
    if args.duration > 0:
        cmd += ["-t", f"{args.duration:.3f}"]
    cmd += ["-i", str(Path(args.audio).expanduser().resolve()), "-ar", "16000", "-ac", "1", "-f", "f32le", "-"]

    pcm = subprocess.check_output(cmd, stderr=subprocess.DEVNULL)
    audio_np = np.frombuffer(pcm, dtype=np.float32)
    print(f"[transcribe_whisper_sync] Decoded {len(audio_np) / 16000:.2f}s audio")

    model = WhisperModel(args.model, device="cpu", compute_type="int8", local_files_only=True)
    segments, _ = model.transcribe(
        audio_np,
        language=args.language,
        beam_size=5,
        word_timestamps=True,
        initial_prompt=args.prompt or None,
    )

    results = []
    for s in segments:
        words = [
            {"word": w.word, "start": round(w.start, 3), "end": round(w.end, 3)}
            for w in (s.words or [])
        ]
        row = {
            "start": round(s.start, 3),
            "end": round(s.end, 3),
            "text": s.text.strip(),
            "words": words,
        }
        results.append(row)
        print(f"[{s.start:6.2f} - {s.end:6.2f}] {s.text.strip()}")

    out_path = Path(args.out).expanduser().resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[transcribe_whisper_sync] Saved {len(results)} segments -> {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
