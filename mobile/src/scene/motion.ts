import type { FloorPoint } from './types';

export const MOTION = Object.freeze({
  walkReserved: 1.55,
  walkExpressive: 1.72,
  turnResponse: 12,
  acceleration: 14,
  arrivalResponse: 6,
  blendSeconds: 0.14,
  idleReserved: 5.8,
  idleExpressive: 4.3,
  simulationStep: 1 / 120,
  maxCatchupSeconds: 0.12,
  springStiffness: 110,
  springDamping: 15,
  postTouchSeconds: 2.1,
  reducedPoseSeconds: 0.45,
});

export type WalkState = { position: FloorPoint; facing: number; speed: number };

export function advanceWalk(state: WalkState, target: FloorPoint, dt: number, personality: 'reserved' | 'expressive', through: boolean): WalkState {
  if (!(dt > 0)) return state;
  const dx = target.x - state.position.x, dz = target.z - state.position.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 0.001) return { ...state, position: target, speed: 0 };
  const yaw = Math.atan2(dx, dz);
  const facing = state.facing + Math.atan2(Math.sin(yaw - state.facing), Math.cos(yaw - state.facing)) * (1 - Math.exp(-MOTION.turnResponse * dt));
  const maxSpeed = personality === 'expressive' ? MOTION.walkExpressive : MOTION.walkReserved;
  const wanted = Math.min(maxSpeed, through ? maxSpeed : distance * MOTION.arrivalResponse) * Math.max(0.08, Math.cos(yaw - facing));
  const speed = state.speed + (wanted - state.speed) * (1 - Math.exp(-MOTION.acceleration * dt));
  const step = Math.min(distance, speed * dt);
  return { position: { x: state.position.x + dx / distance * step, z: state.position.z + dz / distance * step }, facing, speed };
}

export function springStep(press: number, velocity: number, holding: boolean, dt: number) {
  const nextVelocity = velocity + ((holding ? 1 : 0) - press) * MOTION.springStiffness * dt - velocity * MOTION.springDamping * dt;
  return { press: press + nextVelocity * dt, velocity: nextVelocity };
}

export function shouldPauseDecorativeMotion(reduced: boolean, moving: boolean, touching: boolean, cuePlaying: boolean) {
  // Manual travel remains visible; touch/meal/ball use a short held pose.
  void touching; void cuePlaying;
  return reduced && !moving;
}

export function reducedPoseTime(clipName: string, duration: number): number | null {
  if (clipName.startsWith('pet_') || clipName === 'eat' || clipName.endsWith('_ball')) return Math.min(0.25, duration / 2);
  return null;
}

export function cueDuration(duration: number, rate: number, reduced: boolean): number {
  return reduced ? MOTION.reducedPoseSeconds : duration / rate;
}
