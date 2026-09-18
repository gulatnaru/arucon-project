import * as THREE from 'three';
import { reducedPoseTime } from './motion';

/** Hold a sampled GLB pose when the OS requests reduced motion. */
export function holdReducedPose(action: THREE.AnimationAction): boolean {
  const clip = action.getClip();
  const pose = reducedPoseTime(clip.name, clip.duration);
  if (pose === null) return false;
  action.reset().setEffectiveWeight(1).play();
  action.time = pose;
  action.paused = true;
  return true;
}
