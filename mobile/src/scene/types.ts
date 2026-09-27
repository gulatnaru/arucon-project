import type { FormId } from '../domain/model';
import type { ReactNode } from 'react';
import type { RoomPerformanceSummary } from './performanceProbe';
import type { RoomRendererProfileId } from './rendererConfig';
import type { CharacterCandidateId } from './characterCandidates';
import type { ComparisonCameraAngle, RoomPresentationBatch } from './presentationBridge';

export type { ComparisonCameraAngle, RoomPresentationBatch, RoomVisualCommand } from './presentationBridge';

/** APP-01 presentation port. Callbacks do not award resources or advance game time. */
export type RoomProps = {
  formId?: FormId;
  personality?: 'reserved' | 'expressive';
  sleeping?: boolean;
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
  /** Visual reaction commands. A changed token is consumed exactly once. */
  reactionPresentation?: RoomPresentationBatch;
  /** Accepted direct input supersedes only interruptible reaction presentation. */
  onInteractionIntent?: (intent: 'pet' | 'move' | 'furniture') => void;
  onPetTouch?: (target: 'head' | 'body' | 'unknown') => void;
  onFurnitureHit?: (furniture: 'table' | 'cushion' | 'toilet' | 'ball') => void;
  onMove?: (target: { x: number; z: number }) => void;
  onStatus?: (message: string) => void;
  onPerformanceSummary?: (summary: RoomPerformanceSummary) => void;
};

export type FloorPoint = { x: number; z: number };
