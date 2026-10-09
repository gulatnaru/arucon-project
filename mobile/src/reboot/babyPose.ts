import * as THREE from 'three';
import type { RebootPose } from './director';
import type { BabyExpression } from './contracts';

type Rig = { eyes: THREE.Mesh[]; mouth?: THREE.Mesh; brows: THREE.Mesh[]; cheeks: THREE.Mesh[];
  ears: THREE.Object3D[]; hat?: THREE.Object3D; paw?: THREE.Object3D; leftPaw?: THREE.Object3D; pawLift: number; leftPawLift: number; pawReach: number; position: THREE.Vector3; rotation: THREE.Vector3;
  targetPosition: THREE.Vector3; targetRotation: THREE.Vector3; faceNodes: { mesh: THREE.Mesh; entries: [string, number][]; eye: boolean }[];
  weights: Record<string, number>; lastExpression: BabyExpression };
const rigs = new WeakMap<THREE.Object3D, Rig>();
const cheekPlain = new THREE.Color('#e8b5c6'), cheekWarm = new THREE.Color('#dc97b0');
function rigFor(model: THREE.Object3D): Rig {
  const existing = rigs.get(model); if (existing) return existing;
  const meshes = (names: string[]) => names.map(name => model.getObjectByName(name)).filter((n): n is THREE.Mesh => n instanceof THREE.Mesh);
  const rig: Rig = { eyes: meshes(['Eye_L', 'Eye_R']), mouth: meshes(['Mouth'])[0], brows: meshes(['Brow_-1', 'Brow_1']),
    cheeks: meshes(['Cheek-1', 'Cheek1']), ears: ['Ear_L', 'Ear_R'].flatMap(name => { const n = model.getObjectByName(name); return n ? [n] : []; }),
    hat: model.getObjectByName('RebootHat'), paw: model.getObjectByName('Foot_R_Front'), leftPaw: model.getObjectByName('Foot_L_Front'), pawLift: 0, leftPawLift: 0, pawReach: 0, position: new THREE.Vector3(), rotation: new THREE.Vector3(),
    targetPosition: new THREE.Vector3(), targetRotation: new THREE.Vector3(), faceNodes: [], weights: {}, lastExpression: 'curious' };
  const lids = meshes(['Lid_-1', 'Lid_1']);
  rig.faceNodes = [...rig.eyes, ...lids, ...rig.cheeks, ...rig.brows, ...(rig.mouth ? [rig.mouth] : [])].map(mesh => ({ mesh, entries: Object.entries(mesh.morphTargetDictionary ?? {}), eye: rig.eyes.includes(mesh) || lids.includes(mesh) }));
  rigs.set(model, rig); return rig;
}
const faceTargets: Record<BabyExpression, Record<string, number>> = {
  curious: { Curious: .9, Lift: .72, Smile: .15 },
  excited: { Happy: .65, Open: .68, Smile: .24, Lift: .35 },
  playful: { Mischief: .12, Playful: .95 },
  surprised: { Surprised: .94, Open: .97, Lift: .95 },
  content: { Happy: .22, Smile: .8 },
  embarrassed: { Mischief: .42, Bashful: .95 },
  sleepy: { Sleepy: .96, Open: .55 },
};

/** Additive whole attached-body acting and cached facial rig. No SQL/React/random. */
export function applyBabyPose(orientation: THREE.Group, model: THREE.Object3D, pose: RebootPose | undefined,
  time: number, dt: number, moving: boolean, reduced: boolean, grounded = false, neutral = false) {
  const rig = rigFor(model), baby = pose?.baby, expression = baby?.beat.expression ?? 'curious';
  const alpha = 1 - Math.exp(-14 * Math.min(.1, Math.max(0, dt))), soft = reduced ? .22 : 1;
  const p = baby?.progress ?? 0, pulse = Math.sin(Math.PI * p), recovering = pose?.phase === 'recover';
  const contact = pose?.phase === 'contact';
  const weight = contact ? 1 : recovering ? 1 - p * p * (3 - 2 * p) : 0;
  const id = baby?.beat.id ?? 'notice';
  const targetPosition = rig.targetPosition.set(0, 0, 0), targetRotation = rig.targetRotation.set(0, 0, 0);
  if (moving) {
    targetPosition.y = reduced || grounded ? 0 : Math.max(0, Math.sin(time * 12)) * .065;
    targetRotation.z = grounded ? 0 : Math.sin(time * 6) * .04 * soft;
  } else if (contact || recovering) {
    if (['tiny_hops', 'paw_flick', 'hat_test_step'].includes(id)) {
      targetPosition.y = reduced || grounded ? 0 : Math.max(0, Math.sin(p * Math.PI * 4)) * .13 * weight;
      targetRotation.z = Math.sin(p * Math.PI * 2) * .13 * weight * soft;
    } else if (['too_close', 'oops'].includes(id)) {
      targetPosition.z = -.095 * pulse * weight * soft;
      targetRotation.x = -.17 * pulse * weight * soft;
    } else if (['shake', 'hat_shake', 'tickle', 'body_wiggle'].includes(id)) {
      targetRotation.z = Math.sin(time * 15) * .13 * weight * soft;
      targetRotation.y = Math.sin(time * 11) * .10 * weight * soft;
    } else if (['head_lean', 'familiar_nuzzle', 'startle_then_lean', 'lean'].includes(id) || baby?.touchStyle === 'head_lean' && recovering) {
      targetPosition.z = .105 * Math.min(1, p * 3) * weight;
      targetRotation.z = -.12 * Math.min(1, p * 3) * weight * soft;
    } else if (id === 'side_nuzzle') {
      targetPosition.x = .07 * weight * soft; targetRotation.z = .14 * weight * soft;
    } else if (id === 'peek' || id === 'sneak') {
      targetRotation.z = -.15 * pulse * weight * soft; targetRotation.y = .18 * pulse * weight * soft;
    } else if (id === 'sniff') {
      targetRotation.x = .11 * pulse * weight * soft; targetPosition.z = .04 * pulse * weight * soft;
    } else if (id === 'scan') {
      targetRotation.y = .32 * Math.sin(p * Math.PI * 2) * weight * soft;
    } else if (id === 'yawn') targetRotation.x = -.085 * pulse * weight * soft;
    else if (id === 'look_back' || id === 'hat_show') targetRotation.z = .07 * pulse * weight * soft;
  } else if (pose?.phase === 'look') targetRotation.y = Math.sin(time * 4.5) * .16 * soft;
  rig.position.lerp(targetPosition, alpha); rig.rotation.lerp(targetRotation, alpha);
  const pawTarget = (id === 'paw_offer' ? .18 : id === 'paw_flick' ? .22 * Math.max(0, Math.sin(p * Math.PI * 2))
    : id === 'cushion_knead' ? .10 * Math.max(0, Math.sin(p * Math.PI * 4)) : id === 'sneak' ? .12 * pulse : 0) * weight * soft;
  const leftPawTarget = (id === 'cushion_knead' ? .10 * Math.max(0, Math.sin(p * Math.PI * 4 + Math.PI)) : 0) * weight * soft;
  rig.pawLift += (pawTarget - rig.pawLift) * alpha; rig.leftPawLift += (leftPawTarget - rig.leftPawLift) * alpha;
  rig.pawReach += ((id === 'paw_flick' ? .16 * pulse * weight * soft : 0) - rig.pawReach) * alpha;
  if (rig.paw) { rig.paw.position.y += rig.pawLift; rig.paw.position.z += rig.pawReach; }
  if (rig.leftPaw) rig.leftPaw.position.y += rig.leftPawLift;
  orientation.position.add(rig.position); orientation.rotation.x += rig.rotation.x; orientation.rotation.y += rig.rotation.y; orientation.rotation.z += rig.rotation.z;
  // An awake idle is not a perpetual asymmetric Curious expression. Explicit
  // curiosity/play/wink scenes keep their authored asymmetry on all three rigs.
  const targets = neutral || !baby ? {} : faceTargets[expression];
  for (const name of ['Curious', 'Lift', 'Smile', 'Happy', 'Mischief', 'Playful', 'Surprised', 'Open', 'Bashful', 'Sleepy'])
    rig.weights[name] = (rig.weights[name] ?? 0) + ((targets[name] ?? 0) - (rig.weights[name] ?? 0)) * alpha;
  const blink = Math.pow(Math.max(0, Math.sin(time * (expression === 'sleepy' ? .7 : 1.3))), 24);
  for (const { mesh, entries, eye } of rig.faceNodes) {
    if (!mesh.morphTargetInfluences) continue;
    for (const [name, index] of entries)
      mesh.morphTargetInfluences[index] = name === 'Blink' ? Math.max(blink, expression === 'playful' && ['Eye_L', 'Lid_-1'].includes(mesh.name) ? .92 : 0)
        : (rig.weights[name] ?? 0) * (eye ? 1 - Math.max(blink, expression === 'playful' && ['Eye_L', 'Lid_-1'].includes(mesh.name) ? .92 : 0) : 1);
  }
  for (const side of [-1, 1]) {
    const spark = model.getObjectByName('EyeSpark' + side);
    if (spark) spark.visible = blink < .5 && ['curious', 'surprised'].includes(expression);
  }
  rig.ears.forEach((ear, i) => { ear.rotation.z = (i ? -1 : 1) * (.05 * Math.sin(time * 3) + (expression === 'excited' ? .08 : expression === 'embarrassed' ? -.06 : 0)) * soft; });
  for (const cheek of rig.cheeks) {
    const material = cheek.material;
    if (!Array.isArray(material) && 'color' in material && material.color instanceof THREE.Color)
      material.color.lerp(expression === 'embarrassed' ? cheekWarm : cheekPlain, alpha);
  }
  if (rig.hat) rig.hat.rotation.z = ['hat_adjust', 'hat_recognize'].includes(id) ? .085 * pulse * soft : 0;
  rig.lastExpression = expression;
}

export function resetBabyPose(model: THREE.Object3D) {
  const rig = rigs.get(model); if (!rig) return;
  rig.position.set(0, 0, 0); rig.rotation.set(0, 0, 0); rig.weights = {};
  rig.pawLift = 0; rig.leftPawLift = 0; rig.pawReach = 0;
  for (const { mesh } of rig.faceNodes) mesh.morphTargetInfluences?.fill(0);
  for (const ear of rig.ears) ear.rotation.set(0, 0, 0);
  rig.hat?.rotation.set(0, 0, 0);
}
