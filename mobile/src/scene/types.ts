import type { FormId } from '../domain/model';
import type { ReactNode } from 'react';
import type { RoomPerformanceCapture, RoomPerformanceSummary } from './performanceProbe';
import type { RoomRendererProfileId } from './rendererConfig';
import type { CharacterCandidateId } from './characterCandidates';
import type { ComparisonCameraAngle, RoomPresentationBatch } from './presentationBridge';
import type { LifeCommand, LifeEvent, LifeScene } from '../living/life';
import type { PetRestMode } from '../presentation/petRest';
import type { RoomInteraction } from './interactionLifecycle';
import type { RebootEvent, RebootView } from '../reboot/contracts';

export type { ComparisonCameraAngle, RoomPresentationBatch, RoomVisualCommand } from './presentationBridge';

export type RoomRuntimeSnapshot = Readonly<{
  restMode: PetRestMode; sleeping: boolean; interactionEnabled: boolean;
  interaction: RoomInteraction; clip: string | null; paused: boolean;
  blockedBy: 'background' | 'panel' | 'sleeping' | 'hibernating' | 'committed_cue' | null;
  lifeIntent: Readonly<{ id: number; scene: LifeScene; phase: string; commandToken?: string }> | null;
  lifePose: Readonly<{ scene: LifeScene; progress: number; side: number }> | null;
  position: FloorPoint; destination: FloorPoint | null;
  mealCue: Readonly<{ remaining: number; committed: boolean; pendingToken?: string; lastToken?: string }>;
  pendingLifeToken?: string; lastLifeToken?: string;
}>;

/** APP-01 presentation port. Callbacks do not award resources or advance game time. */
export type RoomProps = {
  /** Opt-in isolated review. Does not replace any legacy room or saved form. */
  rebootView?: RebootView;
  onRebootEvent?: (event: RebootEvent) => void;
  rebootPlacement?: boolean;
  onRebootPlacement?: (point: FloorPoint) => void;
  livingEnabled?: boolean;
  lifeCommand?: LifeCommand;
  ballPlayInput?: boolean;
  onLifeEvent?: (event: LifeEvent) => void;
  lifePreference?: LifeScene;
  growthStage?: number | 'final';
  growthLevel?: number;
  lowEnergy?: boolean;
  poopCount?: number;
  hungry?: boolean;
  mealAvailability?: 'ready' | 'no_food' | 'no_table' | 'manual';
  onCleanup?: () => void;
  formId?: FormId;
  /** Isolated, read-only before/after view; the authoritative form stays formId. */
  previewFormId?: FormId;
  personality?: 'reserved' | 'expressive';
  sleeping?: boolean;
  restMode?: PetRestMode;
  reducedMotion?: boolean;
  tableInstalled?: boolean;
  toiletInstalled?: boolean;
  ballVisible?: boolean;
  cushionVisible?: boolean;
  /** One-shot visual signal emitted only after the application commits a meal. */
  mealCue?: { token: string; mode: 'direct' | 'auto' };
  /** Local engineering profile. It does not change game time or animation rates. */
  rendererProfileId?: RoomRendererProfileId;
  interactionEnabled?: boolean;
  /** Measured UI exclusion zones and pet-anchored speech, in room points. */
  topOcclusion?: number;
  bottomOcclusion?: number;
  reactionBubble?: ReactNode;
  /** Reversible common-form comparison; it never mutates formId or saved state. */
  characterCandidateId?: CharacterCandidateId;
  /** Comparison view rotates only the loaded character inside the unchanged room. */
  comparisonCameraAngle?: ComparisonCameraAngle;
  /** QA-only held samples of the same stretch deformation; never a life/economy event. */
  comparisonStretchProgress?: number;
  /** Visual reaction commands. A changed token is consumed exactly once. */
  reactionPresentation?: RoomPresentationBatch;
  /** Accepted direct input supersedes only interruptible reaction presentation. */
  onInteractionIntent?: (intent: 'pet' | 'move' | 'furniture') => void;
  onPetTouch?: (target: 'head' | 'body' | 'unknown') => void;
  onFurnitureHit?: (furniture: 'table' | 'cushion' | 'toilet' | 'ball') => void;
  onMove?: (target: { x: number; z: number }) => void;
  onStatus?: (message: string) => void;
  onPerformanceSummary?: (summary: RoomPerformanceSummary) => void;
  performanceCaptureToken?: string;
  onPerformanceCapture?: (capture: RoomPerformanceCapture) => void;
  /** Bounded local diagnostics; not a UI state update or a GPU measurement. */
  onRuntimeSnapshot?: (snapshot: RoomRuntimeSnapshot) => void;
};

export type FloorPoint = { x: number; z: number };
