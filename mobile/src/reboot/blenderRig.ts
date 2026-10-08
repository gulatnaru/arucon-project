import * as THREE from 'three';

/** Preserve Blender's rest bones; shared v8 controls remain non-rendering proxies.
 * Navigation owns the supporting foot's world position, Blender owns toe/torso acting.
 */
export class BlenderBabyRig {
  private paws: { control: THREE.Group; bone: THREE.Bone; rest: THREE.Vector3 }[] = [];
  private ears: { control: THREE.Group; bone: THREE.Bone }[] = [];
  private faces: THREE.Mesh[] = [];
  private target = new THREE.Vector3();
  private inverse = new THREE.Matrix4();
  private delta = new THREE.Quaternion();
  constructor(private model: THREE.Object3D) {
    model.traverse(n => { if (n instanceof THREE.Mesh && n.morphTargetInfluences?.length) this.faces.push(n); });
    for (const [i, side] of ['L', 'R'].entries()) {
      const bone = model.getObjectByName(`Paw${side}`);
      const ear = model.getObjectByName(`Ear${side}`);
      if (!(bone instanceof THREE.Bone) || !(ear instanceof THREE.Bone)) throw new Error('Blender candidate rig is incomplete');
      const control = new THREE.Group(); control.name = `Foot_${side}_Front`; model.add(control);
      this.paws.push({ control, bone, rest: new THREE.Vector3(i ? .265 : -.265, .21, .10) });
      const earControl = new THREE.Group(); earControl.name = `Ear_${side}`; model.add(earControl);
      this.ears.push({ control: earControl, bone: ear });
    }
  }
  /** Call after the authored mixer and the shared gait/morph controls. */
  apply(resting = false) {
    if (resting) {
      for (const { control } of this.paws) control.position.set(0, 0, 0);
      for (const { control } of this.ears) control.rotation.set(0, 0, 0);
      for (const face of this.faces) {
        face.morphTargetInfluences!.fill(0);
        const blink = face.morphTargetDictionary?.Blink;
        if (blink !== undefined) face.morphTargetInfluences![blink] = 1;
      }
      for (const side of [-1, 1]) { const spark = this.model.getObjectByName('EyeSpark' + side); if (spark) spark.visible = false; }
    }
    this.model.updateWorldMatrix(true, true);
    for (const { control, bone, rest } of this.paws) {
      this.target.copy(rest).applyMatrix4(control.matrixWorld);
      this.inverse.copy(bone.parent!.matrixWorld).invert();
      bone.position.copy(this.target.applyMatrix4(this.inverse));
    }
    for (const { control, bone } of this.ears) bone.quaternion.multiply(this.delta.setFromEuler(control.rotation));
    this.model.updateWorldMatrix(true, true);
  }
}
