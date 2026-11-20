#!/usr/bin/env python3
"""
Build the fine-grained 3-level audio-synced timeline for Jay Chou <Qingtian> 60s Pixel MV.

Generates:
  1. timeline/timeline_master.json   (complete 3-level schedule consumed by Remotion & QA)
  2. timeline/timeline_shots.csv     (human-readable shot & choreography table)
  3. timeline/lyrics_alignment.json  (verified char-by-char syllable timings synced to audio)
  4. timeline/character_actions.json (continuous character trajectories, poses, expressions)
  5. timeline/scene_events.json      (lighting, weather, foliage, curtain, puddle & lamp events)
Also mirrors timeline_master.json -> mv-studio/src/qingtian_cinema/timeline_master.json
"""

import csv
import json
from pathlib import Path
from typing import Any, Dict, List

ROOT = Path("/Users/eagle/Desktop/Video")
PROJECT_DIR = ROOT / "AI-MV-Workflow/projects/qingtian_pixel_mv"
TIMELINE_DIR = PROJECT_DIR / "timeline"
MV_STUDIO_CINEMA_DIR = ROOT / "mv-studio/src/qingtian_cinema"

FPS = 30
DURATION_SEC = 60.0
TOTAL_FRAMES = int(FPS * DURATION_SEC)

# Corrected Chinese character lyrics mapped onto verified audio word-onset intervals
# from lyrics.json (audio_clip_60s.wav = 83.20s -> 143.20s of original track).
CORRECTED_LYRICS_SPEC: List[Dict[str, Any]] = [
    {
        "id": 0,
        "text": "刮风这天",
        "start": 1.00,
        "end": 3.38,
        "char_spans": [("刮", 1.00, 1.96), ("风", 1.96, 2.40), ("这", 2.40, 2.80), ("天", 2.80, 3.38)],
    },
    {
        "id": 1,
        "text": "我试过握着你手",
        "start": 3.38,
        "end": 6.76,
        "char_spans": [
            ("我", 3.38, 4.02), ("试", 4.02, 4.60), ("过", 4.60, 5.02),
            ("握", 5.02, 5.48), ("着", 5.48, 5.92), ("你", 5.92, 6.40), ("手", 6.40, 6.76),
        ],
    },
    {
        "id": 2,
        "text": "但偏偏 雨渐渐",
        "start": 6.76,
        "end": 10.56,
        "char_spans": [
            ("但", 6.76, 7.58), ("偏", 7.58, 8.02), ("偏", 8.02, 8.58),
            (" ", 8.58, 8.62),
            ("雨", 8.62, 9.48), ("渐", 9.48, 9.86), ("渐", 9.86, 10.56),
        ],
    },
    {
        "id": 3,
        "text": "大到我看你不见",
        "start": 10.56,
        "end": 14.05,
        "char_spans": [
            ("大", 10.56, 11.24), ("到", 11.24, 11.56), ("我", 11.56, 11.98),
            ("看", 11.98, 12.46), ("你", 12.46, 12.94), ("不", 12.94, 13.46), ("见", 13.46, 14.05),
        ],
    },
    {
        "id": 4,
        "text": "还要多久",
        "start": 15.06,
        "end": 17.28,
        "char_spans": [
            ("还", 15.06, 16.02), ("要", 16.02, 16.44), ("多", 16.44, 16.90), ("久", 16.90, 17.28),
        ],
    },
    {
        "id": 5,
        "text": "我才能在你身边",
        "start": 17.28,
        "end": 21.56,
        "char_spans": [
            ("我", 17.28, 18.14), ("才", 18.14, 18.60), ("能", 18.60, 19.02),
            ("在", 19.02, 19.54), ("你", 19.54, 19.86), ("身", 19.86, 20.34), ("边", 20.34, 21.56),
        ],
    },
    {
        "id": 6,
        "text": "等到放晴的那天",
        "start": 21.56,
        "end": 25.16,
        "char_spans": [
            ("等", 21.56, 22.50), ("到", 22.50, 22.98), ("放", 22.98, 23.48),
            ("晴", 23.48, 23.80), ("的", 23.80, 24.32), ("那", 24.32, 24.72), ("天", 24.72, 25.16),
        ],
    },
    {
        "id": 7,
        "text": "也许我会比较好一点",
        "start": 25.16,
        "end": 28.94,
        "char_spans": [
            ("也", 25.16, 25.62), ("许", 25.62, 25.96), ("我", 25.96, 26.44),
            ("会", 26.44, 26.86), ("比", 26.86, 27.22), ("较", 27.22, 27.74),
            ("好", 27.74, 28.36), ("一", 28.36, 28.65), ("点", 28.65, 28.94),
        ],
    },
    {
        "id": 8,
        "text": "从前从前",
        "start": 29.48,
        "end": 31.30,
        "char_spans": [
            ("从", 29.48, 29.96), ("前", 29.96, 30.32), ("从", 30.32, 30.86), ("前", 30.86, 31.30),
        ],
    },
    {
        "id": 9,
        "text": "有个人爱你很久",
        "start": 31.30,
        "end": 34.78,
        "char_spans": [
            ("有", 31.30, 32.18), ("个", 32.18, 32.56), ("人", 32.56, 33.02),
            ("爱", 33.02, 33.60), ("你", 33.60, 33.90), ("很", 33.90, 34.34), ("久", 34.34, 34.78),
        ],
    },
    {
        "id": 10,
        "text": "但偏偏 风渐渐",
        "start": 34.78,
        "end": 38.20,
        "char_spans": [
            ("但", 34.78, 35.64), ("偏", 35.64, 36.10), ("偏", 36.10, 36.50),
            (" ", 36.50, 37.10),
            ("风", 37.10, 37.42), ("渐", 37.42, 37.80), ("渐", 37.80, 38.20),
        ],
    },
    {
        "id": 11,
        "text": "把距离吹得好远",
        "start": 38.72,
        "end": 42.04,
        "char_spans": [
            ("把", 38.72, 39.18), ("距", 39.18, 39.60), ("离", 39.60, 39.88),
            ("吹", 39.88, 40.38), ("得", 40.38, 40.84), ("好", 40.84, 41.38), ("远", 41.38, 42.04),
        ],
    },
    {
        "id": 12,
        "text": "好不容易",
        "start": 43.08,
        "end": 45.20,
        "char_spans": [
            ("好", 43.08, 44.00), ("不", 44.00, 44.38), ("容", 44.38, 44.78), ("易", 44.78, 45.20),
        ],
    },
    {
        "id": 13,
        "text": "又能再多爱一天",
        "start": 45.86,
        "end": 48.90,
        "char_spans": [
            ("又", 45.86, 46.16), ("能", 46.16, 46.54), ("再", 46.54, 47.00),
            ("多", 47.00, 47.52), ("爱", 47.52, 48.02), ("一", 48.02, 48.46), ("天", 48.46, 48.90),
        ],
    },
    {
        "id": 14,
        "text": "但故事的最后你",
        "start": 50.08,
        "end": 53.20,
        "char_spans": [
            ("但", 50.08, 50.54), ("故", 50.54, 50.88), ("事", 50.88, 51.22),
            ("的", 51.22, 51.84), ("最", 51.84, 52.26), ("后", 52.26, 52.68), ("你", 52.68, 53.20),
        ],
    },
    {
        "id": 15,
        "text": "好像还是说了 拜拜",
        "start": 53.20,
        "end": 58.60,
        "char_spans": [
            ("好", 53.20, 53.60), ("像", 53.60, 54.00), ("还", 54.00, 54.36), ("是", 54.36, 54.72),
            ("说", 54.72, 55.38), ("了", 55.38, 56.00), (" ", 56.00, 56.75),
            ("拜", 56.75, 57.35), ("拜", 57.35, 58.60),
        ],
    },
]

# Five cohesive fixed reusable campus scenes with Level-1 -> Level-2 -> Level-3 beats.
# Shots never use dead holds; continuous motion curves span every beat.
SHOTS_SPEC: List[Dict[str, Any]] = [
    {
        "shot_id": "S01",
        "start": 0.00,
        "end": 3.40,
        "scene": "campus_path",
        "shot_scale": "medium_wide",
        "mood": "clear_breeze",
        "narrative": "微风吹过樱木校园林荫路，少年与少女并肩走来，树叶沙沙作响",
        "camera": {"pan_x_start": -16, "pan_x_end": 4, "pan_y_start": 0, "pan_y_end": -2, "sprite_scale": 1.0},
        "environment": {"wind": 0.65, "rain": 0.0, "sunbeams": 0.85, "leaves": 0.70, "curtain": 0.0, "lamp": 0.0, "puddles": 0.0},
        "boy": {
            "x_start": 0.34, "y_start": 0.82, "x_end": 0.42, "y_end": 0.82,
            "facing": "right", "pose": "walk", "expression": "neutral_gentle", "prop": "bag",
            "hand_target": "swing",
        },
        "girl": {
            "x_start": 0.56, "y_start": 0.82, "x_end": 0.54, "y_end": 0.82,
            "facing": "right", "pose": "walk", "expression": "soft_smile", "prop": "folded_umbrella",
            "hand_target": "hold_umbrella",
        },
    },
    {
        "shot_id": "S02",
        "start": 3.40,
        "end": 6.80,
        "scene": "campus_path",
        "shot_scale": "medium_closeup",
        "mood": "clear_breeze",
        "narrative": "“我试过握着你手”——两人脚步放慢，少年鼓起勇气悄悄伸手轻碰少女指尖，彼此相视一笑",
        "camera": {"pan_x_start": 4, "pan_x_end": 18, "pan_y_start": -8, "pan_y_end": -10, "sprite_scale": 1.55},
        "environment": {"wind": 0.85, "rain": 0.0, "sunbeams": 0.90, "leaves": 0.85, "curtain": 0.0, "lamp": 0.0, "puddles": 0.0},
        "boy": {
            "x_start": 0.41, "y_start": 0.85, "x_end": 0.44, "y_end": 0.85,
            "facing": "right", "pose": "reach_hand_walk", "expression": "warm_smile", "prop": "bag",
            "hand_target": "reach_right",
        },
        "girl": {
            "x_start": 0.57, "y_start": 0.85, "x_end": 0.56, "y_end": 0.85,
            "facing": "left", "pose": "glance_shy_walk", "expression": "blush_smile", "prop": "folded_umbrella",
            "hand_target": "accept_left",
        },
    },
    {
        "shot_id": "S03",
        "start": 6.80,
        "end": 10.60,
        "scene": "rainy_camphor_road",
        "shot_scale": "medium",
        "mood": "sudden_rain",
        "narrative": "“但偏偏 雨渐渐”——天色骤暗、雨丝斜落，水洼荡起涟漪，少女停步撑起浅白长柄伞",
        "camera": {"pan_x_start": -12, "pan_x_end": 8, "pan_y_start": 0, "pan_y_end": 0, "sprite_scale": 1.15},
        "environment": {"wind": 0.70, "rain": 0.62, "sunbeams": 0.0, "leaves": 0.35, "curtain": 0.0, "lamp": 0.10, "puddles": 0.70},
        "boy": {
            "x_start": 0.38, "y_start": 0.84, "x_end": 0.33, "y_end": 0.84,
            "facing": "right", "pose": "shield_rain", "expression": "surprised_worry", "prop": "bag",
            "hand_target": "shield_brow",
        },
        "girl": {
            "x_start": 0.55, "y_start": 0.84, "x_end": 0.62, "y_end": 0.84,
            "facing": "left", "pose": "open_umbrella", "expression": "wistful", "prop": "open_umbrella",
            "hand_target": "hold_open_umbrella",
        },
    },
    {
        "shot_id": "S04",
        "start": 10.60,
        "end": 14.30,
        "scene": "rainy_camphor_road",
        "shot_scale": "medium_wide",
        "mood": "heavy_rain",
        "narrative": "“大到我看你不见”——暴雨如注，两人隔着雨幕与雾气背向拉开距离",
        "camera": {"pan_x_start": 8, "pan_x_end": 26, "pan_y_start": 0, "pan_y_end": 2, "sprite_scale": 1.0},
        "environment": {"wind": 0.80, "rain": 1.0, "sunbeams": 0.0, "leaves": 0.20, "curtain": 0.0, "lamp": 0.25, "puddles": 1.0},
        "boy": {
            "x_start": 0.35, "y_start": 0.83, "x_end": 0.20, "y_end": 0.83,
            "facing": "right", "pose": "stand_rain_look", "expression": "sad", "prop": "bag",
            "hand_target": "idle",
        },
        "girl": {
            "x_start": 0.60, "y_start": 0.83, "x_end": 0.78, "y_end": 0.83,
            "facing": "right", "pose": "umbrella_walk", "expression": "look_down", "prop": "open_umbrella",
            "hand_target": "hold_open_umbrella",
        },
    },
    {
        "shot_id": "S05",
        "start": 14.30,
        "end": 17.60,
        "scene": "classroom_window",
        "shot_scale": "medium_closeup",
        "mood": "rain_window_wait",
        "narrative": "“还要多久”——雨后教室窗边，少女坐在木课桌前单手托腮望向窗外滑落的雨滴",
        "camera": {"pan_x_start": -4, "pan_x_end": 8, "pan_y_start": -6, "pan_y_end": -10, "sprite_scale": 1.50},
        "environment": {"wind": 0.35, "rain": 0.45, "sunbeams": 0.15, "leaves": 0.10, "curtain": 0.65, "lamp": 0.0, "puddles": 0.0},
        "boy": {
            "x_start": 0.15, "y_start": 0.82, "x_end": 0.15, "y_end": 0.82,
            "facing": "right", "pose": "hidden", "expression": "neutral_gentle", "prop": "none",
            "hand_target": "none",
            "visible": False,
        },
        "girl": {
            "x_start": 0.56, "y_start": 0.88, "x_end": 0.56, "y_end": 0.88,
            "facing": "left", "pose": "sit_desk_gaze", "expression": "wistful", "prop": "folded_umbrella",
            "hand_target": "chin_rest",
        },
    },
    {
        "shot_id": "S06",
        "start": 17.60,
        "end": 21.60,
        "scene": "classroom_window",
        "shot_scale": "medium",
        "mood": "clearing_window",
        "narrative": "“我才能在你身边”——雨丝渐疏，白纱窗帘随微风轻拂，少年的身影在窗外走廊经过却又错身",
        "camera": {"pan_x_start": 8, "pan_x_end": -6, "pan_y_start": -4, "pan_y_end": 0, "sprite_scale": 1.18},
        "environment": {"wind": 0.50, "rain": 0.18, "sunbeams": 0.45, "leaves": 0.25, "curtain": 0.85, "lamp": 0.0, "puddles": 0.0},
        "boy": {
            "x_start": 0.22, "y_start": 0.72, "x_end": 0.40, "y_end": 0.72,
            "facing": "right", "pose": "walk_corridor_behind_glass", "expression": "look_down", "prop": "bag",
            "hand_target": "pocket",
            "outside_window": True,
        },
        "girl": {
            "x_start": 0.60, "y_start": 0.87, "x_end": 0.63, "y_end": 0.87,
            "facing": "left", "pose": "stand_turn_window", "expression": "soft_surprise", "prop": "none",
            "hand_target": "touch_window",
        },
    },
    {
        "shot_id": "S07",
        "start": 21.60,
        "end": 25.20,
        "scene": "campus_path",
        "shot_scale": "medium",
        "mood": "after_rain_sunbeam",
        "narrative": "“等到放晴的那天”——云散天青、丁达尔光柱穿透树冠，两人再次抬头看见澄澈晴空",
        "camera": {"pan_x_start": -10, "pan_x_end": 12, "pan_y_start": 2, "pan_y_end": -6, "sprite_scale": 1.15},
        "environment": {"wind": 0.55, "rain": 0.0, "sunbeams": 1.0, "leaves": 0.60, "curtain": 0.0, "lamp": 0.0, "puddles": 0.25},
        "boy": {
            "x_start": 0.36, "y_start": 0.83, "x_end": 0.44, "y_end": 0.83,
            "facing": "right", "pose": "look_up_walk", "expression": "hopeful_smile", "prop": "bag",
            "hand_target": "swing",
        },
        "girl": {
            "x_start": 0.62, "y_start": 0.83, "x_end": 0.58, "y_end": 0.83,
            "facing": "left", "pose": "look_up_sky", "expression": "warm_smile", "prop": "folded_umbrella",
            "hand_target": "hold_umbrella",
        },
    },
    {
        "shot_id": "S08",
        "start": 25.20,
        "end": 29.20,
        "scene": "campus_path",
        "shot_scale": "closeup",
        "mood": "after_rain_sunbeam",
        "narrative": "“也许我会比较好一点”——近景捕捉少年眼底释然却微涩的笑意与飘动发丝",
        "camera": {"pan_x_start": 12, "pan_x_end": 18, "pan_y_start": -14, "pan_y_end": -16, "sprite_scale": 1.78},
        "environment": {"wind": 0.65, "rain": 0.0, "sunbeams": 0.95, "leaves": 0.75, "curtain": 0.0, "lamp": 0.0, "puddles": 0.0},
        "boy": {
            "x_start": 0.38, "y_start": 0.88, "x_end": 0.40, "y_end": 0.88,
            "facing": "right", "pose": "idle_breathe_smile", "expression": "bittersweet_smile", "prop": "bag",
            "hand_target": "idle",
        },
        "girl": {
            "x_start": 0.64, "y_start": 0.88, "x_end": 0.62, "y_end": 0.88,
            "facing": "left", "pose": "idle_breathe_blink", "expression": "soft_smile", "prop": "folded_umbrella",
            "hand_target": "hold_umbrella",
        },
    },
    {
        "shot_id": "S09",
        "start": 29.20,
        "end": 34.90,
        "scene": "playground_overpass_sunset",
        "shot_scale": "medium",
        "mood": "golden_sunset",
        "narrative": "“从前从前 有个人爱你很久”——橘金晚霞铺满天桥护栏与操场远景，少年静静注视着站在光里的少女",
        "camera": {"pan_x_start": -18, "pan_x_end": 6, "pan_y_start": 0, "pan_y_end": -4, "sprite_scale": 1.18},
        "environment": {"wind": 0.50, "rain": 0.0, "sunbeams": 0.85, "leaves": 0.35, "curtain": 0.0, "lamp": 0.15, "puddles": 0.0},
        "boy": {
            "x_start": 0.32, "y_start": 0.84, "x_end": 0.38, "y_end": 0.84,
            "facing": "right", "pose": "lean_rail_gaze", "expression": "warm_wistful", "prop": "bag",
            "hand_target": "rail",
        },
        "girl": {
            "x_start": 0.58, "y_start": 0.84, "x_end": 0.55, "y_end": 0.84,
            "facing": "right", "pose": "sunset_wind_hair", "expression": "soft_smile", "prop": "none",
            "hand_target": "rail",
        },
    },
    {
        "shot_id": "S10",
        "start": 34.90,
        "end": 42.60,
        "scene": "playground_overpass_sunset",
        "shot_scale": "medium_wide",
        "mood": "dusk_wind_drift",
        "narrative": "“但偏偏 风渐渐 把距离吹得好远”——晚风吹散余晖，两人沿着天桥长廊各自转身，步伐渐行渐远",
        "camera": {"pan_x_start": 6, "pan_x_end": 24, "pan_y_start": -4, "pan_y_end": 0, "sprite_scale": 1.04},
        "environment": {"wind": 0.95, "rain": 0.08, "sunbeams": 0.45, "leaves": 0.90, "curtain": 0.0, "lamp": 0.45, "puddles": 0.0},
        "boy": {
            "x_start": 0.39, "y_start": 0.84, "x_end": 0.22, "y_end": 0.84,
            "facing": "left", "pose": "walk_look_back", "expression": "sad", "prop": "bag",
            "hand_target": "swing",
        },
        "girl": {
            "x_start": 0.56, "y_start": 0.84, "x_end": 0.77, "y_end": 0.84,
            "facing": "right", "pose": "walk_away_wind", "expression": "look_down", "prop": "folded_umbrella",
            "hand_target": "hold_hair",
        },
    },
    {
        "shot_id": "S11",
        "start": 42.60,
        "end": 49.50,
        "scene": "streetlamp_rain_corner",
        "shot_scale": "medium",
        "mood": "evening_lamp_rain",
        "narrative": "“好不容易 又能再多爱一天”——暖黄路灯光晕洒在夜雨街头，两人最后一次共撑一伞依偎停留",
        "camera": {"pan_x_start": -8, "pan_x_end": 6, "pan_y_start": -2, "pan_y_end": -6, "sprite_scale": 1.28},
        "environment": {"wind": 0.40, "rain": 0.72, "sunbeams": 0.0, "leaves": 0.0, "curtain": 0.0, "lamp": 1.0, "puddles": 0.90},
        "boy": {
            "x_start": 0.42, "y_start": 0.85, "x_end": 0.44, "y_end": 0.85,
            "facing": "right", "pose": "hold_umbrella_close", "expression": "warm_wistful", "prop": "shared_umbrella",
            "hand_target": "hold_shared_umbrella",
        },
        "girl": {
            "x_start": 0.55, "y_start": 0.85, "x_end": 0.54, "y_end": 0.85,
            "facing": "left", "pose": "lean_close_under_umbrella", "expression": "wistful_smile", "prop": "none",
            "hand_target": "hold_sleeve",
        },
    },
    {
        "shot_id": "S12",
        "start": 49.50,
        "end": 60.00,
        "scene": "streetlamp_rain_corner",
        "shot_scale": "medium_wide",
        "mood": "farewell_night_rain",
        "narrative": "“但故事的最后你 好像还是说了 拜拜”——少女轻轻挥手转身没入夜雨巷口，少年独留暖灯下回望",
        "camera": {"pan_x_start": 6, "pan_x_end": 22, "pan_y_start": -4, "pan_y_end": 0, "sprite_scale": 1.05},
        "environment": {"wind": 0.55, "rain": 0.82, "sunbeams": 0.0, "leaves": 0.0, "curtain": 0.0, "lamp": 1.0, "puddles": 1.0},
        "boy": {
            "x_start": 0.42, "y_start": 0.84, "x_end": 0.35, "y_end": 0.84,
            "facing": "right", "pose": "stand_watch_fade", "expression": "sad", "prop": "bag",
            "hand_target": "release_hand",
        },
        "girl": {
            "x_start": 0.56, "y_start": 0.84, "x_end": 0.82, "y_end": 0.84,
            "facing": "right", "pose": "wave_then_walk_away", "expression": "sad_smile", "prop": "open_umbrella",
            "hand_target": "wave_bye",
        },
    },
]


def load_beats() -> List[float]:
    audio_path = PROJECT_DIR / "audio_analysis.json"
    if not audio_path.exists():
        return []
    data = json.loads(audio_path.read_text(encoding="utf-8"))
    start = float(data.get("selected_window", {}).get("start_sec", 83.2))
    end = float(data.get("selected_window", {}).get("end_sec", 143.2))
    beats = [round(b - start, 3) for b in data.get("beats", []) if start <= b <= end]
    return beats


def build_lyrics_payload() -> Dict[str, Any]:
    lines = []
    for ln in CORRECTED_LYRICS_SPEC:
        chars = [
            {
                "char": c,
                "start": round(s, 3),
                "end": round(e, 3),
                "start_frame": int(round(s * FPS)),
                "end_frame": int(round(e * FPS)),
            }
            for c, s, e in ln["char_spans"]
        ]
        lines.append(
            {
                "id": ln["id"],
                "text": ln["text"],
                "start": round(ln["start"], 3),
                "end": round(ln["end"], 3),
                "start_frame": int(round(ln["start"] * FPS)),
                "end_frame": int(round(ln["end"] * FPS)),
                "chars": chars,
            }
        )
    return {
        "song_title": "晴天",
        "artist": "周杰伦",
        "fps": FPS,
        "duration_sec": DURATION_SEC,
        "lines": lines,
    }


def build_character_actions_payload() -> Dict[str, Any]:
    tracks = []
    for shot in SHOTS_SPEC:
        tracks.append(
            {
                "shot_id": shot["shot_id"],
                "start_sec": shot["start"],
                "end_sec": shot["end"],
                "start_frame": int(round(shot["start"] * FPS)),
                "end_frame": int(round(shot["end"] * FPS)),
                "scene": shot["scene"],
                "shot_scale": shot["shot_scale"],
                "boy": shot["boy"],
                "girl": shot["girl"],
            }
        )
    return {"fps": FPS, "total_frames": TOTAL_FRAMES, "tracks": tracks}


def build_scene_events_payload(beats: List[float]) -> Dict[str, Any]:
    events = []
    for shot in SHOTS_SPEC:
        events.append(
            {
                "shot_id": shot["shot_id"],
                "start_sec": shot["start"],
                "end_sec": shot["end"],
                "start_frame": int(round(shot["start"] * FPS)),
                "end_frame": int(round(shot["end"] * FPS)),
                "scene": shot["scene"],
                "mood": shot["mood"],
                "environment": shot["environment"],
            }
        )
    return {
        "fps": FPS,
        "total_frames": TOTAL_FRAMES,
        "bpm": 133.93,
        "beats_sec": beats,
        "events": events,
    }


def main() -> None:
    TIMELINE_DIR.mkdir(parents=True, exist_ok=True)
    MV_STUDIO_CINEMA_DIR.mkdir(parents=True, exist_ok=True)

    beats = load_beats()
    lyrics_payload = build_lyrics_payload()
    character_payload = build_character_actions_payload()
    scene_payload = build_scene_events_payload(beats)

    shots_full = []
    for s in SHOTS_SPEC:
        sf = int(round(s["start"] * FPS))
        ef = int(round(s["end"] * FPS))
        matched_lyrics = [
            ln["text"]
            for ln in lyrics_payload["lines"]
            if not (ln["end"] <= s["start"] or ln["start"] >= s["end"])
        ]
        shots_full.append(
            {
                **s,
                "start_frame": sf,
                "end_frame": ef,
                "duration_sec": round(s["end"] - s["start"], 3),
                "lyric_lines": matched_lyrics,
            }
        )

    master = {
        "project": "qingtian_pixel_mv",
        "title": "晴天",
        "artist": "周杰伦",
        "fps": FPS,
        "duration_sec": DURATION_SEC,
        "total_frames": TOTAL_FRAMES,
        "logical_16x9": {"width": 480, "height": 270, "scale": 4, "output_width": 1920, "output_height": 1080},
        "logical_9x16": {"width": 270, "height": 480, "scale": 4, "output_width": 1080, "output_height": 1920},
        "bpm": 133.93,
        "beats_sec": beats,
        "scenes_catalog": [
            "campus_path",
            "rainy_camphor_road",
            "classroom_window",
            "playground_overpass_sunset",
            "streetlamp_rain_corner",
        ],
        "shots": shots_full,
        "lyrics": lyrics_payload["lines"],
    }

    (TIMELINE_DIR / "timeline_master.json").write_text(json.dumps(master, ensure_ascii=False, indent=2), encoding="utf-8")
    (MV_STUDIO_CINEMA_DIR / "timeline_master.json").write_text(json.dumps(master, ensure_ascii=False, indent=2), encoding="utf-8")
    (TIMELINE_DIR / "lyrics_alignment.json").write_text(json.dumps(lyrics_payload, ensure_ascii=False, indent=2), encoding="utf-8")
    (TIMELINE_DIR / "character_actions.json").write_text(json.dumps(character_payload, ensure_ascii=False, indent=2), encoding="utf-8")
    (TIMELINE_DIR / "scene_events.json").write_text(json.dumps(scene_payload, ensure_ascii=False, indent=2), encoding="utf-8")

    csv_path = TIMELINE_DIR / "timeline_shots.csv"
    with csv_path.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow([
            "shot_id", "start_sec", "end_sec", "duration_sec", "start_frame", "end_frame",
            "scene", "shot_scale", "mood", "boy_pose", "boy_expression", "girl_pose", "girl_expression",
            "rain", "wind", "lyric_lines", "narrative",
        ])
        for s in shots_full:
            writer.writerow([
                s["shot_id"], s["start"], s["end"], s["duration_sec"], s["start_frame"], s["end_frame"],
                s["scene"], s["shot_scale"], s["mood"],
                s["boy"]["pose"], s["boy"]["expression"], s["girl"]["pose"], s["girl"]["expression"],
                s["environment"]["rain"], s["environment"]["wind"],
                " / ".join(s["lyric_lines"]), s["narrative"],
            ])

    print(f"Generated 5 timeline files cleanly in {TIMELINE_DIR} ({len(shots_full)} shots, {len(lyrics_payload['lines'])} lines, {len(beats)} beats)")


if __name__ == "__main__":
    main()
