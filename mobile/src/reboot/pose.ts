import * as THREE from 'three';
import type { RebootPose } from './director';
import type { FloorPoint } from '../scene/types';

/** Arrival faces the offered hand, never the heading of the last route segment. */
export function rebootFacing(pose: RebootPose | undefined, position: FloorPoint, facing: number, dt: number): number {
  const target = pose?.gazeTarget;
  if (!target || !['look', 'contact', 'recover'].includes(pose!.phase)) return facing;
  const dx = target.x - position.x, dz = target.z - position.z;
  if (Math.hypot(dx, dz) < .01) return facing;
  const desired = Math.atan2(dx, dz), delta = Math.atan2(Math.sin(desired - facing), Math.cos(desired - facing));
  const elapsed = Math.max(0, Math.min(.1, dt));
  const step = delta * (1 - Math.exp(-9 * elapsed)), limit = 3.6 * elapsed;
  return facing + Math.max(-limit, Math.min(limit, step));
}

/** Whole attached body motion and facial morphs; no content/DB access. */
export function applyRebootPose(orientation: THREE.Group, model: THREE.Object3D, pose: RebootPose | undefined,
  time: number, moving: boolean, reduced: boolean) {
  orientation.position.set(0, 0, 0); orientation.rotation.set(0, 0, 0); orientation.scale.set(1, 1, 1);
  const front = model.getObjectByName('Foot_R_Front'), left = model.getObjectByName('Foot_L_Front');
  for (const name of ['Foot_R_Front', 'Foot_L_Front', 'Foot_R_Back', 'Foot_L_Back']) model.getObjectByName(name)?.position.set(0, 0, 0);
  const soft = reduced ? .25 : 1, p = pose?.progress ?? 0, pulse = Math.sin(Math.PI * p), maturity = pose?.stage === 'evolved' ? 2 : pose?.stage === 'growing' ? 1 : 0;
  const contact = pose?.phase === 'contact', recovering = pose?.phase === 'recover';
  const release = Math.min(1, p / .45), contactWeight = contact ? 1 : recovering ? 1 - release * release * (3 - 2 * release) : 0;
  const contactProgress = contact ? p : pose?.releaseFrom ?? 1;
  const contactPulse = Math.sin(Math.PI * contactProgress) * contactWeight;
  if (moving && !reduced) {
    const stride = Math.sin(time * 11);
    front?.position.set(0, Math.max(0, stride) * .12, stride * .10);
    left?.position.set(0, Math.max(0, -stride) * .12, -stride * .10);
    orientation.rotation.z = stride * .025;
  }
  if (pose) {
    if (pose.phase === 'look') orientation.rotation.y = Math.sin(time * 3) * .12 * soft;
    if (pose.kind === 'hand' && (contact || recovering)) {
      const ease = Math.min(1, contactProgress * 3) * contactWeight;
      orientation.position.z = (.10 + maturity * .065) * ease;
      orientation.rotation.x = (.06 + maturity * .035) * ease * soft;
      orientation.rotation.z = (maturity ? -.10 : .04 * Math.sin(time * 4)) * ease * soft;
      orientation.scale.set(1 + .025 * ease, 1 - .045 * ease, 1 + .035 * ease);
      if (maturity === 1) front?.position.set(0, .15 * Math.max(0, Math.sin(time * 2.4)) * ease * soft, .08 * ease);
      if (maturity === 2) left?.position.set(0, .11 * ease * soft, .10 * ease);
      if (recovering) {
        orientation.rotation.y += (maturity ? .40 : -.18) * pulse * soft;
        orientation.position.z -= .10 * pulse * soft;
        if (maturity === 2) front?.position.set(0, .25 * pulse * soft, .07 * pulse);
      }
    } else if ((contact || recovering) && pose.kind.startsWith('hat')) {
      const first = pose.kind === 'hat_first', busy = pose.kind === 'hat_busy';
      orientation.rotation.x = (first ? -.16 : .06) * contactPulse * soft;
      orientation.rotation.y = (first ? .55 : busy ? -.20 : .24) * Math.sin(contactProgress * Math.PI * 2) * contactWeight * soft;
      orientation.position.x = (first ? .12 : .04) * contactPulse * soft;
      if (!first) front?.position.set(0, .23 * contactPulse * soft, .05 * contactWeight);
    } else if ((contact || recovering) && (pose.kind === 'rest' || pose.kind === 'cushion_changed')) {
      orientation.position.y = .30 * Math.min(1, contactProgress * 4) * contactWeight;
      orientation.scale.set(1 + .06 * contactPulse, 1 - .12 * contactPulse, 1 + .06 * contactPulse);
      orientation.rotation.z = -.11 * contactPulse * soft;
    } else if ((contact || recovering) && pose.kind === 'stretch') {
      orientation.scale.set(1 - .05 * contactPulse * soft, 1 + .12 * contactPulse * soft, 1 - .025 * contactPulse * soft);
      front?.position.set(0, .12 * contactPulse * soft, .19 * contactPulse * soft);
    } else if ((contact || recovering) && pose.kind === 'explore') {
      orientation.rotation.y = .6 * Math.sin(contactProgress * Math.PI * 2) * contactWeight * soft;
      orientation.rotation.x = -.07 * contactPulse * soft;
    } else if ((contact || recovering) && pose.kind === 'company') orientation.rotation.z = -.10 * contactPulse * soft;
  }
  const blink = Math.pow(Math.max(0, Math.sin(time * 1.2)), 28);
  for (const name of ['Eye_L', 'Eye_R']) {
    const eye = model.getObjectByName(name);
    if (eye instanceof THREE.Mesh && eye.morphTargetInfluences) {
      const calm = pose?.kind === 'hand' ? (.10 + maturity * .10) * contactWeight : 0;
      const wink = pose?.kind === 'hand' && pose.phase === 'recover' && maturity === 2 && name === 'Eye_L' ? .85 * pulse : 0;
      eye.morphTargetInfluences[0] = pose?.kind === 'rest' ? Math.max(.55 * contactWeight, blink) : Math.max(calm, blink, wink);
      eye.morphTargetInfluences[1] = pose?.phase === 'look' ? .6 : pose?.kind === 'hat_first' ? .6 * contactWeight : 0;
    }
  }
  const mouth = model.getObjectByName('Mouth'); if (mouth instanceof THREE.Mesh && mouth.morphTargetInfluences) mouth.morphTargetInfluences[0] = (pose?.kind === 'hand' ? .7 : pose?.kind === 'hat_again' ? .5 : 0) * contactWeight;
  for (const side of [-1, 1]) { const spark = model.getObjectByName('EyeSpark' + side), eye = model.getObjectByName(side < 0 ? 'Eye_L' : 'Eye_R');
    if (spark) spark.visible = !(eye instanceof THREE.Mesh) || (eye.morphTargetInfluences?.[0] ?? 0) < .6;
  }
}
