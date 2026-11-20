import { CharacterRenderState, Facing } from "./CharacterRenderer";
import { MoodId, clamp, lerp, smoothstep } from "./palette";
import { SceneEnvParams, SceneId } from "./SceneRenderer";

export interface TimelineCharacterSpec {
  x_start: number;
  y_start: number;
  x_end: number;
  y_end: number;
  facing: Facing;
  pose: string;
  expression: string;
  prop: string;
  hand_target: string;
  visible?: boolean;
  outside_window?: boolean;
}

export interface TimelineShot {
  shot_id: string;
  start: number;
  end: number;
  start_frame: number;
  end_frame: number;
  scene: SceneId;
  shot_scale: string;
  mood: MoodId;
  narrative: string;
  camera: {
    pan_x_start: number;
    pan_x_end: number;
    pan_y_start: number;
    pan_y_end: number;
    sprite_scale: number;
  };
  environment: SceneEnvParams;
  boy: TimelineCharacterSpec;
  girl: TimelineCharacterSpec;
}

export interface LyricChar {
  char: string;
  start: number;
  end: number;
}

export interface LyricLine {
  id: number;
  text: string;
  start: number;
  end: number;
  chars: LyricChar[];
}

export interface TimelineMaster {
  fps: number;
  duration_sec: number;
  total_frames: number;
  shots: TimelineShot[];
  lyrics: LyricLine[];
}

export interface EvaluatedFrame {
  shot: TimelineShot;
  timeSec: number;
  shotT: number;
  smoothT: number;
  w: number;
  h: number;
  panX: number;
  panY: number;
  groundYRatio: number;
  animTick: number;
  boy: CharacterRenderState | null;
  girl: CharacterRenderState | null;
  activeLyric: LyricLine | null;
  sungCharProgress: number; // number of characters already lit/partially lit
}

/** Smoothly map normalized horizontal & vertical coordinates onto 16:9 or recomposed 9:16 stage. */
function mapCharacterStageCoords(
  normX: number,
  normY: number,
  w: number,
  h: number,
  orientation: "16x9" | "9x16",
  spriteScale: number,
  boyX: number,
  girlX: number,
  bothVisible: boolean,
  isSharedUmbrella: boolean
): { footX: number; footY: number; scale: number; groundYRatio: number } {
  if (orientation === "16x9") {
    return {
      footX: Math.round(normX * w),
      footY: Math.round(normY * h),
      scale: spriteScale,
      groundYRatio: 0.82,
    };
  }
  // Dedicated 9:16 vertical re-composition (270x480):
  // Pull floor horizon to 68% so tall clouds/trees breathe above AND clean subtitle zone sits below 74%.
  // Maintain minimum horizontal body clearance so faces never overlap on portrait stage!
  const vScale = clamp(spriteScale * 0.88, 0.92, 1.38);
  let targetX = normX;
  if (bothVisible) {
    const midX = (boyX + girlX) * 0.5;
    const rawOffset = normX - midX;
    const minHalfSep = isSharedUmbrella ? 0.095 : 0.145 * vScale;
    const expanded =
      Math.sign(rawOffset || -1) * Math.max(Math.abs(rawOffset) * 1.15, minHalfSep);
    targetX = clamp(0.5 + expanded, 0.18, 0.82);
  } else {
    targetX = clamp(normX, 0.25, 0.75);
  }
  const shiftedY = normY < 0.75 ? 0.54 : 0.69 + (normY - 0.84) * 0.55;
  return {
    footX: Math.round(targetX * w),
    footY: Math.round(shiftedY * h),
    scale: vScale,
    groundYRatio: 0.68,
  };
}

export function evaluateTimelineAtFrame(
  master: TimelineMaster,
  frame: number,
  orientation: "16x9" | "9x16"
): EvaluatedFrame {
  const fps = master.fps || 30;
  const timeSec = frame / fps;
  const w = orientation === "16x9" ? 480 : 270;
  const h = orientation === "16x9" ? 270 : 480;

  let shot = master.shots[master.shots.length - 1];
  for (let i = 0; i < master.shots.length; i++) {
    const s = master.shots[i];
    if (timeSec >= s.start && timeSec < s.end) {
      shot = s;
      break;
    }
  }

  const shotSpan = Math.max(0.1, shot.end - shot.start);
  const shotT = clamp((timeSec - shot.start) / shotSpan, 0, 1);
  const smoothT = smoothstep(shotT);

  // Quantize secondary pixel movement at authentic ~12 FPS while screen panning runs smoothly
  const animTick = Math.floor(timeSec * 12);
  const qTimeSec = animTick / 12;
  const qShotT = clamp((qTimeSec - shot.start) / shotSpan, 0, 1);

  const panX = lerp(shot.camera.pan_x_start, shot.camera.pan_x_end, smoothT);
  const panY = lerp(shot.camera.pan_y_start, shot.camera.pan_y_end, smoothT);

  const boyNormX = lerp(shot.boy.x_start, shot.boy.x_end, shotT);
  const boyNormY = lerp(shot.boy.y_start, shot.boy.y_end, shotT);
  const girlNormX = lerp(shot.girl.x_start, shot.girl.x_end, shotT);
  const girlNormY = lerp(shot.girl.y_start, shot.girl.y_end, shotT);

  const bothVisible = shot.boy.visible !== false && shot.girl.visible !== false;
  const isSharedUmbrella = shot.boy.pose === "hold_umbrella_close";
  const boyCoords = mapCharacterStageCoords(
    boyNormX,
    boyNormY,
    w,
    h,
    orientation,
    shot.camera.sprite_scale,
    boyNormX,
    girlNormX,
    bothVisible,
    isSharedUmbrella
  );
  const girlCoords = mapCharacterStageCoords(
    girlNormX,
    girlNormY,
    w,
    h,
    orientation,
    shot.camera.sprite_scale,
    boyNormX,
    girlNormX,
    bothVisible,
    isSharedUmbrella
  );

  // Subtle natural eye blinks every ~3.4s for 2 pixel ticks
  const boyBlinking = animTick % 41 === 14 || animTick % 41 === 15;
  const girlBlinking = (animTick + 19) % 38 === 12 || (animTick + 19) % 38 === 13;

  // Sunset rim strength
  const sunsetRim =
    shot.mood === "golden_sunset" ? 0.92 : shot.mood === "dusk_wind_drift" ? 0.68 : 0;

  // Compute cyclic walk step phase at natural tempo matching ~1.1s per stride cycle
  const walkPhaseBoy = (qTimeSec * 0.92) % 1;
  const walkPhaseGirl = ((qTimeSec + 0.14) * 0.92) % 1;

  // For girl's final wave_then_walk_away beat, pass qShotT during first half and walk cycle after
  const girlPhase =
    shot.girl.pose === "wave_then_walk_away"
      ? qShotT <= 0.48
        ? qShotT
        : 0.5 + ((qTimeSec * 0.95) % 0.5)
      : walkPhaseGirl;

  // Final girl fade gently out around end of shot 12
  const girlFade =
    shot.shot_id === "S12" ? clamp(1 - (shotT - 0.72) / 0.28, 0.08, 1) : 1;

  const boy: CharacterRenderState | null =
    shot.boy.visible === false
      ? null
      : {
          role: "boy",
          footX: boyCoords.footX,
          footY: boyCoords.footY,
          facing: shot.boy.facing,
          pose: shot.boy.pose,
          expression: shot.boy.expression,
          prop: shot.boy.prop,
          handTarget: shot.boy.hand_target,
          scale: shot.boy.outside_window ? boyCoords.scale * 0.84 : boyCoords.scale,
          stepPhase: walkPhaseBoy,
          wind: shot.environment.wind,
          animTick,
          blinking: boyBlinking,
          sunsetRim,
          behindGlass: Boolean(shot.boy.outside_window),
        };

  const girl: CharacterRenderState | null =
    shot.girl.visible === false
      ? null
      : {
          role: "girl",
          footX: girlCoords.footX,
          footY: girlCoords.footY,
          facing: shot.girl.facing,
          pose: shot.girl.pose,
          expression: shot.girl.expression,
          prop: shot.girl.prop,
          handTarget: shot.girl.hand_target,
          scale: girlCoords.scale,
          stepPhase: girlPhase,
          wind: shot.environment.wind,
          animTick,
          blinking: girlBlinking,
          sunsetRim,
          opacity: girlFade,
        };

  // Active lyric evaluation (strictly hidden during non-vocal pauses!)
  let activeLyric: LyricLine | null = null;
  let sungCharProgress = 0;
  for (let i = 0; i < master.lyrics.length; i++) {
    const ln = master.lyrics[i];
    if (timeSec >= ln.start && timeSec <= ln.end) {
      activeLyric = ln;
      let progress = 0;
      for (let c = 0; c < ln.chars.length; c++) {
        const ch = ln.chars[c];
        if (timeSec >= ch.end) {
          progress += 1;
        } else if (timeSec >= ch.start) {
          progress += clamp((timeSec - ch.start) / Math.max(0.05, ch.end - ch.start), 0, 1);
        }
      }
      sungCharProgress = progress;
      break;
    }
  }

  return {
    shot,
    timeSec,
    shotT,
    smoothT,
    w,
    h,
    panX,
    panY,
    groundYRatio: orientation === "16x9" ? 0.82 : 0.68,
    animTick,
    boy,
    girl,
    activeLyric,
    sungCharProgress,
  };
}
