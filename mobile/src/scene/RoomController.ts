import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import type { ExpoWebGLRenderingContext } from 'expo-gl';
import { Platform } from 'react-native';
import * as THREE from 'three';
import { FLOOR, nearestFree, route, type NavigationOptions } from './navigation';
import { MOTION, advanceWalk, springStep, shouldPauseDecorativeMotion, reducedPoseTime, cueDuration } from './motion';
import { readAssetBytes } from './assetBytes';
import {
  disposeSceneObject,
  FrameSubmissionGate,
  retainLoadedModel,
  RafGate,
  shouldPublishProjection,
} from './lifecycle';
import { COMMON_PREVIEW_ASSET_KEY, selectFormPresentation, type FormPresentation } from './formPresentation';
import { holdReducedPose } from './clipPresentation';
import { parseGlb } from './gltfRuntime';
import { roomFrameSubmissionIntervalMs, selectRoomRendererConfig } from './rendererConfig';
import { projectedHitsEqual, type HitName, type ProjectedHits } from './projectedHits';
import type { FloorPoint, RoomProps } from './types';

// The source artifact is copied byte-for-byte from references/floor-navigation-03.
// It has embedded binary geometry, 15 animation clips, and no external images.
// Metro requires a static require for non-code assets.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PET_ASSET = require('../../assets/arucon_tsundere_motion.glb') as number;
const FORM_ASSETS: Record<FormPresentation['assetKey'], number> = {
  [COMMON_PREVIEW_ASSET_KEY]: PET_ASSET,
};
let uncachedAssetSequence = 0;

export class RoomController {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera();
  readonly renderer: THREE.WebGLRenderer;
  private readonly clock = new THREE.Clock(false);
  private readonly ray = new THREE.Raycaster();
  private readonly ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly projected = new THREE.Vector3();
  private readonly petAnchor = new THREE.Group();
  private readonly targetRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.018, 6, 32),
    new THREE.MeshBasicMaterial({ color: 0x9eaa92 }),
  );
  private readonly furniture: Partial<Record<HitName, THREE.Object3D>> = {};
  private readonly rendererConfig = selectRoomRendererConfig(__DEV__);
  private readonly submissionIntervalMs: number;
  private readonly submissions: FrameSubmissionGate;
  private mixer?: THREE.AnimationMixer;
  private modelReady = false;
  private clips = new Map<string, THREE.AnimationClip>();
  private activeAction?: THREE.AnimationAction;
  private lastMealToken?: string;
  private pendingMealToken?: string;
  private cueRemaining = 0;
  private readonly frames = new RafGate((callback) => requestAnimationFrame(callback), (id) => cancelAnimationFrame(id));
  private disposed = false;
  private width: number;
  private lastPublishedProjection: ProjectedHits | null = null;
  private height: number;
  private lastProjection = 0;
  private idleTime = 0;
  private path: FloorPoint[] = [];
  private destination: FloorPoint | null = null;
  private profile: 'reserved' | 'expressive' = 'reserved';
  private formPresentation = selectFormPresentation('arucon');
  private sleeping = false;
  private reducedMotion = false;
  private touchHolding = false;
  private touchTime = 0;
  private postTouchRemaining = 0;
  private press = 0;
  private pressVelocity = 0;
  private walkSpeed = 0;
  private facing = -0.06;
  private position: FloorPoint = { x: 0, z: 1.8 };
  private navigationOptions: NavigationOptions = { tableInstalled: true, toiletInstalled: false };
  private onProjection: (hits: ProjectedHits) => void;
  private onError: (error: string) => void;

  constructor(
    private readonly gl: ExpoWebGLRenderingContext,
    width: number,
    height: number,
    onProjection: (hits: ProjectedHits) => void,
    onError: (error: string) => void,
  ) {
    this.width = width;
    this.height = height;
    this.onProjection = onProjection;
    this.onError = onError;
    const canvas = {
      width: gl.drawingBufferWidth,
      height: gl.drawingBufferHeight,
      clientWidth: gl.drawingBufferWidth,
      clientHeight: gl.drawingBufferHeight,
      style: {},
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as HTMLCanvasElement;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      context: gl as unknown as WebGLRenderingContext,
      antialias: this.rendererConfig.contextAntialias,
    });
    const rendererIdentity = Platform.OS === 'ios' ? {
      renderer: String(gl.getParameter(gl.RENDERER)),
      vendor: String(gl.getParameter(gl.VENDOR)),
      version: String(gl.getParameter(gl.VERSION)),
    } : undefined;
    this.submissionIntervalMs = roomFrameSubmissionIntervalMs(
      Platform.OS,
      rendererIdentity,
    );
    this.submissions = new FrameSubmissionGate(this.submissionIntervalMs);
    if (__DEV__ && rendererIdentity) {
      console.info('[AruconRoom] GL submission profile', {
        ...rendererIdentity,
        intervalMs: this.submissionIntervalMs,
      });
    }
    // Expo GL already supplies a device-resolution drawing buffer.
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight, false);
    this.renderer.setClearColor(0xf2ebdc);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene.background = new THREE.Color(0xf2ebdc);
    this.camera.position.set(0, 9.2, 13.5);
    this.camera.lookAt(0, 0, 1.4);
    this.resize(width, height);
    this.createRoom();
    this.scene.add(this.petAnchor);
    this.petAnchor.position.set(this.position.x, 0, this.position.z);
    this.targetRing.rotation.x = -Math.PI / 2;
    this.targetRing.position.y = 0.035;
    this.targetRing.visible = false;
    this.scene.add(this.targetRing);
  }

  resize(width: number, height: number) {
    if (width <= 0 || height <= 0) return;
    this.width = width; this.height = height;
    const halfHeight = 6.8;
    const halfWidth = halfHeight * (width / height);
    Object.assign(this.camera, { left: -halfWidth, right: halfWidth, top: halfHeight, bottom: -halfHeight });
    this.camera.updateProjectionMatrix();
    this.submissions.markDirty();
    if (this.submissionIntervalMs === 0) this.publishProjection();
  }

  setPresentation(props: RoomProps) {
    this.formPresentation = selectFormPresentation(props.formId ?? 'arucon');
    const nextProfile = props.personality ?? 'reserved';
    const nextSleeping = !!props.sleeping;
    const wasReduced = this.reducedMotion;
    this.reducedMotion = !!props.reducedMotion;
    if (!wasReduced && this.reducedMotion && this.activeAction) {
      const clip = this.activeAction.getClip();
      const pose = reducedPoseTime(clip.name, clip.duration);
      if (pose !== null) {
        this.mixer?.stopAllAction();
        holdReducedPose(this.activeAction);
        this.mixer?.update(0);
      }
      if (this.cueRemaining > 0) this.cueRemaining = Math.min(this.cueRemaining, MOTION.reducedPoseSeconds);
      if (this.postTouchRemaining > 0) this.postTouchRemaining = Math.min(this.postTouchRemaining, MOTION.reducedPoseSeconds);
    }
    if (nextProfile !== this.profile || nextSleeping !== this.sleeping) {
      this.profile = nextProfile; this.sleeping = nextSleeping;
      if (nextSleeping) { this.path = []; this.destination = null; this.targetRing.visible = false; }
      this.selectClip(nextSleeping ? 'sleep' : `idle_${nextProfile}`);
    }
    this.furniture.table!.visible = props.tableInstalled ?? true;
    this.furniture.toilet!.visible = props.toiletInstalled ?? false;
    this.furniture.ball!.visible = props.ballVisible ?? false;
    this.furniture.cushion!.visible = props.cushionVisible ?? false;
    this.navigationOptions = { tableInstalled: props.tableInstalled ?? true, toiletInstalled: !!props.toiletInstalled };
    if (props.mealCue && props.mealCue.token !== this.lastMealToken) {
      if (!this.mixer) this.pendingMealToken = props.mealCue.token;
      else { this.lastMealToken = props.mealCue.token; this.playCue('eat', 1.2); }
    }
    this.submissions.markDirty();
    if (this.submissionIntervalMs === 0) this.publishProjection();
  }

  private material(color: number, roughness = 0.95) {
    return this.rendererConfig.roomMaterial === 'lambert'
      ? new THREE.MeshLambertMaterial({ color })
      : new THREE.MeshStandardMaterial({ color, roughness });
  }

  private addBox(parent: THREE.Object3D, color: number, size: [number, number, number], at: [number, number, number]) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), this.material(color));
    mesh.position.set(...at); parent.add(mesh); return mesh;
  }

  private addSphere(parent: THREE.Object3D, color: number, scale: [number, number, number], at: [number, number, number]) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), this.material(color));
    mesh.scale.set(...scale); mesh.position.set(...at); parent.add(mesh); return mesh;
  }

  private createRoom() {
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xc9b49a, 2.4));
    const sun = new THREE.DirectionalLight(0xfff3d9, 2.0);
    sun.position.set(-3, 9, 7); this.scene.add(sun);
    this.addBox(this.scene, 0xe9d8be, [18, 0.2, 22], [0, -0.12, 1]);
    this.addBox(this.scene, 0xf2eee2, [18, 7, 0.15], [0, 3.4, -5.1]);
    this.addBox(this.scene, 0xc1ceba, [18, 1.15, 0.13], [0, 0.52, -4.97]);
    this.addBox(this.scene, 0xe9e5d8, [18, 0.09, 0.19], [0, 1.10, -4.85]);
    // Window and rug reproduce the reference composition with native meshes.
    this.addBox(this.scene, 0xc6ba9f, [2.25, 2.7, 0.08], [-0.45, 2.18, -4.91]);
    this.addBox(this.scene, 0xcde2e4, [2.05, 2.45, 0.04], [-0.45, 2.2, -4.84]);
    this.addBox(this.scene, 0xf7f3e9, [0.07, 2.45, 0.07], [-0.45, 2.2, -4.79]);
    this.addBox(this.scene, 0xf7f3e9, [2.05, 0.07, 0.07], [-0.45, 2.0, -4.78]);
    this.addSphere(this.scene, 0xd2be9c, [2.67, 0.02, 1.89], [0, 0.015, 1.7]);
    this.addSphere(this.scene, 0xeee2c8, [2.58, 0.015, 1.82], [0, 0.037, 1.7]);
    const table = new THREE.Group(); table.position.set(2.28, 0, 0.1);
    for (const x of [-0.42, 0.42]) for (const z of [-0.27, 0.27]) this.addBox(table, 0xbe9b75, [0.1, 0.37, 0.1], [x, 0.22, z]);
    this.addSphere(table, 0xcdac87, [0.72, 0.1, 0.52], [0, 0.44, 0]);
    this.addSphere(table, 0xf8eedb, [0.22, 0.07, 0.18], [-0.09, 0.54, -0.23]);
    this.scene.add(table); this.furniture.table = table;
    const cushion = new THREE.Group(); cushion.position.set(-2.05, 0, 0.2);
    this.addSphere(cushion, 0xb1a0ba, [0.91, 0.14, 0.68], [0, 0.12, 0]);
    this.addSphere(cushion, 0xc9bad0, [0.85, 0.22, 0.63], [0, 0.25, 0]);
    this.scene.add(cushion); this.furniture.cushion = cushion;
    const plant = new THREE.Group(); plant.position.set(-2.8, 0, -3.65);
    this.addBox(plant, 0xd5b69b, [0.48, 0.42, 0.48], [0, 0.23, 0]);
    for (let i = 0; i < 6; i++) this.addSphere(plant, 0x92a080, [0.13, 0.29, 0.08], [(i % 2 ? 1 : -1) * 0.22, 0.75 + i * 0.12, 0]);
    this.scene.add(plant);
    const toilet = new THREE.Group(); toilet.position.set(-2.6, 0, -1.62);
    this.addSphere(toilet, 0x9fac96, [0.52, 0.52, 0.44], [0, 0.42, 0]);
    this.scene.add(toilet); this.furniture.toilet = toilet;
    const ball = new THREE.Group(); ball.position.set(1.35, 0.2, 3.1);
    this.addSphere(ball, 0xdca28c, [0.22, 0.22, 0.22], [0, 0, 0]);
    this.scene.add(ball); this.furniture.ball = ball;
  }

  async loadPet() {
    try {
      const asset = Asset.fromModule(FORM_ASSETS[this.formPresentation.assetKey]);
      await asset.downloadAsync();
      if (!asset.localUri) throw new Error('GLB local URI is unavailable');
      const bytes = await readAssetBytes({
        platform: Platform.OS,
        bundleUri: Platform.OS === 'ios' ? Paths.bundle.uri : '',
        source: new File(asset.localUri),
        hash: asset.hash,
        type: asset.type,
        createCacheFile: name => new File(Paths.cache, name),
        uniqueSuffix: () => `${Date.now()}-${uncachedAssetSequence++}`,
      });
      if (this.disposed) return;
      const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const gltf = await parseGlb(data);
      const loaded = retainLoadedModel(gltf.scene, this.disposed);
      if (!loaded) return;
      loaded.scale.setScalar(0.62);
      this.petAnchor.add(loaded);
      this.modelReady = true;
      this.submissions.markDirty();
      this.mixer = new THREE.AnimationMixer(loaded);
      for (const clip of gltf.animations) this.clips.set(clip.name, clip);
      this.selectClip(this.sleeping ? 'sleep' : `idle_${this.profile}`);
      if (this.pendingMealToken) {
        this.lastMealToken = this.pendingMealToken;
        this.pendingMealToken = undefined;
        this.playCue('eat', 1.2);
      }
      if (this.submissionIntervalMs === 0) this.publishProjection();
    } catch (error) {
      if (!this.disposed) this.onError(`아루콘 모델을 열지 못했어요: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private selectClip(name: string, once = false, rate = 1) {
    if (!this.mixer) return;
    const clip = this.clips.get(name);
    if (!clip || (!once && this.activeAction?.getClip() === clip)) return;
    const next = this.mixer.clipAction(clip);
    next.reset().setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity).setEffectiveTimeScale(rate).setEffectiveWeight(1).play();
    next.clampWhenFinished = once;
    const pose = this.reducedMotion ? reducedPoseTime(name, clip.duration) : null;
    if (pose !== null) {
      this.mixer.stopAllAction();
      holdReducedPose(next);
    } else {
      if (this.activeAction) this.activeAction.fadeOut(MOTION.blendSeconds);
      next.fadeIn(MOTION.blendSeconds);
    }
    this.activeAction = next;
    if (next.paused) this.mixer.update(0);
  }

  private playCue(name: string, rate: number) {
    const clip = this.clips.get(name);
    if (!clip || this.sleeping) return;
    this.path = []; this.destination = null; this.targetRing.visible = false;
    this.idleTime = 0;
    this.cueRemaining = cueDuration(clip.duration, rate, this.reducedMotion);
    this.selectClip(name, true, rate);
    this.submissions.markDirty();
  }

  playBall() { this.playCue(this.profile === 'reserved' ? 'tsundere_ball' : 'honest_ball', 1.6); }

  private project(object: THREE.Object3D, elevation = 0) {
    object.getWorldPosition(this.projected);
    this.projected.y += elevation;
    this.projected.project(this.camera);
    return { x: (this.projected.x + 1) * this.width / 2, y: (1 - this.projected.y) * this.height / 2, visible: this.projected.z >= -1 && this.projected.z <= 1 && this.projected.x >= -1 && this.projected.x <= 1 && this.projected.y >= -1 && this.projected.y <= 1 };
  }

  private publishProjection() {
    if (this.disposed || this.width <= 0 || this.height <= 0) return;
    this.scene.updateMatrixWorld(true);
    const pet = this.project(this.petAnchor, 0.75);
    const hits: ProjectedHits = {
      pet: { ...pet, visible: this.modelReady && pet.visible },
      table: this.project(this.furniture.table ?? this.scene, 0.45),
      cushion: this.project(this.furniture.cushion ?? this.scene, 0.28),
      toilet: this.project(this.furniture.toilet ?? this.scene, 0.4),
      ball: this.project(this.furniture.ball ?? this.scene, 0.2),
    };
    if (this.lastPublishedProjection && projectedHitsEqual(this.lastPublishedProjection, hits)) return;
    this.lastPublishedProjection = hits;
    this.onProjection(hits);
  }

  screenToFloor(x: number, y: number): FloorPoint | null {
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > this.width || y > this.height) return null;
    this.ray.setFromCamera(new THREE.Vector2(2 * x / this.width - 1, 1 - 2 * y / this.height), this.camera);
    const hit = this.ray.ray.intersectPlane(this.ground, new THREE.Vector3());
    if (!hit || hit.x < FLOOR.x[0] || hit.x > FLOOR.x[1] || hit.z < FLOOR.z[0] || hit.z > FLOOR.z[1]) return null;
    return { x: hit.x, z: hit.z };
  }

  moveTo(raw: FloorPoint): FloorPoint | null {
    if (this.sleeping || this.touchHolding || this.cueRemaining > 0) return null;
    const target = nearestFree(raw, this.navigationOptions);
    if (!target) return null;
    const path = route(this.position, target, this.navigationOptions);
    if (!path.length) return null;
    this.path = path; this.destination = target;
    this.idleTime = 0;
    this.walkSpeed = 0;
    this.postTouchRemaining = 0;
    this.targetRing.position.set(target.x, 0.035, target.z);
    this.targetRing.visible = true;
    this.selectClip('walk');
    this.submissions.markDirty();
    return target;
  }

  beginPet() {
    if (this.sleeping || this.cueRemaining > 0) return false;
    this.path = []; this.destination = null; this.targetRing.visible = false;
    this.touchHolding = true; this.touchTime = 0;
    this.postTouchRemaining = 0;
    this.idleTime = 0;
    this.selectClip(this.profile === 'reserved' ? 'pet_reserved' : 'pet_expressive');
    this.submissions.markDirty();
    return true;
  }

  endPet() {
    if (!this.touchHolding) return false;
    this.touchHolding = false; this.touchTime = 0;
    this.postTouchRemaining = this.reducedMotion ? MOTION.reducedPoseSeconds : MOTION.postTouchSeconds;
    if (!this.postTouchRemaining) this.selectClip(`idle_${this.profile}`);
    this.submissions.markDirty();
    return true;
  }

  private tick = (timestamp: number) => {
    if (this.disposed) return;
    const dt = Math.min(MOTION.maxCatchupSeconds, this.clock.getDelta());
    if (this.cueRemaining > 0) {
      this.cueRemaining = Math.max(0, this.cueRemaining - dt);
      if (this.cueRemaining === 0) this.selectClip(this.sleeping ? 'sleep' : `idle_${this.profile}`);
    }
    if (this.path.length) {
      let remaining = dt;
      while (remaining > 1e-9 && this.path.length) {
        const h = Math.min(MOTION.simulationStep, remaining);
        const next = this.path[0];
        const updated = advanceWalk({ position: this.position, facing: this.facing, speed: this.walkSpeed }, next, h, this.profile, this.path.length > 1);
        this.position = updated.position; this.facing = updated.facing; this.walkSpeed = updated.speed;
        if (Math.hypot(next.x - this.position.x, next.z - this.position.z) < 0.025) this.path.shift();
        remaining -= h;
      }
      this.petAnchor.rotation.y = this.facing;
      this.petAnchor.position.set(this.position.x, 0, this.position.z);
      if (!this.path.length) { this.targetRing.visible = false; this.destination = null; this.walkSpeed = 0; this.selectClip(`idle_${this.profile}`); }
    } else if (!this.reducedMotion && !this.sleeping && !this.touchHolding && !this.postTouchRemaining && !this.cueRemaining) {
      this.idleTime += dt;
      if (this.idleTime >= (this.profile === 'expressive' ? MOTION.idleExpressive : MOTION.idleReserved)) {
        this.idleTime = 0;
        const wander = [{ x: -0.45, z: -1.9 }, { x: 1.1, z: 2.35 }, { x: 0.2, z: 1.95 }];
        this.moveTo(wander[Math.floor(Math.random() * wander.length)]);
      }
    }
    if (this.touchHolding) this.touchTime += dt;
    let springRemaining = dt;
    while (springRemaining > 1e-9) {
      const h = Math.min(MOTION.simulationStep, springRemaining);
      const next = springStep(this.press, this.pressVelocity, this.touchHolding && !this.reducedMotion, h);
      this.press = next.press; this.pressVelocity = next.velocity;
      springRemaining -= h;
    }
    if (this.reducedMotion) { this.press = 0; this.pressVelocity = 0; }
    const squeeze = Math.max(0, Math.min(1.3, this.press));
    this.petAnchor.scale.set(1 + squeeze * 0.04, 1 - squeeze * 0.08, 1 + squeeze * 0.04);
    if (this.postTouchRemaining > 0) {
      this.postTouchRemaining = Math.max(0, this.postTouchRemaining - dt);
      if (this.postTouchRemaining === 0) this.selectClip(`idle_${this.profile}`);
    }
    if (this.activeAction) this.activeAction.paused = shouldPauseDecorativeMotion(this.reducedMotion, !!this.path.length, this.touchHolding || this.postTouchRemaining > 0, this.cueRemaining > 0);
    this.mixer?.update(dt);
    const frameSubmitted = this.submissions.shouldSubmit(
      timestamp,
      this.modelReady || this.submissionIntervalMs === 0,
    );
    if (frameSubmitted) {
      this.renderer.render(this.scene, this.camera);
      this.gl.endFrameEXP();
    }
    const now = Date.now();
    if (shouldPublishProjection(
      this.submissionIntervalMs > 0,
      frameSubmitted,
      now - this.lastProjection,
    )) {
      this.lastProjection = now;
      this.publishProjection();
    }
    this.frames.schedule(this.tick);
  };

  resume() {
    if (this.disposed || this.frames.running) return;
    this.submissions.markDirty();
    this.clock.start(); this.frames.resume(this.tick);
  }

  pause() {
    this.frames.stop(); this.clock.stop();
  }

  dispose() {
    this.pause(); this.disposed = true;
    this.mixer?.stopAllAction();
    disposeSceneObject(this.scene);
    this.renderer.dispose();
  }
}
