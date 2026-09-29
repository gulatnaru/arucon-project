import { Asset } from 'expo-asset';
import { LivingPet, type LifeCommand, type LifeEvent, type LifeWorld } from '../living/life';
import { growthExpression } from '../living/growthExpression';
import { prepareCpuMorphs } from './cpuMorph';
import { File, Paths } from 'expo-file-system';
import type { ExpoWebGLRenderingContext } from 'expo-gl';
import { Platform } from 'react-native';
import * as THREE from 'three';
import { FLOOR, MEAL_BOWL, nearestFree, route, type NavigationOptions } from './navigation';
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
import { isAppleSoftwareRenderer, resolveRoomRendererProfile, type ResolvedRoomRendererProfile, type RoomRendererProfileId } from './rendererConfig';
import { projectedHitsEqual, type HitName, type ProjectedHits } from './projectedHits';
import type { FloorPoint, RoomProps } from './types';
import { RoomPerformanceProbe, type RoomPerformanceSummary } from './performanceProbe';
import { canStartRoomInteraction, resolveRoomInteraction } from './interactionLifecycle';
import { applyPetMaterialProfile } from './rendererMaterials';
import { vertexLitMaterial } from './vertexLitMaterial';
import { batchStaticRoom } from './staticRoomBatch';
import {
  DEFAULT_CHARACTER_CANDIDATE_ID,
  getCharacterCandidate,
  type CharacterCandidateId,
} from './characterCandidates';
import {
  comparisonCameraYaw,
  EMPTY_ROOM_PRESENTATION,
  presentationMorphWeights,
  reduceRoomPresentation,
  RoomPresentationBatchGate,
  type ComparisonCameraAngle,
  type RoomPresentationState,
} from './presentationBridge';

// The source artifact is copied byte-for-byte from references/floor-navigation-03.
// It has embedded binary geometry, 15 animation clips, and no external images.
// Metro requires a static require for non-code assets.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PET_ASSET = require('../../assets/arucon_tsundere_motion.glb') as number;
const FORM_ASSETS: Record<FormPresentation['assetKey'], number> = {
  [COMMON_PREVIEW_ASSET_KEY]: PET_ASSET,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  mallu: require('../../assets/living-characters/mallu.glb') as number,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  mono: require('../../assets/living-characters/mono.glb') as number,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  piko: require('../../assets/living-characters/piko.glb') as number,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  mongle: require('../../assets/living-characters/mongle.glb') as number,
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
  /** Comparison yaw lives outside the animated GLB root rotation tracks. */
  private readonly petOrientation = new THREE.Group();
  private readonly targetRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.018, 6, 32),
    new THREE.MeshBasicMaterial({ color: 0x9eaa92 }),
  );
  private readonly furniture: Partial<Record<HitName, THREE.Object3D>> = {};
  private readonly rendererConfig: ResolvedRoomRendererProfile;
  private readonly softwareRenderer: boolean;
  private readonly submissionIntervalMs: number;
  private readonly submissions: FrameSubmissionGate;
  private readonly performanceProbe: RoomPerformanceProbe;
  private onPerformanceSummary?: (summary: RoomPerformanceSummary) => void;
  private lastPerformancePublishMs = 0;
  private mixer?: THREE.AnimationMixer;
  private loadedPet?: THREE.Object3D;
  private modelReady = false;
  private petLoadGeneration = 0;
  private loadingPetKey?: string;
  private loadedPetKey?: string;
  private clips = new Map<string, THREE.AnimationClip>();
  private activeAction?: THREE.AnimationAction;
  private lastMealToken?: string;
  private pendingMealToken?: string;
  private cueRemaining = 0;
  private cueCommitted = false;
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
  private characterCandidateId: CharacterCandidateId = DEFAULT_CHARACTER_CANDIDATE_ID;
  private comparisonMode = false;
  private comparisonCameraAngle: ComparisonCameraAngle = 'front';
  private readonly presentationBatches = new RoomPresentationBatchGate();
  private presentationState: RoomPresentationState = EMPTY_ROOM_PRESENTATION;
  private presentationHoldRemaining = 0;
  private morphOverlay: readonly Readonly<{ influences: number[]; weights: readonly (readonly [number, number])[] }>[] = [];
  private sleeping = false;
  private interactionEnabled = true;
  private reducedMotion = false;
  private touchHolding = false;
  private touchTime = 0;
  private postTouchRemaining = 0;
  private petPulseRemaining = 0;
  private updateCpuMorphs: (() => void) | null = null;
  private press = 0;
  private pressVelocity = 0;
  private walkSpeed = 0;
  private facing = -0.06;
  private position: FloorPoint = { x: 0, z: 1.8 };
  private navigationOptions: NavigationOptions = { tableInstalled: true, toiletInstalled: false };
  private onProjection: (hits: ProjectedHits) => void;
  private onError: (error: string) => void;
  private livingEnabled = false;
  private pendingLifeCommand?: LifeCommand;
  private lastPropLifeToken?: string;
  private frontPaw?: THREE.Object3D;
  private leftPaw?: THREE.Object3D;
  private growthStage = 1;
  private growthStyle = growthExpression(1);
  private hungry = false;
  private mealAvailability: RoomProps['mealAvailability'] = 'ready';
  private cleanupProp?: THREE.Object3D;
  private readonly feedingDish = new THREE.Group();
  private foodBite?: THREE.Object3D;
  private toiletCurtain?: THREE.Object3D;
  private lifePreference?: RoomProps['lifePreference'];
  private onLifeEvent?: (event: LifeEvent) => void;
  private readonly life = new LivingPet({
    navigate: point => !!this.navigateTo(point),
    stop: () => { this.path = []; this.destination = null; this.targetRing.visible = false; this.restoreBaseClip(); },
    event: event => {
      if (event.phase === 'perform') {
        this.presentationState = { ...EMPTY_ROOM_PRESENTATION, gaze: event.scene === 'look' || this.profile === 'reserved' && ['touch', 'company', 'ball'].includes(event.scene) ? 'aside' : 'user',
          emotion: event.scene === 'rest' || event.scene === 'drowsy' ? 'sleepy' : event.scene === 'mishap' ? 'shy' : 'interested' };
        this.refreshMorphOverlay();
        if (event.scene === 'meal') this.selectClip('eat', true, 1.2, true);
      } else if (event.phase === 'cancel' || event.phase === 'complete') this.interruptFreePresentation();
      this.onLifeEvent?.(event);
    },
  });

  private lifeWorld(): LifeWorld {
    return { awake: !this.sleeping, enabled: this.interactionEnabled && this.modelReady && !this.comparisonMode,
      touching: this.touchHolding, moving: this.path.length > 0, committed: this.cueCommitted && this.cueRemaining > 0,
      ball: !!this.furniture.ball?.visible, cushion: !!this.furniture.cushion?.visible, toilet: !!this.furniture.toilet?.visible, table: !!this.furniture.table?.visible,
      position: this.position, preference: this.lifePreference, personality: this.profile, hungry: this.hungry,
      mealAvailability: this.mealAvailability, growthStage: this.growthStage };
  }

  runLife(command: LifeCommand) {
    const accepted = this.livingEnabled && this.life.command(command, this.lifeWorld());
    if (accepted && this.pendingLifeCommand?.token === command.token) this.pendingLifeCommand = undefined;
    return accepted;
  }

  constructor(
    private readonly gl: ExpoWebGLRenderingContext,
    width: number,
    height: number,
    onProjection: (hits: ProjectedHits) => void,
    onError: (error: string) => void,
    rendererProfileId: RoomRendererProfileId = 'automatic',
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
    const rendererIdentity = Platform.OS === 'ios' ? {
      renderer: String(gl.getParameter(gl.RENDERER)),
      vendor: String(gl.getParameter(gl.VENDOR)),
      version: String(gl.getParameter(gl.VERSION)),
    } : undefined;
    this.rendererConfig = resolveRoomRendererProfile(rendererProfileId, __DEV__, Platform.OS, rendererIdentity);
    this.softwareRenderer = isAppleSoftwareRenderer(Platform.OS, rendererIdentity);
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      context: gl as unknown as WebGLRenderingContext,
      antialias: this.rendererConfig.contextAntialias,
    });
    this.submissionIntervalMs = this.rendererConfig.submissionIntervalMs;
    this.submissions = new FrameSubmissionGate(this.submissionIntervalMs);
    this.performanceProbe = new RoomPerformanceProbe(this.rendererConfig.id);
    this.performanceProbe.setSurfaceSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    if (__DEV__ && rendererIdentity) {
      console.info('[AruconRoom] GL submission profile', {
        ...rendererIdentity,
        profileId: this.rendererConfig.id,
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
    this.petAnchor.add(this.petOrientation);
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

  resolvedRendererProfile() { return this.rendererConfig; }

  setPresentation(props: RoomProps) {
    this.livingEnabled = !!props.livingEnabled;
    this.lifePreference = props.lifePreference;
    this.growthStage = props.growthStage === 'final' ? 4 : props.growthStage ?? 1;
    this.growthStyle = growthExpression(this.growthStage);
    this.loadedPet?.scale.setScalar(.62 * this.growthStyle.scale);
    this.hungry = !!props.hungry;
    this.mealAvailability = props.mealAvailability ?? 'ready';
    if (props.poopCount && !this.cleanupProp) this.cleanupProp = this.addSphere(this.scene, 0xaa876b, [.22, .16, .22], [-.5, .12, 3.1]);
    if (this.cleanupProp) this.cleanupProp.visible = (props.poopCount ?? 0) > 0;
    if (props.lifeCommand?.token !== this.lastPropLifeToken) {
      this.lastPropLifeToken = props.lifeCommand?.token;
      this.pendingLifeCommand = props.lifeCommand;
    }
    this.onLifeEvent = props.onLifeEvent;
    const nextFormPresentation = selectFormPresentation(props.formId ?? 'arucon');
    const nextCandidateId = props.characterCandidateId ?? DEFAULT_CHARACTER_CANDIDATE_ID;
    const petAssetChanged = nextFormPresentation.assetKey !== this.formPresentation.assetKey ||
      nextCandidateId !== this.characterCandidateId;
    this.formPresentation = nextFormPresentation;
    this.characterCandidateId = nextCandidateId;
    this.setComparisonView(props.comparisonCameraAngle);
    const nextProfile = props.personality ?? 'reserved';
    const nextSleeping = !!props.sleeping;
    this.onPerformanceSummary = props.onPerformanceSummary;
    const nextInteractionEnabled = props.interactionEnabled ?? true;
    const wasReduced = this.reducedMotion;
    this.reducedMotion = !!props.reducedMotion;
    if ((!nextInteractionEnabled || nextSleeping) && this.touchHolding) this.cancelPet();
    this.interactionEnabled = nextInteractionEnabled;
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
    this.feedingDish.visible = props.tableInstalled ?? true;
    this.furniture.toilet!.visible = props.toiletInstalled ?? false;
    this.furniture.ball!.visible = props.ballVisible ?? false;
    this.furniture.cushion!.visible = props.cushionVisible ?? false;
    this.navigationOptions = { tableInstalled: props.tableInstalled ?? true, toiletInstalled: !!props.toiletInstalled };
    if (props.mealCue && props.mealCue.token !== this.lastMealToken) {
      if (!this.mixer) this.pendingMealToken = props.mealCue.token;
      else {
        this.lastMealToken = props.mealCue.token;
        if (this.livingEnabled) this.runLife({ token: `meal:${props.mealCue.token}`, kind: 'meal' });
        else this.playCue('eat', 1.2, true);
      }
    }
    const presentationCommands = this.presentationBatches.take(props.reactionPresentation);
    if (presentationCommands) this.applyPresentationCommands(presentationCommands);
    if (petAssetChanged || !this.modelReady) void this.loadPet();
    if (this.pendingLifeCommand && this.modelReady) {
      const command = this.pendingLifeCommand; this.pendingLifeCommand = undefined;
      this.runLife(command);
    }
    this.submissions.markDirty();
    if (this.submissionIntervalMs === 0) this.publishProjection();
  }

  private material(color: number, roughness = 0.95) {
    if (this.rendererConfig.roomMaterial === 'vertex_lit') return vertexLitMaterial(color);
    if (this.rendererConfig.roomMaterial === 'basic') return new THREE.MeshBasicMaterial({ color });
    if (this.rendererConfig.roomMaterial === 'lambert') return new THREE.MeshLambertMaterial({ color });
    return new THREE.MeshStandardMaterial({ color, roughness });
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
    const balancedLight = this.rendererConfig.id === 'software_balanced';
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xc9b49a, balancedLight ? 1.35 : 2.4));
    const sun = new THREE.DirectionalLight(0xfff3d9, balancedLight ? 1.05 : 2.0);
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
    this.feedingDish.position.set(MEAL_BOWL.x, .04, MEAL_BOWL.z);
    this.addSphere(this.feedingDish, 0xf8eedb, [.24, .04, .21], [0, 0, 0]);
    this.scene.add(this.feedingDish);
    this.foodBite = this.addSphere(new THREE.Group(), 0xa87748, [.065, .05, .065], [0, 0, 0]);
    this.foodBite.visible = false; this.scene.add(this.foodBite);
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
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(.219, .012, 4, 20), this.material(0xf7dfb9));
    ball.add(stripe);
    this.scene.add(ball); this.furniture.ball = ball;
    const staticObjects = [...this.scene.children.filter(node => node instanceof THREE.Mesh && node !== this.foodBite), plant];
    const batch = batchStaticRoom(staticObjects, this.rendererConfig.roomMaterial);
    for (const object of staticObjects) { this.scene.remove(object); disposeSceneObject(object); }
    this.scene.add(batch);
  }

  private petAsset() {
    return this.formPresentation.formId !== 'arucon' || this.characterCandidateId === DEFAULT_CHARACTER_CANDIDATE_ID
      ? FORM_ASSETS[this.formPresentation.assetKey]
      : getCharacterCandidate(this.characterCandidateId).asset;
  }

  async loadPet() {
    const assetKey = `${this.formPresentation.assetKey}:${this.characterCandidateId}`;
    if (assetKey === this.loadingPetKey || assetKey === this.loadedPetKey) return;
    const generation = ++this.petLoadGeneration;
    this.loadingPetKey = assetKey;
    try {
      const asset = Asset.fromModule(this.petAsset());
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
      if (this.disposed || generation !== this.petLoadGeneration) return;
      const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const gltf = await parseGlb(data);
      const loaded = retainLoadedModel(gltf.scene, this.disposed || generation !== this.petLoadGeneration);
      if (!loaded) return;
      applyPetMaterialProfile(loaded, this.rendererConfig.petMaterial);
      this.updateCpuMorphs = this.softwareRenderer && ['software_low_resolution', 'software_balanced'].includes(this.rendererConfig.id)
        ? prepareCpuMorphs(loaded) : null;
      loaded.scale.setScalar(0.62 * growthExpression(this.growthStage).scale);
      const firstModel = !this.loadedPet;
      this.petOrientation.rotation.y = this.comparisonMode ? comparisonCameraYaw(this.comparisonCameraAngle) : 0;
      this.mixer?.stopAllAction();
      if (this.loadedPet) {
        this.petOrientation.remove(this.loadedPet);
        disposeSceneObject(this.loadedPet);
      }
      this.loadedPet = loaded;
      this.petOrientation.add(loaded);
      this.modelReady = true;
      this.frontPaw = this.loadedPet?.getObjectByName('Foot_R_Front');
      this.leftPaw = this.loadedPet?.getObjectByName('Foot_L_Front');
      if (this.livingEnabled && firstModel) {
        const command = this.pendingLifeCommand ?? { token: 'arrival', kind: 'greeting' } as const;
        this.pendingLifeCommand = undefined; this.runLife(command);
      }
      this.loadedPetKey = assetKey;
      this.submissions.markDirty();
      this.mixer = new THREE.AnimationMixer(loaded);
      this.activeAction = undefined;
      this.clips.clear();
      for (const clip of gltf.animations) this.clips.set(clip.name, clip);
      if (this.presentationState.clip || this.presentationState.holdPose) this.applyPresentationState(true);
      else this.selectClip(this.sleeping ? 'sleep' : this.life.pose?.scene === 'meal' ? 'eat' : `idle_${this.profile}`);
      if (this.pendingMealToken) {
        this.lastMealToken = this.pendingMealToken;
        this.pendingMealToken = undefined;
        if (this.livingEnabled) this.runLife({ token: `meal:${this.lastMealToken}`, kind: 'meal' });
        else this.playCue('eat', 1.2, true);
      }
      if (this.submissionIntervalMs === 0) this.publishProjection();
    } catch (error) {
      if (!this.disposed) this.onError(`아루콘 모델을 열지 못했어요: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      if (generation === this.petLoadGeneration) this.loadingPetKey = undefined;
    }
  }

  private selectClip(name: string, once = false, rate = 1, force = false) {
    if (!this.mixer) return;
    const clip = this.clips.get(name);
    if (!clip || (!force && !once && this.activeAction?.getClip() === clip)) return;
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

  private setComparisonView(angle: ComparisonCameraAngle | undefined) {
    const enabled = angle !== undefined;
    const nextAngle = angle ?? 'front';
    const changed = enabled !== this.comparisonMode || nextAngle !== this.comparisonCameraAngle;
    if (!changed) return;
    this.comparisonMode = enabled;
    this.comparisonCameraAngle = nextAngle;
    this.petOrientation.rotation.y = enabled ? comparisonCameraYaw(nextAngle) : 0;
    if (enabled) this.pinComparisonView();
    this.submissions.markDirty();
  }

  private pinComparisonView() {
    this.path = [];
    this.destination = null;
    this.targetRing.visible = false;
    this.position = { x: 0, z: 1.8 };
    this.facing = 0;
    this.walkSpeed = 0;
    this.idleTime = 0;
    this.petAnchor.position.set(this.position.x, 0, this.position.z);
    this.petAnchor.rotation.y = 0;
  }

  private applyPresentationCommands(commands: NonNullable<RoomProps['reactionPresentation']>['commands']) {
    const previous = this.presentationState;
    this.presentationState = reduceRoomPresentation(previous, commands);
    if (this.presentationState === EMPTY_ROOM_PRESENTATION) {
      this.presentationHoldRemaining = 0;
      this.refreshMorphOverlay();
      if (previous !== EMPTY_ROOM_PRESENTATION) this.restoreBaseClip();
    } else {
      if (commands.some(command => command.type === 'play_clip' || command.type === 'hold_pose')) {
        if (this.touchHolding) this.cancelPet();
        this.path = []; this.destination = null; this.targetRing.visible = false;
      }
      this.applyPresentationState(commands.some(command => command.type === 'play_clip'));
    }
    this.submissions.markDirty();
  }

  private applyPresentationState(restartClip: boolean) {
    const selected = this.presentationState.clip;
    if (selected && restartClip) {
      this.selectClip(selected.name, false, selected.rate, true);
      if (/^(pet_|tsundere_touch|honest_touch)/u.test(selected.name)) this.petPulseRemaining = 0.4;
    }
    const hold = this.presentationState.holdPose;
    if (hold && this.mixer) {
      const clip = this.clips.get(hold.clip);
      if (clip) {
        this.selectClip(hold.clip, false, 1, true);
        if (this.activeAction) {
          this.activeAction.time = clip.duration * Math.max(0, Math.min(1, hold.normalizedTime));
          this.activeAction.paused = true;
          this.presentationHoldRemaining = Math.max(0, hold.durationMs / 1_000);
          this.mixer.update(0);
        }
      }
    }
    this.refreshMorphOverlay();
  }

  private refreshMorphOverlay() {
    for (const binding of this.morphOverlay) {
      for (const [index] of binding.weights) binding.influences[index] = 0;
    }
    this.mixer?.update(0);
    const weights = presentationMorphWeights(this.presentationState.gaze, this.presentationState.emotion);
    const bindings: { influences: number[]; weights: [number, number][] }[] = [];
    this.loadedPet?.traverse(node => {
      if (!(node instanceof THREE.Mesh) || !node.morphTargetInfluences || !node.morphTargetDictionary) return;
      const mapped = Object.entries(weights).flatMap(([name, weight]) => {
        const index = node.morphTargetDictionary?.[name];
        return index === undefined ? [] : [[index, weight] as [number, number]];
      });
      if (mapped.length) bindings.push({ influences: node.morphTargetInfluences, weights: mapped });
    });
    this.morphOverlay = bindings;
    this.applyMorphOverlay();
  }

  private applyMorphOverlay() {
    for (const binding of this.morphOverlay) {
      for (const [index, weight] of binding.weights) {
        binding.influences[index] = Math.max(binding.influences[index] ?? 0, weight);
      }
    }
  }

  private restoreBaseClip() {
    if (this.cueRemaining > 0) return;
    if (this.presentationState !== EMPTY_ROOM_PRESENTATION) return;
    if (this.touchHolding || this.postTouchRemaining > 0) {
      this.selectClip(this.profile === 'reserved' ? 'pet_reserved' : 'pet_expressive', false, 1, true);
    } else if (this.path.length) {
      this.selectClip('walk', false, 1, true);
    } else {
      this.selectClip(this.sleeping ? 'sleep' : `idle_${this.profile}`, false, 1, true);
    }
  }

  private interruptFreePresentation() {
    if (this.cueRemaining > 0 && !this.cueCommitted) {
      this.cueRemaining = 0;
      this.cueCommitted = false;
    }
    if (this.presentationState === EMPTY_ROOM_PRESENTATION) return;
    this.presentationState = EMPTY_ROOM_PRESENTATION;
    this.presentationHoldRemaining = 0;
    this.refreshMorphOverlay();
  }

  private playCue(name: string, rate: number, committed = false) {
    const clip = this.clips.get(name);
    if (!clip || this.sleeping) return;
    if (this.touchHolding) this.cancelPet();
    this.path = []; this.destination = null; this.targetRing.visible = false;
    this.idleTime = 0;
    this.cueRemaining = cueDuration(clip.duration, rate, this.reducedMotion);
    this.cueCommitted = committed;
    this.selectClip(name, true, rate);
    this.submissions.markDirty();
  }

  playBall() {
    if (this.livingEnabled) return this.runLife({ token: `ball:${performance.now()}`, kind: 'ball' });
    if (!this.interactionEnabled || !canStartRoomInteraction(this.currentInteraction(), 'committed_cue')) return false;
    this.interruptFreePresentation();
    this.playCue(this.profile === 'reserved' ? 'tsundere_ball' : 'honest_ball', 1.6, false);
    return true;
  }

  canStartReactionCue() {
    if (!this.interactionEnabled || !canStartRoomInteraction(this.currentInteraction(), 'committed_cue')) return false;
    this.interruptFreePresentation();
    return true;
  }

  private currentInteraction() {
    return resolveRoomInteraction({
      interactionEnabled: this.interactionEnabled,
      sleeping: this.sleeping,
      committedCueActive: this.cueRemaining > 0 && this.cueCommitted,
      touching: this.touchHolding,
      moving: this.path.length > 0,
      freePresentationActive: this.cueRemaining > 0 || this.presentationState !== EMPTY_ROOM_PRESENTATION,
    });
  }

  private project(object: THREE.Object3D, elevation = 0) {
    object.getWorldPosition(this.projected);
    this.projected.y += elevation;
    this.projected.project(this.camera);
    return { x: (this.projected.x + 1) * this.width / 2, y: (1 - this.projected.y) * this.height / 2, visible: this.projected.z >= -1 && this.projected.z <= 1 && this.projected.x >= -1 && this.projected.x <= 1 && this.projected.y >= -1 && this.projected.y <= 1 };
  }

  private publishProjection() {
    if (this.disposed || this.width <= 0 || this.height <= 0) return;
    this.scene.updateMatrixWorld(true);
    const pet = this.project(this.loadedPet?.getObjectByName('AruconRoot') ?? this.petAnchor, 0.75);
    const hits: ProjectedHits = {
      pet: { ...pet, visible: this.modelReady && pet.visible },
      table: this.project(this.furniture.table ?? this.scene, 0.45),
      cushion: this.project(this.furniture.cushion ?? this.scene, 0.28),
      toilet: this.project(this.furniture.toilet ?? this.scene, 0.4),
      ball: this.project(this.furniture.ball ?? this.scene, 0.2),
      ...(this.cleanupProp ? { cleanup: { ...this.project(this.cleanupProp, .1), visible: this.cleanupProp.visible } } : {}),
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
    if (!this.interactionEnabled || !canStartRoomInteraction(this.currentInteraction(), 'move')) return null;
    if (this.livingEnabled) this.life.cancel();
    return this.navigateTo(raw);
  }

  private navigateTo(raw: FloorPoint): FloorPoint | null {
    if (!this.interactionEnabled || !canStartRoomInteraction(this.currentInteraction(), 'move')) return null;
    const target = nearestFree(raw, this.navigationOptions);
    if (!target) return null;
    const path = route(this.position, target, this.navigationOptions);
    if (!path.length) return null;
    this.interruptFreePresentation();
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

  beginPet(inputStartedAtMs = performance.now()) {
    if (!this.canStartPet()) return false;
    if (this.livingEnabled) this.life.cancel();
    this.interruptFreePresentation();
    this.path = []; this.destination = null; this.targetRing.visible = false;
    this.touchHolding = true; this.touchTime = 0;
    this.postTouchRemaining = 0;
    this.idleTime = 0;
    this.selectClip(this.profile === 'reserved' ? 'pet_reserved' : 'pet_expressive');
    this.submissions.markDirty();
    this.performanceProbe.recordInputHandled(inputStartedAtMs);
    return true;
  }

  canStartPet() {
    return this.interactionEnabled && canStartRoomInteraction(this.currentInteraction(), 'pet');
  }

  beginAccessiblePet(inputStartedAtMs: number) {
    if (!this.canStartPet()) return false;
    if (this.livingEnabled) this.life.cancel();
    this.interruptFreePresentation();
    this.petPulseRemaining = 0.4;
    this.performanceProbe.recordInputHandled(inputStartedAtMs, 'accessibility');
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

  cancelPet() {
    if (!this.touchHolding) return false;
    this.touchHolding = false; this.touchTime = 0; this.postTouchRemaining = 0;
    this.selectClip(this.sleeping ? 'sleep' : `idle_${this.profile}`);
    this.submissions.markDirty();
    return true;
  }

  performanceSummary() { return this.performanceProbe.snapshot(); }

  private tick = (timestamp: number) => {
    if (this.disposed) return;
    this.performanceProbe.recordRaf(timestamp);
    const dt = Math.min(MOTION.maxCatchupSeconds, this.clock.getDelta());
    if (this.livingEnabled) this.life.update(dt, this.lifeWorld());
    if (this.cueRemaining > 0) {
      this.cueRemaining = Math.max(0, this.cueRemaining - dt);
      if (this.cueRemaining === 0) {
        this.cueCommitted = false;
        this.restoreBaseClip();
      }
    }
    if (this.presentationHoldRemaining > 0) {
      this.presentationHoldRemaining = Math.max(0, this.presentationHoldRemaining - dt);
      if (this.presentationHoldRemaining === 0 && this.activeAction) {
        this.activeAction.paused = false;
        this.activeAction.setEffectiveTimeScale(this.presentationState.clip?.rate ?? 1);
      }
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
      if (!this.path.length) {
        this.targetRing.visible = false; this.destination = null; this.walkSpeed = 0;
        if (this.comparisonMode) { this.facing = 0; this.petAnchor.rotation.y = 0; }
        this.selectClip(`idle_${this.profile}`);
      }
    } else if (!this.livingEnabled && !this.comparisonMode && !this.reducedMotion && !this.sleeping && !this.touchHolding && !this.postTouchRemaining && !this.cueRemaining && !this.presentationState.clip && !this.presentationState.holdPose) {
      this.idleTime += dt;
      if (this.idleTime >= (this.profile === 'expressive' ? MOTION.idleExpressive : MOTION.idleReserved)) {
        this.idleTime = 0;
        const wander = [{ x: -0.45, z: -1.9 }, { x: 1.1, z: 2.35 }, { x: 0.2, z: 1.95 }];
        this.moveTo(wander[Math.floor(Math.random() * wander.length)]);
      }
    }
    if (this.touchHolding) this.touchTime += dt;
    this.petPulseRemaining = Math.max(0, this.petPulseRemaining - dt);
    if (!this.comparisonMode && !this.path.length && !(this.livingEnabled && this.life.pose) &&
        (this.touchHolding || this.petPulseRemaining > 0 || this.presentationState !== EMPTY_ROOM_PRESENTATION)) {
      const targetFacing = this.presentationState.gaze === 'aside' ? -0.22 : 0;
      this.facing += Math.atan2(Math.sin(targetFacing - this.facing), Math.cos(targetFacing - this.facing)) * (1 - Math.exp(-10 * dt));
      this.petAnchor.rotation.y = this.facing;
    }
    let springRemaining = dt;
    while (springRemaining > 1e-9) {
      const h = Math.min(MOTION.simulationStep, springRemaining);
      const next = springStep(this.press, this.pressVelocity, (this.touchHolding || this.petPulseRemaining > 0) && !this.reducedMotion, h);
      this.press = next.press; this.pressVelocity = next.velocity;
      springRemaining -= h;
    }
    if (this.reducedMotion) { this.press = 0; this.pressVelocity = 0; }
    const squeeze = Math.max(0, Math.min(1.3, this.press));
    this.petAnchor.scale.set(1 + squeeze * 0.04, 1 - squeeze * 0.08, 1 + squeeze * 0.04);
    if (this.postTouchRemaining > 0) {
      this.postTouchRemaining = Math.max(0, this.postTouchRemaining - dt);
      if (this.postTouchRemaining === 0) this.restoreBaseClip();
    }
    if (this.activeAction) {
      this.activeAction.paused = this.presentationHoldRemaining > 0 ||
        shouldPauseDecorativeMotion(this.reducedMotion, !!this.path.length, this.touchHolding || this.postTouchRemaining > 0, this.cueRemaining > 0);
    }
    this.mixer?.update(dt);
    this.applyMorphOverlay();
    if (this.livingEnabled) this.applyLifePose();
    const frameSubmitted = this.submissions.shouldSubmit(
      timestamp,
      this.modelReady || this.submissionIntervalMs === 0,
    );
    if (frameSubmitted) {
      const morphStart = performance.now();
      this.updateCpuMorphs?.();
      const drawStart = performance.now();
      this.performanceProbe.recordPhase('morph', drawStart - morphStart);
      this.renderer.render(this.scene, this.camera);
      this.performanceProbe.recordPhase('draw', performance.now() - drawStart);
      this.performanceProbe.recordRenderWorkload(this.renderer.info.render);
      this.gl.endFrameEXP();
      // Expo's public queue barrier prevents software GL from accumulating old
      // poses behind current UI input. Never patch the SDK or use this on hardware.
      const drainStart = performance.now();
      if (this.updateCpuMorphs) this.gl.flushEXP();
      this.performanceProbe.recordPhase('queueDrain', performance.now() - drainStart);
      this.performanceProbe.recordSubmission(performance.now());
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
    if (this.onPerformanceSummary && timestamp - this.lastPerformancePublishMs >= 1_000) {
      this.lastPerformancePublishMs = timestamp;
      this.onPerformanceSummary(this.performanceProbe.snapshot());
    }
    this.frames.schedule(this.tick);
  };

  resume() {
    if (this.disposed || this.frames.running) return;
    this.submissions.markDirty();
    this.clock.start(); this.frames.resume(this.tick);
  }

  pause() {
    if (this.livingEnabled) this.life.cancel();
    this.cancelPet();
    if (this.presentationState !== EMPTY_ROOM_PRESENTATION) {
      this.presentationState = EMPTY_ROOM_PRESENTATION;
      this.presentationHoldRemaining = 0;
      this.refreshMorphOverlay();
      this.selectClip(this.sleeping ? 'sleep' : `idle_${this.profile}`, false, 1, true);
    }
    this.frames.stop(); this.clock.stop();
    this.performanceProbe.resetRafClock();
  }

  dispose() {
    this.pause(); this.disposed = true;
    this.petLoadGeneration++;
    this.onPerformanceSummary?.(this.performanceProbe.snapshot());
    this.mixer?.stopAllAction();
    disposeSceneObject(this.scene);
    this.renderer.dispose();
  }

  private applyLifePose() {
    const ball = this.furniture.ball;
    if (ball) { ball.position.set(this.life.ball.x, .22, this.life.ball.z); ball.rotation.x = this.life.ball.spin; }
    this.petOrientation.position.set(0, 0, 0);
    this.petOrientation.rotation.x = this.petOrientation.rotation.z = 0;
    if (!this.comparisonMode) this.petOrientation.rotation.y = 0;
    this.petOrientation.scale.set(1, 1, 1);
    this.frontPaw?.position.set(0, 0, 0);
    this.leftPaw?.position.set(0, 0, 0);
    if (this.toiletCurtain) this.toiletCurtain.visible = false;
    if (this.foodBite) this.foodBite.visible = false;
    const pose = this.life.pose;
    if (!pose) return;
    const p = pose.progress, wave = Math.sin(Math.PI * p), soft = this.reducedMotion ? .28 : 1;
    const grown = this.growthStyle;
    const scale = this.profile === 'reserved' ? .75 : 1;
    if (!this.path.length) {
      const atBowl = (pose.scene === 'meal' || pose.scene === 'hungry') && this.furniture.table?.visible;
      const lookX = pose.side < 0 ? -2.8 : -.45;
      const lookZ = pose.side < 0 ? -3.65 : -4.85;
      const facing = atBowl ? Math.atan2(MEAL_BOWL.x - this.position.x, MEAL_BOWL.z - this.position.z)
        : pose.scene === 'look' && p < .68 ? Math.atan2(lookX - this.position.x, lookZ - this.position.z)
          : pose.scene === 'peek' ? pose.side * .65 : 0;
      const turn = Math.atan2(Math.sin(facing - this.facing), Math.cos(facing - this.facing));
      this.facing += turn * .08; this.petAnchor.rotation.y = this.facing;
    }
    switch (pose.scene) {
      case 'stretch':
        this.petOrientation.scale.set(1 - .06 * wave * soft, 1 + grown.stretchLift * Math.sin(p * Math.PI * 2) * soft, 1 + .12 * wave * soft);
        if (grown.maturity >= 2) {
          this.frontPaw?.position.set(0, .1 * Math.max(0, Math.sin(p * Math.PI * 2)) * soft, .09 * wave * soft);
          this.leftPaw?.position.set(0, .1 * Math.max(0, Math.sin((p - .4) * Math.PI * 2)) * soft, .09 * wave * soft);
        }
        break;
      case 'rest':
        this.petOrientation.scale.set(1 + .08 * wave * soft, 1 - .18 * wave * soft, 1 + .08 * wave * soft);
        this.petOrientation.rotation.z = -.10 * wave * soft;
        { const settle = Math.min(1, p / .22, (1 - p) / .18);
          this.petOrientation.position.set((-2.05 - this.position.x) * settle, .24 * settle, (.2 - this.position.z) * settle); }
        break;
      case 'ball': case 'offer': case 'inspect': case 'solo':
        this.petOrientation.rotation.x = .15 * Math.sin(Math.PI * Math.min(1, p / .6)) * soft;
        this.petOrientation.position.z = .18 * wave * soft;
        this.frontPaw?.position.set(0, .10 * wave * soft, .22 * Math.sin(Math.PI * Math.min(1, p / .76)) * soft); break;
      case 'peek':
        this.petOrientation.position.x = pose.side * .19 * wave * soft;
        this.petOrientation.rotation.z = -pose.side * .12 * wave * soft;
        this.petOrientation.scale.y = 1 - .1 * Math.sin(p * Math.PI * 2) * soft; break;
      case 'gesture':
        this.petOrientation.rotation.z = pose.side * .17 * wave * soft;
        this.petOrientation.position.y = .06 * wave * soft;
        if (pose.side > 0) {
          this.frontPaw?.position.set(0, .30 * wave * soft, .08 * wave * soft);
          if (this.growthStage >= 2) this.leftPaw?.position.set(0, .20 * Math.max(0, Math.sin((p - .35) * Math.PI * 2)) * soft, .05 * wave * soft);
        }
        break;
      case 'mishap':
        this.petOrientation.rotation.z = .16 * Math.sin(p * Math.PI * 4) * wave * soft;
        this.petOrientation.position.x = .12 * wave * soft; break;
      case 'drowsy': this.petOrientation.rotation.x = .14 * wave * soft; break;
      case 'hungry': this.petOrientation.rotation.x = .09 * wave * soft; break;
      case 'seat':
        this.petOrientation.rotation.y = .35 * Math.sin(p * Math.PI * 2) * soft;
        this.petOrientation.scale.set(1 + .03 * wave, 1 - .08 * wave, 1 + .03 * wave); break;
      case 'meal':
        this.petOrientation.rotation.x = (.12 * wave + .025 * Math.sin(p * Math.PI * 10)) * soft;
        if (this.foodBite && p < .8) {
          const bite = Math.max(0, Math.min(1, (p - .2) / .55));
          const source = this.furniture.table?.visible ? MEAL_BOWL : { x: this.position.x, z: this.position.z + .6 };
          const mouthX = this.position.x + Math.sin(this.facing) * .40;
          const mouthZ = this.position.z + Math.cos(this.facing) * .40;
          this.foodBite.visible = true;
          this.foodBite.position.set(source.x + (mouthX - source.x) * bite, .12 + .42 * bite + .10 * Math.sin(bite * Math.PI), source.z + (mouthZ - source.z) * bite);
          const morsel = 1 - bite * .55;
          this.foodBite.scale.set(.065 * morsel, .05 * morsel, .065 * morsel);
          this.frontPaw?.position.set(0, .13 * Math.sin(bite * Math.PI) * soft, .08 * wave * soft);
        }
        break;
      case 'toilet': {
        if (!this.toiletCurtain) {
          this.toiletCurtain = this.addBox(this.scene, 0xc3cbb7, [1.15, .9, .08], [-2.6, .48, -1.15]);
        }
        const enter = Math.min(1, p / .25, (1 - p) / .2);
        this.petOrientation.position.set((-2.6 - this.position.x) * enter, .08 * enter, (-1.62 - this.position.z) * enter);
        this.toiletCurtain.visible = p > .15 && p < .85;
        break;
      }
      case 'greeting': this.petOrientation.position.y = .1 * wave * scale * soft; break;
      case 'growth':
        this.petOrientation.position.y = .1 * wave * soft;
        this.petOrientation.rotation.y = Math.sin(p * Math.PI * 2) * .42 * soft;
        this.frontPaw?.position.set(0, .16 * wave * soft, .1 * wave * soft);
        this.leftPaw?.position.set(0, .12 * wave * soft, .07 * wave * soft); break;
      case 'touch':
        this.petOrientation.scale.set(1 + .055 * wave * soft, 1 - .1 * wave * soft, 1 + .055 * wave * soft);
        this.petOrientation.rotation.z = -.09 * wave * scale * soft; break;
      case 'company': case 'release':
        this.petOrientation.rotation.z = -grown.settleLean * wave * scale * soft;
        if (grown.maturity >= 3) this.petOrientation.scale.y = 1 - .08 * wave * soft;
        break;
    }
  }
}
