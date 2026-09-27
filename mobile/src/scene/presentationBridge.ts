import type {
  GazeDirection,
  MomentEmotion,
  PresentationCommand,
  ReactionClip,
} from '../reactions';

export type RoomVisualCommand = Exclude<PresentationCommand, { type: 'show_dialogue' }>;

/**
 * A token identifies one emitted command batch. Keeping it separate from the
 * command array prevents React renders from replaying one-shot clips or holds.
 */
export type RoomPresentationBatch = Readonly<{
  token: string;
  commands: readonly RoomVisualCommand[];
}>;

export type ComparisonCameraAngle = 'front' | 'side' | 'back' | 'three_quarter';

export type RoomPresentationState = Readonly<{
  clip: Readonly<{ name: ReactionClip; rate: number }> | null;
  holdPose: Readonly<{ clip: ReactionClip; normalizedTime: number; durationMs: number }> | null;
  gaze: GazeDirection | null;
  emotion: MomentEmotion | null;
}>;

export const EMPTY_ROOM_PRESENTATION: RoomPresentationState = Object.freeze({
  clip: null,
  holdPose: null,
  gaze: null,
  emotion: null,
});

/** Returns null when React has already delivered this exact batch token. */
export class RoomPresentationBatchGate {
  private token: string | null = null;

  take(batch: RoomPresentationBatch | undefined): readonly RoomVisualCommand[] | null {
    const nextToken = batch?.token ?? null;
    if (nextToken === this.token) return null;
    this.token = nextToken;
    return batch?.commands ?? [{ type: 'clear_presentation' }];
  }
}

export function reduceRoomPresentation(
  current: RoomPresentationState,
  commands: readonly RoomVisualCommand[],
): RoomPresentationState {
  let next = current;
  for (const command of commands) {
    if (command.type === 'clear_presentation') {
      next = EMPTY_ROOM_PRESENTATION;
    } else if (command.type === 'play_clip') {
      next = { ...next, clip: { name: command.clip, rate: command.rate }, holdPose: null };
    } else if (command.type === 'hold_pose') {
      next = { ...next, holdPose: command };
    } else if (command.type === 'set_gaze') {
      next = { ...next, gaze: command.direction };
    } else if (command.type === 'set_emotion') {
      next = { ...next, emotion: command.emotion };
    }
  }
  return next;
}

export function comparisonCameraYaw(angle: ComparisonCameraAngle): number {
  // Face geometry points toward +Z, the same side as the room camera.
  if (angle === 'side') return Math.PI / 2;
  if (angle === 'back') return Math.PI;
  if (angle === 'three_quarter') return Math.PI / 4;
  return 0;
}

/**
 * Reversible preview weights for the source GLB's named morph targets. Clip
 * animation remains the base layer; the renderer applies these as minima.
 */
export function presentationMorphWeights(
  gaze: GazeDirection | null,
  emotion: MomentEmotion | null,
): Readonly<Record<string, number>> {
  const weights: Record<string, number> = {};
  if (gaze === 'aside') weights.GlanceLeft = 0.58;
  else if (gaze === 'object') weights.GlanceRight = 0.5;
  else if (gaze === 'down') weights.DryLook = 0.48;
  else if (gaze === 'rest') weights.DryLook = 0.18;

  if (emotion === 'interested') {
    weights.RoundEyes = 0.32;
    weights.EarFollow = 0.18;
  } else if (emotion === 'content') {
    weights.TinySmile = 0.62;
  } else if (emotion === 'surprised') {
    weights.RoundEyes = 0.82;
    weights.EarFollow = 0.38;
  } else if (emotion === 'shy') {
    weights.TinySmile = 0.22;
    weights.DryLook = Math.max(weights.DryLook ?? 0, 0.34);
  } else if (emotion === 'sleepy') {
    weights.Blink = 0.5;
    weights.DryLook = Math.max(weights.DryLook ?? 0, 0.24);
  }
  return weights;
}
