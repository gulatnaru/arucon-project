import { Asset } from 'expo-asset';
import { LivingPet, type LifeCommand, type LifeEvent, type LifeWorld } from '../living/life';
import { growthExpression } from '../living/growthExpression';
import { growthGesture, levelExpression } from '../living/levelExpressions';
import { RebootDirector } from '../reboot/director';
import { applyRebootPose, rebootFacing } from '../reboot/pose';
import { applyBabyPose, resetBabyPose } from '../reboot/babyPose';
import { BabyGaitRig } from '../reboot/babyGait';
import { BlenderBabyRig } from '../reboot/blenderRig';
import { sampleArtComparison } from '../reboot/artComparison';
import { REBOOT_HAND, REBOOT_HAND_HEIGHT, REBOOT_SCALE, type RebootView, type RebootEvent, type RebootStage, type RebootIntent, type TouchRegion } from '../reboot/contracts';
import { prepareCpuMorphs } from './cpuMorph';
import { createMorphedAnchor } from './morphedAnchor';
import { File, Paths } from 'expo-file-system';
import type { ExpoWebGLRenderingContext } from 'expo-gl';
import { Platform } from 'react-native';
import * as THREE from 'three';
import { FLOOR, MEAL_BOWL, TOILET_SPOT, isFree, localDockOffset, nearestFree, route, type NavigationOptions } from './navigation';
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
import type { FloorPoint, RoomProps, RoomRuntimeSnapshot } from './types';
import { RoomPerformanceProbe, type RoomPerformanceCapture, type RoomPerformanceSummary } from './performanceProbe';
import { canStartRoomInteraction, resolveRoomInteraction } from './interactionLifecycle';
import type { PetRestMode } from '../presentation/petRest';
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
const REBOOT_ASSETS: Record<RebootStage, number> = {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  baby: require('../../assets/reboot-characters/baby.glb') as number,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  growing: require('../../assets/reboot-characters/growing.glb') as number,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  evolved: require('../../assets/reboot-characters/evolved.glb') as number,
};
// Review-only baby draft. Legacy originals and the other stages stay available.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const BABY_CHARM_ASSET = require('../../assets/reboot-02/baby-gait.glb') as number;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const BLENDER_BABY_ASSET = require('../../assets/reboot-03/blender-baby.glb') as number;
// C is separate; A/B asset bytes and the default A selection stay unchanged.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const HYBRID_BABY_ASSET = require('../../assets/reboot-03-1/hybrid-baby.glb') as number;
const rebootScale = (view: RebootView) => REBOOT_SCALE[view.stage] * (view.babyCharm && view.stage === 'baby' ? view.sizeCandidate ?? 1.25 : 1);

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
  private onPerformanceCapture?: (capture: RoomPerformanceCapture) => void;
  private onRuntimeSnapshot?: (snapshot: RoomRuntimeSnapshot) => void;
  private lastPerformanceCaptureToken?: string;
  private comparisonStretchProgress?: number;
  private lastPerformancePublishMs = 0;
  private mixer?: THREE.AnimationMixer;
  private loadedPet?: THREE.Object3D;
  private modelReady = false;
  private blenderRig?: BlenderBabyRig;
  private artTime = 0;
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
  private restMode: PetRestMode = 'awake';
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
  private growthLevel = 1;
  private lowEnergy = false;
  private growthStyle = growthExpression(1);
  private hungry = false;
  private mealAvailability: RoomProps['mealAvailability'] = 'ready';
  private cleanupProp?: THREE.Object3D;
  private readonly feedingDish = new THREE.Group();
  private foodBite?: THREE.Object3D;
  private toiletCurtain?: THREE.Object3D;
  private mealMouth?: () => THREE.Vector3;
  private lifePreference?: RoomProps['lifePreference'];
  private onLifeEvent?: (event: LifeEvent) => void;
  private rebootView?: RebootView;
  private babyGaitRig?: BabyGaitRig;
  private onRebootEvent?: (event: RebootEvent) => void;
  private rebootHandMarker?: THREE.Group;
  private rebootTime = 0;
  private readonly rebootDockOffset = new THREE.Vector3();
  private rebootTouchRegion: TouchRegion = 'unknown';
  private rebootInterruptedForTouch?: RebootIntent;
  private readonly reboot = new RebootDirector({
    navigate: point => { const target = this.navigateTo(point); this.targetRing.visible = false; return !!target; },
    stop: () => { this.path = []; this.destination = null; this.targetRing.visible = false; this.restoreBaseClip(); },
    event: event => this.onRebootEvent?.(event),
  });
  private readonly life = new LivingPet({
    navigate: point => !!this.navigateTo(point),
    stop: () => { this.path = []; this.destination = null; this.targetRing.visible = false; this.restoreBaseClip(); },
    event: event => {
      if (event.phase === 'perform') {
        const actExpression = event.motion ? growthGesture(event.motion, .5, 1).expression : null;
        this.presentationState = { ...EMPTY_ROOM_PRESENTATION, gaze: event.scene === 'look' || this.profile === 'reserved' && ['touch', 'company', 'ball'].includes(event.scene) ? 'aside' : 'user',
          emotion: actExpression === 'surprised' ? 'surprised' : actExpression === 'happy' ? 'content'
            : actExpression === 'playful' ? this.profile === 'reserved' ? 'shy' : 'content'
            : event.scene === 'rest' || event.scene === 'drowsy' ? 'sleepy' : event.scene === 'mishap' ? 'shy'
            : ['touch', 'release', 'company', 'gesture'].includes(event.scene) ? 'content' : event.scene === 'prank' ? 'shy' : event.scene === 'growth' && (event.level ?? 1) === 16 ? 'surprised' : 'interested' };
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
      mealAvailability: this.mealAvailability, growthStage: this.growthStage, growthLevel: this.growthLevel, tired: this.lowEnergy };
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
    const oldRebootStage = this.rebootView?.stage;
    const oldBabyCharm = this.rebootView?.babyCharm;
    const oldRebootSize = this.rebootView?.sizeCandidate;
    const oldArt = this.rebootView?.artCandidate;
    const oldArtToken = this.rebootView?.artComparison?.token;
    this.rebootView = props.rebootView;
    this.onRebootEvent = props.onRebootEvent;
    this.livingEnabled = !!props.livingEnabled;
    this.lifePreference = props.lifePreference;
    this.growthStage = props.growthStage === 'final' ? 4 : props.growthStage ?? 1;
    this.growthStyle = growthExpression(this.growthStage);
    this.growthLevel = props.growthLevel ?? 1;
    this.lowEnergy = !!props.lowEnergy;
    this.loadedPet?.scale.setScalar(this.rebootView ? rebootScale(this.rebootView) : .62 * this.growthStyle.scale);
    this.hungry = !!props.hungry;
    this.mealAvailability = props.mealAvailability ?? 'ready';
    if (props.poopCount && !this.cleanupProp) this.cleanupProp = this.addSphere(this.scene, 0xaa876b, [.22, .16, .22], [-.5, .12, 3.1]);
    if (this.cleanupProp) this.cleanupProp.visible = (props.poopCount ?? 0) > 0;
    if (props.lifeCommand?.token !== this.lastPropLifeToken) {
      this.lastPropLifeToken = props.lifeCommand?.token;
      this.pendingLifeCommand = props.lifeCommand;
    }
    this.onLifeEvent = props.onLifeEvent;
    const nextFormPresentation = props.previewFormId ? selectFormPresentation(props.previewFormId) : selectFormPresentation(props.formId ?? 'arucon');
    const nextCandidateId = props.characterCandidateId ?? DEFAULT_CHARACTER_CANDIDATE_ID;
    const petAssetChanged = nextFormPresentation.assetKey !== this.formPresentation.assetKey ||
      nextCandidateId !== this.characterCandidateId || oldRebootStage !== this.rebootView?.stage || oldBabyCharm !== this.rebootView?.babyCharm || oldArt !== this.rebootView?.artCandidate;
    const sizeComparisonChanged = this.rebootView?.babyCharm && this.rebootView.stage === 'baby' && oldRebootSize !== this.rebootView.sizeCandidate;
    if (oldRebootStage !== this.rebootView?.stage || oldBabyCharm !== this.rebootView?.babyCharm || sizeComparisonChanged || oldArt !== this.rebootView?.artCandidate || oldArtToken !== this.rebootView?.artComparison?.token) {
      this.artTime = 0;
      this.reboot.cancel(); this.cancelPet(); this.rebootDockOffset.set(0, 0, 0);
      this.babyGaitRig?.gait.reset();
      if (this.loadedPet) resetBabyPose(this.loadedPet);
      this.pinComparisonView();
    }
    this.formPresentation = nextFormPresentation;
    this.characterCandidateId = nextCandidateId;
    this.setComparisonView(props.comparisonCameraAngle);
    this.comparisonStretchProgress = this.comparisonMode && props.comparisonStretchProgress !== undefined
      ? Math.max(0, Math.min(1, props.comparisonStretchProgress)) : undefined;
    const nextProfile = props.personality ?? 'reserved';
    const nextRestMode = props.restMode ?? (props.sleeping ? 'sleeping' : 'awake');
    const nextSleeping = nextRestMode !== 'awake';
    if (nextSleeping !== this.sleeping && this.loadedPet) resetBabyPose(this.loadedPet);
    this.restMode = nextRestMode;
    this.onPerformanceSummary = props.onPerformanceSummary;
    this.onPerformanceCapture = props.onPerformanceCapture;
    this.onRuntimeSnapshot = props.onRuntimeSnapshot;
    if (props.performanceCaptureToken && props.performanceCaptureToken !== this.lastPerformanceCaptureToken) {
      this.lastPerformanceCaptureToken = props.performanceCaptureToken;
      this.performanceProbe.beginCapture();
    }
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
      this.clearTransientAction();
      this.selectClip(nextSleeping ? 'sleep' : `idle_${nextProfile}`);
    }
    this.furniture.table!.visible = props.tableInstalled ?? true;
    this.feedingDish.visible = props.tableInstalled ?? true;
    this.furniture.toilet!.visible = props.toiletInstalled ?? false;
    this.furniture.ball!.visible = props.ballVisible ?? false;
    this.furniture.cushion!.visible = props.cushionVisible ?? false;
    if (this.rebootView) {
      this.furniture.cushion!.position.set(this.rebootView.cushion.x, 0, this.rebootView.cushion.z);
      this.furniture.cushion!.scale.set(.72, .65, .72);
    } else { this.furniture.cushion!.position.set(-2.05, 0, .2); this.furniture.cushion!.scale.set(1, 1, 1); }
    if (this.rebootHandMarker) this.rebootHandMarker.visible = !!this.rebootView?.handOffered && !nextSleeping;
    const hat = this.loadedPet?.getObjectByName('RebootHat');
    if (hat) hat.visible = !!this.rebootView?.hatWorn;
    this.navigationOptions = { tableInstalled: props.tableInstalled ?? true, toiletInstalled: !!props.toiletInstalled,
      ...(this.rebootView ? { cushion: { x: this.rebootView.cushion.x, z: this.rebootView.cushion.z, rx: .91 * .72 + .18, rz: .68 * .72 + .18 } } : {}) };
    if (props.mealCue && props.mealCue.token !== this.lastMealToken) {
      if (nextSleeping) this.lastMealToken = props.mealCue.token;
      else if (!this.mixer) this.pendingMealToken = props.mealCue.token;
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
    this.onRuntimeSnapshot?.(this.runtimeSnapshot());
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
    const balancedLight = this.rendererConfig.roomMaterial === 'vertex_lit';
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
    const toilet = new THREE.Group(); toilet.position.set(TOILET_SPOT.x, 0, TOILET_SPOT.z);
    this.addSphere(toilet, 0x9fac96, [0.52, 0.52, 0.44], [0, 0.42, 0]);
    this.scene.add(toilet); this.furniture.toilet = toilet;
    const ball = new THREE.Group(); ball.position.set(1.35, 0.2, 3.1);
    this.addSphere(ball, 0xdca28c, [0.22, 0.22, 0.22], [0, 0, 0]);
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(.219, .012, 4, 20), this.material(0xf7dfb9));
    ball.add(stripe);
    this.scene.add(ball); this.furniture.ball = ball;
    const hand = new THREE.Group(); hand.position.set(REBOOT_HAND.x, REBOOT_HAND_HEIGHT, REBOOT_HAND.z);
    this.addSphere(hand, 0xe3bcc8, [.16, .035, .18], [0, 0, 0]);
    for (const x of [-.10, 0, .10]) this.addSphere(hand, 0xe9c9d2, [.04, .04, .10], [x, 0, -.12]);
    hand.visible = false; this.scene.add(hand); this.rebootHandMarker = hand;
    const staticObjects = [...this.scene.children.filter(node => node instanceof THREE.Mesh && node !== this.foodBite), plant];
    const batch = batchStaticRoom(staticObjects, this.rendererConfig.roomMaterial);
    for (const object of staticObjects) { this.scene.remove(object); disposeSceneObject(object); }
    this.scene.add(batch);
  }

  private petAsset() {
    if (this.rebootView?.babyCharm && this.rebootView.stage === 'baby') return this.rebootView.artCandidate === 'hybrid' ? HYBRID_BABY_ASSET : this.rebootView.artCandidate === 'blender' ? BLENDER_BABY_ASSET : BABY_CHARM_ASSET;
    if (this.rebootView) return REBOOT_ASSETS[this.rebootView.stage];
    return this.formPresentation.formId !== 'arucon' || this.characterCandidateId === DEFAULT_CHARACTER_CANDIDATE_ID
      ? FORM_ASSETS[this.formPresentation.assetKey]
      : getCharacterCandidate(this.characterCandidateId).asset;
  }

  async loadPet() {
    const assetKey = this.rebootView ? `reboot:${this.rebootView.stage}:${this.rebootView.babyCharm ? this.rebootView.artCandidate ?? 'v8' : 'legacy'}` : `${this.formPresentation.assetKey}:${this.characterCandidateId}`;
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
      const mouth = loaded.getObjectByName('Mouth');
      this.mealMouth = mouth instanceof THREE.Mesh ? createMorphedAnchor(mouth) : undefined;
      this.updateCpuMorphs = this.softwareRenderer && ['software_low_resolution', 'software_balanced', 'software_high_resolution'].includes(this.rendererConfig.id)
        ? prepareCpuMorphs(loaded) : null;
      loaded.scale.setScalar(this.rebootView ? rebootScale(this.rebootView) : 0.62 * growthExpression(this.growthStage).scale);
      const hat = loaded.getObjectByName('RebootHat'); if (hat) hat.visible = !!this.rebootView?.hatWorn;
      const firstModel = !this.loadedPet;
      const blenderRig = this.rebootView?.babyCharm && ['blender', 'hybrid'].includes(this.rebootView.artCandidate ?? '') ? new BlenderBabyRig(loaded, this.rebootView.artCandidate === 'hybrid') : undefined;
      this.petOrientation.rotation.y = this.comparisonMode ? comparisonCameraYaw(this.comparisonCameraAngle) : 0;
      this.mixer?.stopAllAction();
      if (this.loadedPet) {
        this.petOrientation.remove(this.loadedPet);
        disposeSceneObject(this.loadedPet);
      }
      this.loadedPet = loaded; this.blenderRig = blenderRig;
      this.petOrientation.add(loaded);
      this.babyGaitRig?.dispose();
      this.babyGaitRig = this.rebootView?.babyCharm && this.rebootView.stage === 'baby' ? new BabyGaitRig(loaded, this.scene) : undefined;
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

  private runtimeSnapshot(): RoomRuntimeSnapshot {
    const interaction = this.currentInteraction();
    const visual = this.petOrientation.getWorldPosition(new THREE.Vector3());
    return { restMode: this.restMode, sleeping: this.sleeping, interactionEnabled: this.interactionEnabled,
      interaction, clip: this.activeAction?.getClip().name ?? null,
      blockedBy: !this.frames.running ? 'background' : interaction === 'panel' ? 'panel'
        : this.sleeping ? this.restMode as 'sleeping' | 'hibernating'
          : interaction === 'committed_cue' ? 'committed_cue' : null,
      paused: !this.frames.running, lifeIntent: this.life.diagnosticIntent,
      lifePose: this.life.pose ? { ...this.life.pose } : null, position: { ...this.position },
      destination: this.destination ? { ...this.destination } : null,
      mealCue: { remaining: this.cueRemaining, committed: this.cueCommitted,
        pendingToken: this.pendingMealToken, lastToken: this.lastMealToken },
      pendingLifeToken: this.pendingLifeCommand?.token, lastLifeToken: this.lastPropLifeToken,
      ...(this.rebootView ? { rebootIntent: this.reboot.current, rebootPose: this.reboot.pose ? { ...this.reboot.pose } : null,
        artCandidate: this.loadedPetKey ?? null, artComparison: this.rebootView.artComparison ? { ...this.rebootView.artComparison, seconds: this.artTime } : null,
        visualRoot: { x: visual.x, y: visual.y, z: visual.z } } : {}) };
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
    if (this.rebootView) this.reboot.cancel();
    return this.navigateTo(raw);
  }

  private navigateTo(raw: FloorPoint): FloorPoint | null {
    if (!this.interactionEnabled || !canStartRoomInteraction(this.currentInteraction(), 'move')) return null;
    const target = nearestFree(raw, this.navigationOptions);
    if (!target) return null;
    const exitOptions = this.rebootView && !isFree(this.position, this.navigationOptions) &&
      isFree(this.position, { ...this.navigationOptions, cushion: false })
      ? { ...this.navigationOptions, cushion: false as const } : this.navigationOptions;
    const path = route(this.position, target, exitOptions);
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

  beginPet(inputStartedAtMs = performance.now(), region: TouchRegion = 'unknown') {
    if (!this.canStartPet()) return false;
    if (this.livingEnabled) this.life.cancel();
    this.rebootInterruptedForTouch = this.reboot.current?.kind; this.rebootTouchRegion = region;
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
    this.rebootInterruptedForTouch = this.reboot.current?.kind; this.rebootTouchRegion = 'unknown';
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
    this.rebootTime += dt;
    if (this.rebootView && this.modelReady && !this.rebootView.artComparison) this.reboot.update(dt, { enabled: this.interactionEnabled,
      awake: !this.sleeping, moving: !!this.path.length, touching: this.touchHolding || this.petPulseRemaining > 0,
      position: this.position, view: this.rebootView, touchRegion: this.rebootTouchRegion, interruptedForTouch: this.rebootInterruptedForTouch });
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
        const updated = advanceWalk({ position: this.position, facing: this.facing, speed: this.walkSpeed }, next, h,
          this.rebootView && (this.reboot.current?.kind === 'dash' || this.rebootView.babyCharm) ? 'expressive' : this.profile, this.path.length > 1);
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
    } else if (!this.rebootView && !this.livingEnabled && !this.comparisonMode && !this.reducedMotion && !this.sleeping && !this.touchHolding && !this.postTouchRemaining && !this.cueRemaining && !this.presentationState.clip && !this.presentationState.holdPose) {
      this.idleTime += dt;
      if (this.idleTime >= (this.profile === 'expressive' ? MOTION.idleExpressive : MOTION.idleReserved)) {
        this.idleTime = 0;
        const wander = [{ x: -0.45, z: -1.9 }, { x: 1.1, z: 2.35 }, { x: 0.2, z: 1.95 }];
        this.moveTo(wander[Math.floor(Math.random() * wander.length)]);
      }
    }
    if (this.touchHolding) this.touchTime += dt;
    this.petPulseRemaining = Math.max(0, this.petPulseRemaining - dt);
    if (this.rebootView && !this.path.length && !this.sleeping) {
      this.facing = rebootFacing(this.reboot.pose, this.position, this.facing, dt);
      this.petAnchor.rotation.y = this.facing;
    }
    if (!this.comparisonMode && !this.path.length && !(this.livingEnabled && this.life.pose) &&
        !(this.rebootView && this.reboot.pose?.gazeTarget) &&
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
    const comparison = this.rebootView?.artComparison;
    if (comparison && this.modelReady && !comparison.paused && !this.sleeping) this.artTime += dt;
    const art = comparison && !this.sleeping ? sampleArtComparison(comparison.scene, comparison.angle, this.artTime) : undefined;
    if (art) {
      this.position = art.point; this.facing = art.facing;
      this.petAnchor.position.set(art.point.x, 0, art.point.z); this.petAnchor.rotation.y = art.facing;
      const squeeze = this.reducedMotion ? 0 : art.press;
      this.petAnchor.scale.set(1+squeeze*.04, 1-squeeze*.08, 1+squeeze*.04);
    }
    const moving = art?.moving ?? !!this.path.length, pose = art?.pose ?? (art ? undefined : this.reboot.pose);
    const hop = art ? art.hop : pose?.phase === 'contact' && ['tiny_hops', 'hat_test_step'].includes(pose.baby?.beat.id ?? '') ? pose.baby?.progress : undefined;
    if (this.blenderRig || art) {
      const name = this.sleeping ? 'sleep' : moving ? 'walk' : hop !== undefined ? 'baby_hop'
        : pose?.kind === 'hand' ? pose.phase === 'recover' ? 'baby_release' : `pet_${this.profile}`
          : this.rebootView?.artCandidate === 'hybrid' && this.babyGaitRig?.gait.active ? 'baby_stop' : `idle_${this.profile}`;
      this.selectClip(name);
    }
    this.mixer?.update(comparison?.paused ? 0 : dt);
    this.applyMorphOverlay();
    if (this.livingEnabled || this.comparisonStretchProgress !== undefined) this.applyLifePose();
    if (this.rebootView && this.loadedPet && !this.sleeping) {
      applyRebootPose(this.petOrientation, this.loadedPet, pose, art ? this.artTime : this.rebootTime,
        moving, this.reducedMotion, this.position, this.facing, !!this.babyGaitRig);
      if (this.rebootView.babyCharm && this.rebootView.stage === 'baby') applyBabyPose(this.petOrientation, this.loadedPet,
        pose, art ? this.artTime : this.rebootTime, dt, moving, this.reducedMotion, !!this.babyGaitRig, art?.scene === 'neutral');
      const dock = this.reboot.pose?.dockTarget && ['contact', 'recover'].includes(this.reboot.pose.phase);
      if (dock) {
        const p = this.petOrientation.position;
        this.rebootDockOffset.set(p.x * Math.cos(this.facing) + p.z * Math.sin(this.facing), p.y,
          -p.x * Math.sin(this.facing) + p.z * Math.cos(this.facing));
      } else if (this.rebootDockOffset.lengthSq() > 1e-7) {
        // Canceling/moving a cushion settles the visual offset without a snap
        // and without completing an interrupted experience or economic command.
        this.rebootDockOffset.multiplyScalar(Math.exp(-12 * dt));
        const p = this.rebootDockOffset;
        this.petOrientation.position.x += p.x * Math.cos(this.facing) - p.z * Math.sin(this.facing);
        this.petOrientation.position.z += p.x * Math.sin(this.facing) + p.z * Math.cos(this.facing);
        this.petOrientation.position.y += p.y;
      }
    }
    if (this.blenderRig && this.sleeping) {
      this.petOrientation.position.set(0, 0, 0); this.petOrientation.rotation.set(0, 0, 0); this.petOrientation.scale.setScalar(1);
    }
    if (this.babyGaitRig && this.rebootView) {
      this.babyGaitRig.apply(this.petOrientation, { position: this.position, facing: this.facing,
        scale: rebootScale(this.rebootView), dt: comparison?.paused ? 0 : dt, moving: moving && !this.sleeping, reduced: this.reducedMotion, hop: this.sleeping ? undefined : hop }, !this.sleeping || !!this.blenderRig);
    }
    if (this.blenderRig && this.activeAction) {
      const clip = this.activeAction.getClip();
      if (moving && this.babyGaitRig) this.activeAction.time = (this.babyGaitRig.gait.phase % 1) * clip.duration;
      else if (hop !== undefined) this.activeAction.time = hop * clip.duration;
      else if (pose?.kind === 'hand') this.activeAction.time = Math.min(.99999, pose.progress) * clip.duration;
      else if (clip.name === 'baby_stop' && this.babyGaitRig) this.activeAction.time = this.babyGaitRig.gait.stopProgress * clip.duration;
      this.mixer?.update(0);
      this.blenderRig.apply(this.sleeping);
    }
    const reviewHat = this.loadedPet?.getObjectByName('RebootHat');
    if (reviewHat) reviewHat.visible = !!this.rebootView?.hatWorn && !art;
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
    const capture = this.performanceProbe.finishCaptureIfDue();
    if (capture) this.onPerformanceCapture?.(capture);
    if (this.onPerformanceSummary && timestamp - this.lastPerformancePublishMs >= 1_000) {
      this.lastPerformancePublishMs = timestamp;
      this.onPerformanceSummary(this.performanceProbe.snapshot());
      this.onRuntimeSnapshot?.(this.runtimeSnapshot());
    }
    this.frames.schedule(this.tick);
  };

  resume() {
    if (this.disposed || this.frames.running) return;
    this.submissions.markDirty();
    this.clock.start(); this.frames.resume(this.tick);
  }

  /** Cancels presentation only: a committed meal/EXP is never undone or replayed. */
  private clearTransientAction() {
    this.cueRemaining = 0; this.cueCommitted = false; this.pendingMealToken = undefined;
    this.pendingLifeCommand = undefined;
    this.postTouchRemaining = 0; this.petPulseRemaining = 0;
    this.presentationState = EMPTY_ROOM_PRESENTATION; this.presentationHoldRemaining = 0;
    this.refreshMorphOverlay();
    this.life.cancel();
    this.reboot.cancel();
    this.rebootDockOffset.set(0, 0, 0);
    if (this.loadedPet) resetBabyPose(this.loadedPet);
    if (this.rebootView) { this.petOrientation.position.set(0, 0, 0); this.petOrientation.rotation.set(0, 0, 0); this.petOrientation.scale.set(1, 1, 1); }
    this.path = []; this.destination = null; this.targetRing.visible = false;
  }

  pause() {
    const capture = this.performanceProbe.finishCaptureIfDue(true);
    if (capture) this.onPerformanceCapture?.(capture);
    this.clearTransientAction();
    this.cancelPet();
    if (this.presentationState !== EMPTY_ROOM_PRESENTATION) {
      this.presentationState = EMPTY_ROOM_PRESENTATION;
      this.presentationHoldRemaining = 0;
      this.refreshMorphOverlay();
      this.selectClip(this.sleeping ? 'sleep' : `idle_${this.profile}`, false, 1, true);
    }
    this.frames.stop(); this.clock.stop();
    this.onRuntimeSnapshot?.(this.runtimeSnapshot());
    this.performanceProbe.resetRafClock();
  }

  dispose() {
    this.pause(); this.disposed = true;
    this.petLoadGeneration++;
    this.onPerformanceSummary?.(this.performanceProbe.snapshot());
    this.mixer?.stopAllAction();
    this.babyGaitRig?.dispose();
    this.babyGaitRig = undefined;
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
    const pose = this.comparisonStretchProgress === undefined ? this.life.pose
      : { scene: 'stretch' as const, progress: this.comparisonStretchProgress, side: 1 };
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
          const offset = localDockOffset(this.position, { x: -2.05, z: .2 }, this.facing, settle);
          this.petOrientation.position.set(offset.x, .24 * settle, offset.z); }
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
        if (this.foodBite && this.mealMouth && p < .8) {
          const bite = Math.max(0, Math.min(1, (p - .2) / .55));
          const source = this.furniture.table?.visible ? MEAL_BOWL : { x: this.position.x, z: this.position.z + .6 };
          const mouth = this.mealMouth();
          this.foodBite.visible = true;
          this.foodBite.position.set(source.x + (mouth.x - source.x) * bite, .12 + (mouth.y - .12) * bite + .10 * Math.sin(bite * Math.PI), source.z + (mouth.z - source.z) * bite);
          const morsel = 1 - bite * .55;
          this.foodBite.scale.set(.065 * morsel, .05 * morsel, .065 * morsel);
          this.frontPaw?.position.set(0, .13 * Math.sin(bite * Math.PI) * soft, .08 * wave * soft);
        }
        break;
      case 'toilet': {
        if (!this.toiletCurtain) {
          this.toiletCurtain = this.addBox(this.scene, 0xc3cbb7, [1.15, .9, .08], [TOILET_SPOT.x, .48, TOILET_SPOT.z + .47]);
        }
        const enter = Math.min(1, p / .25, (1 - p) / .2);
        const offset = localDockOffset(this.position, TOILET_SPOT, this.facing, enter);
        this.petOrientation.position.set(offset.x, .08 * enter, offset.z);
        this.toiletCurtain.visible = p > .15 && p < .85;
        break;
      }
      case 'greeting': this.petOrientation.position.y = .1 * wave * scale * soft; break;
      case 'growth':
      case 'trick': case 'prank': case 'explore': {
        const v = growthGesture(pose.motion ?? levelExpression(pose.level ?? this.growthLevel).motion, p, pose.side);
        const style = this.profile === 'reserved' ? .84 : 1;
        this.petOrientation.position.set(v.x * soft * style, v.y * soft, v.z * soft);
        this.petOrientation.rotation.set(v.pitch * soft, v.yaw * soft, v.tilt * soft * style);
        this.petOrientation.scale.set(1 + v.squash * .45 * soft, 1 - v.squash * soft, 1 + v.squash * .45 * soft);
        this.frontPaw?.position.set(0, v.paw * soft, .06 * wave * soft);
        this.leftPaw?.position.set(0, v.otherPaw * soft, .04 * wave * soft); break;
      }
      case 'touch':
        this.petOrientation.scale.set(1 + .055 * wave * soft, 1 - .1 * wave * soft, 1 + .055 * wave * soft);
        this.petOrientation.rotation.z = (pose.touchTarget === 'body' ? -.14 : -.06) * wave * scale * soft;
        this.petOrientation.position.z = (this.growthLevel >= 6 ? .15 : .07) * wave * soft;
        if (pose.touchTarget !== 'body') this.frontPaw?.position.set(0, (this.growthLevel >= 6 ? .22 : .08) * wave * soft, 0);
        break;
      case 'company': case 'release':
        this.petOrientation.rotation.z = -grown.settleLean * wave * scale * soft;
        if (pose.scene === 'release' && pose.touchTarget !== 'body' && this.growthLevel >= 6) this.frontPaw?.position.set(0, .24 * wave * soft, .08 * wave * soft);
        if (grown.maturity >= 3) this.petOrientation.scale.y = 1 - .08 * wave * soft;
        break;
    }
    // An unlocked level act is also performed on its matching normal life
    // scene, so the review reveal is not the only route to its body language.
    if (pose.motion && !['growth', 'trick', 'prank', 'explore'].includes(pose.scene)) {
      const v = growthGesture(pose.motion, p, pose.side);
      this.petOrientation.position.x += v.x * soft;
      this.petOrientation.position.y += v.y * soft;
      this.petOrientation.rotation.y += v.yaw * soft;
      this.petOrientation.rotation.z += v.tilt * soft;
      this.frontPaw?.position.set(0, v.paw * soft, .05 * wave * soft);
      this.leftPaw?.position.set(0, v.otherPaw * soft, .04 * wave * soft);
    }
  }
}
