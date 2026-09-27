export type RoomInteraction = 'idle' | 'autonomous' | 'move' | 'pet' | 'committed_cue' | 'sleep' | 'panel';

/** Higher priority interactions may cancel lower priority presentation work. */
export const ROOM_INTERACTION_PRIORITY: Readonly<Record<RoomInteraction, number>> = Object.freeze({
  idle: 0,
  autonomous: 1,
  move: 2,
  pet: 3,
  committed_cue: 4,
  sleep: 5,
  panel: 6,
});

export function canStartRoomInteraction(active: RoomInteraction, requested: RoomInteraction): boolean {
  if (active === 'committed_cue' && requested !== 'sleep' && requested !== 'panel') return false;
  return ROOM_INTERACTION_PRIORITY[requested] >= ROOM_INTERACTION_PRIORITY[active];
}

export function resolveRoomInteraction(state: Readonly<{
  interactionEnabled: boolean;
  sleeping: boolean;
  committedCueActive: boolean;
  touching: boolean;
  moving: boolean;
  freePresentationActive: boolean;
}>): RoomInteraction {
  if (!state.interactionEnabled) return 'panel';
  if (state.sleeping) return 'sleep';
  if (state.committedCueActive) return 'committed_cue';
  if (state.touching) return 'pet';
  if (state.moving) return 'move';
  if (state.freePresentationActive) return 'autonomous';
  return 'idle';
}

export type PetGestureResult = 'started' | 'ignored_extra_pointer' | 'rejected' | 'ended' | 'cancelled' | 'ignored';
export type PetActivationResult = 'committed_active' | 'committed_released' | 'accessible_activation' | 'ignored';

/**
 * Owns one pointer from press start through release/cancel. A second pointer
 * cancels the gesture so it cannot leave the pet held after responder churn.
 */
export class PetGestureSession {
  private pointerId: number | string | null = null;
  private accepted = false;
  private releasedAccepted = false;
  private blockedActivation = false;

  get active() { return this.pointerId !== null; }

  begin(pointerId: number | string, touches: number, accept: () => boolean): PetGestureResult {
    if (touches !== 1 || this.pointerId !== null) return 'ignored_extra_pointer';
    this.releasedAccepted = false;
    this.blockedActivation = false;
    this.pointerId = pointerId;
    this.accepted = accept();
    if (!this.accepted) {
      this.pointerId = null;
      this.blockedActivation = true;
      return 'rejected';
    }
    return 'started';
  }

  end(pointerId: number | string): PetGestureResult {
    if (this.pointerId !== pointerId) return 'ignored';
    this.pointerId = null;
    const result = this.accepted ? 'ended' : 'ignored';
    this.releasedAccepted = this.accepted;
    this.accepted = false;
    return result;
  }

  /**
   * Pressability may emit onPress before or after onPressOut. Activation owns
   * the single commit, while a press with no pointer events is treated as an
   * accessibility activation and never enters physical-touch measurement.
   */
  activate(): PetActivationResult {
    if (this.pointerId !== null && this.accepted) {
      this.pointerId = null;
      this.accepted = false;
      this.releasedAccepted = false;
      return 'committed_active';
    }
    if (this.releasedAccepted) {
      this.releasedAccepted = false;
      return 'committed_released';
    }
    if (this.blockedActivation) {
      this.blockedActivation = false;
      return 'ignored';
    }
    return 'accessible_activation';
  }

  cancel(): PetGestureResult {
    const hadGesture = this.pointerId !== null || this.releasedAccepted;
    this.pointerId = null;
    this.accepted = false;
    this.releasedAccepted = false;
    this.blockedActivation = true;
    return hadGesture ? 'cancelled' : 'ignored';
  }
}
