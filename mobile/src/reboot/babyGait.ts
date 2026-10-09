import * as THREE from 'three';
import type { FloorPoint } from '../scene/types';

export type GaitInput = { position: FloorPoint; facing: number; scale: number; dt: number; moving: boolean; reduced: boolean; hop?: number };
type Foot = { x: number; y: number; z: number; planted: boolean; phase: number; fromX: number; fromZ: number; stopX: number; stopY: number; stopZ: number };
const smooth = (t: number) => t * t * (3 - 2 * t);

/** Top of the existing room floor/rug meshes; no collision or ownership change. */
export function babyGroundHeight(x: number, z: number) {
  const inner = (x / 2.58) ** 2 + ((z - 1.7) / 1.82) ** 2;
  if (inner <= 1) return .037 + .015 * Math.sqrt(1 - inner);
  const outer = (x / 2.67) ** 2 + ((z - 1.7) / 1.89) ** 2;
  return outer <= 1 ? .015 + .02 * Math.sqrt(1 - outer) : -.02;
}

/** Distance advances a stride; a supporting paw retains its world position. */
export class BabyGait {
  readonly feet: Foot[] = [-1, 1].map(() => ({ x: 0, y: 0, z: 0, planted: true, phase: 0, fromX: 0, fromZ: 0, stopX: 0, stopY: 0, stopZ: 0 }));
  phase = 0; height = 0; compression = 0; roll = 0; pitch = 0; active = false;
  private previous?: FloorPoint;
  private yaw = 0;
  private wasMoving = false;
  private settle = 1;
  private firstLanding = 0;
  get stopProgress() { return this.settle; }
  reset() { this.previous = undefined; this.phase = 0; this.wasMoving = false; this.settle = 1; }

  update(input: GaitInput) {
    const { position: p, facing: yaw, scale, moving, reduced } = input;
    const dt = Math.min(.1, Math.max(0, input.dt));
    let distance = this.previous ? Math.hypot(p.x - this.previous.x, p.z - this.previous.z) : 0;
    const turning = Math.abs(Math.atan2(Math.sin(yaw - this.yaw), Math.cos(yaw - this.yaw)));
    const reset = !this.previous || distance > scale * 1.5;
    if (reset) { distance = 0; this.phase = 0; this.settle = 1; }
    this.previous = { ...p }; this.yaw = yaw;
    if (moving) this.phase += distance / (scale * .85) + turning * .07;
    if (!moving && this.wasMoving) {
      this.settle = 0;
      this.firstLanding = this.feet[0].y >= this.feet[1].y ? 0 : 1;
      for (const foot of this.feet) { foot.stopX=foot.x;foot.stopY=foot.y;foot.stopZ=foot.z; }
    }
    this.settle = Math.min(1, this.settle + dt / .32);
    this.wasMoving = moving;
    this.active = moving || this.settle < 1 || input.hop !== undefined;
    const soft = reduced ? .28 : 1;
    const wave = Math.sin(this.phase * Math.PI * 2);
    this.height = moving ? .018 * (1 - Math.cos(this.phase * Math.PI * 4)) * scale * soft : 0;
    this.roll = moving ? wave * .045 * soft : 0;
    this.pitch = moving ? .035 * soft : -.025 * Math.sin(this.settle * Math.PI) * soft;
    this.compression = .045 * Math.sin(this.settle * Math.PI) * soft;
    let hopHeight = 0;
    if (input.hop !== undefined) {
      const h = (Math.min(.99999, input.hop) * 2) % 1;
      if (h >= .18 && h < .76) { const t = (h - .18) / .58; hopHeight = .19 * 4 * t * (1 - t) * scale * soft; }
      this.compression = (h < .18 ? .06 * Math.sin(h / .18 * Math.PI) : h >= .76 ? .085 * Math.sin((h - .76) / .24 * Math.PI) : -.025) * soft;
      this.height = hopHeight; this.pitch = -.045 * Math.sin(h * Math.PI * 2) * soft;
    }
    this.feet.forEach((foot, index) => {
      const side = index ? 1 : -1;
      const lateral = side * .265 * scale;
      const nominalX = p.x + lateral * Math.cos(yaw) + .10 * scale * Math.sin(yaw);
      const nominalZ = p.z - lateral * Math.sin(yaw) + .10 * scale * Math.cos(yaw);
      const phase = (this.phase + index * .5) % 1;
      if (reset || (!moving && this.settle >= 1) || input.hop !== undefined) {
        foot.x = nominalX; foot.z = nominalZ; foot.y = hopHeight;
        foot.planted = hopHeight <= .001; foot.phase = phase;
      } else if (moving) {
        const swing = phase >= .60;
        if (swing && foot.planted) { foot.fromX = foot.x; foot.fromZ = foot.z; }
        if (swing) {
          const t = (phase - .60) / .40, ease = smooth(t), lead = .255 * scale;
          foot.x = foot.fromX + (nominalX + Math.sin(yaw) * lead - foot.fromX) * ease;
          foot.z = foot.fromZ + (nominalZ + Math.cos(yaw) * lead - foot.fromZ) * ease;
          foot.y = .14 * Math.sin(Math.PI * t) * scale * (reduced ? .65 : 1);
        } else foot.y = 0;
        foot.planted = !swing; foot.phase = phase;
      } else {
        // One small landing step at a time; planted feet must not slide to neutral.
        const t=Math.max(0,Math.min(1,(this.settle-(index===this.firstLanding?0:.5))*2));
        const ease=smooth(t), travel=Math.hypot(nominalX-foot.stopX,nominalZ-foot.stopZ);
        foot.x=foot.stopX+(nominalX-foot.stopX)*ease;foot.z=foot.stopZ+(nominalZ-foot.stopZ)*ease;
        foot.y=foot.stopY*(1-ease)+Math.min(.09*scale,travel*.5)*Math.sin(Math.PI*t);
        foot.planted=t===0&&foot.stopY===0||t===1;
      }
    });
    return this;
  }
}

/** Model-only rig. Foot endpoints are transformed back through the posed root. */
export class BabyGaitRig {
  readonly gait = new BabyGait();
  private inverse = new THREE.Matrix4();
  private target = new THREE.Vector3();
  private scale = new THREE.Vector3();
  private footMeshes: THREE.Object3D[];
  private shadow: THREE.Group;
  private bodyShadow: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private soleShadows: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>[];
  private footprint = new THREE.Vector3();
  constructor(private model: THREE.Object3D, scene: THREE.Scene) {
    this.footMeshes = ['Foot_L_Front','Foot_R_Front'].map(name => model.getObjectByName(name)!);
    this.shadow=new THREE.Group(); scene.add(this.shadow);
    // A tiny analytic disc: no texture upload, shadow map or postprocess pass.
    const make = () => {
      const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
        polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2,
        uniforms:{opacity:{value:.28}},
        vertexShader:'varying vec2 shadowUv; void main(){shadowUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader:'varying vec2 shadowUv; uniform float opacity; void main(){vec2 p=shadowUv*2.0-1.0;float a=max(0.0,1.0-dot(p,p));gl_FragColor=vec4(0.36,0.30,0.27,a*a*opacity);}',
      });
      material.forceSinglePass=true;
      const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material);
      m.rotation.x=-Math.PI/2;this.shadow.add(m);return m;
    };
    this.bodyShadow=make();this.soleShadows=[make(),make()];
  }
  apply(orientation: THREE.Group, input: GaitInput, enabled: boolean) {
    this.shadow.visible=enabled;
    if (!enabled) { this.gait.reset(); return; }
    const g=this.gait.update(input);
    const dockHeight=Math.max(0,orientation.position.y);
    const onObject=dockHeight>.1;
    orientation.position.y += g.height + (onObject ? 0 : babyGroundHeight(input.position.x,input.position.z));
    orientation.rotation.z += g.roll; orientation.rotation.x += g.pitch;
    orientation.scale.x *= 1+g.compression*.45;
    orientation.scale.y *= 1-g.compression;
    orientation.scale.z *= 1+g.compression*.45;
    this.model.updateWorldMatrix(true,true);
    const root=this.footMeshes[0].parent!;
    this.inverse.copy(root.matrixWorld).invert(); root.getWorldScale(this.scale);
    this.footMeshes.forEach((foot,index) => {
      const side=index?1:-1, plant=g.feet[index];
      if (g.active) {
        this.target.set(plant.x, dockHeight + (onObject?0:babyGroundHeight(plant.x,plant.z)) + plant.y + .21*this.scale.y, plant.z).applyMatrix4(this.inverse);
        foot.position.set(this.target.x-side*.265,this.target.y-.21,this.target.z-.10);
      }
      foot.updateWorldMatrix(true,false);
      this.footprint.set(side*.265,.0,.10).applyMatrix4(foot.matrixWorld);
      const ground=babyGroundHeight(this.footprint.x,this.footprint.z);
      const shadow=this.soleShadows[index];shadow.position.set(this.footprint.x,ground+.004,this.footprint.z);
      shadow.scale.set(.39*input.scale,.38*input.scale,1);
      shadow.material.uniforms.opacity.value=.34*Math.max(0,1-Math.max(0,this.footprint.y-ground)/(.24*input.scale));
    });
    this.bodyShadow.position.set(input.position.x,babyGroundHeight(input.position.x,input.position.z)+.003,input.position.z);
    const spread=1+g.height*1.8;
    this.bodyShadow.scale.set(1.3*input.scale*spread,1.03*input.scale*spread,1);
    this.bodyShadow.material.uniforms.opacity.value=.27/(1+Math.max(0,orientation.position.y)*4);
  }
  dispose() {
    this.shadow.removeFromParent();
    for (const s of [this.bodyShadow,...this.soleShadows]) {s.geometry.dispose();s.material.dispose();}
  }
}
