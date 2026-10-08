import type { FloorPoint } from '../scene/types';
import type { ArtComparison, BabyArt } from './artComparison';

export type RebootStage = 'baby' | 'growing' | 'evolved';
export type RebootIntent = 'arrival' | 'explore' | 'dash' | 'stretch' | 'rest' | 'company' | 'hand'
  | 'hat_first' | 'hat_again' | 'hat_busy' | 'cushion_changed'
  | 'baby_scout' | 'baby_discover' | 'baby_sneak' | 'baby_silly' | 'baby_peek';
export type BabyExpression = 'curious' | 'excited' | 'playful' | 'surprised' | 'content' | 'embarrassed' | 'sleepy';
export type TouchRegion = 'head' | 'body' | 'unknown';
export const RESUMABLE_REBOOT_INTENTS = ['explore', 'dash', 'stretch', 'baby_scout', 'baby_discover', 'baby_sneak', 'baby_silly', 'baby_peek'] as const;
export type ResumableIntent = typeof RESUMABLE_REBOOT_INTENTS[number];
export type RebootFact = Readonly<{ eventId: string; petId: string; kind: 'hat_used' | 'cushion_used' | 'hand';
  itemId: string; atMs: number; completed: true; stage: RebootStage; context?: RebootIntent; itemRevision?: number; position?: FloorPoint; touchRegion?: TouchRegion }>;
export type RebootSnapshot = { schemaVersion: 1; petId: string; revision: number; hatWorn: boolean;
  cushion: FloorPoint & { revision: number }; previewStage: RebootStage; events: RebootFact[] };
export type RebootCommand = Readonly<{ token: string; kind: RebootIntent; sourceRevision: number;
  target?: FloorPoint; resume?: ResumableIntent; resumeTarget?: FloorPoint; itemRevision?: number }>;
export type RebootEvent = Readonly<{ token: string; kind: RebootIntent; phase: 'start' | 'look' | 'approach' | 'contact' | 'recover' | 'complete' | 'cancel';
  automatic: boolean; stage: RebootStage; sourceRevision: number; itemRevision?: number; target?: FloorPoint;
  rememberedPosition?: FloorPoint; currentTarget?: FloorPoint; babyMode?: boolean; babyBeat?: string; expression?: BabyExpression; touchRegion?: TouchRegion; memoryIds?: readonly string[] }>;
export type RebootView = Readonly<{ stage: RebootStage; hatWorn: boolean; revision: number;
  cushion: FloorPoint & { revision: number }; handOffered: boolean; command?: RebootCommand;
  babyCharm?: boolean; sizeCandidate?: 1.15 | 1.25 | 1.35; familiarHandId?: string;
  artCandidate?: BabyArt; artComparison?: ArtComparison }>;
export const REBOOT_SCALE: Record<RebootStage, number> = { baby: .53, growing: .48, evolved: .43 };
export const REBOOT_HAND: FloorPoint = Object.freeze({ x: 0, z: 3.35 });
// Meet the front paws below the face; the old .48 height covered the mouth.
export const REBOOT_HAND_HEIGHT = .14;
export const REBOOT_ITEM = Object.freeze({ hat: 'review:pearl-beret', cushion: 'review:rest-cushion' });

export function eligibleMemories(snapshot: RebootSnapshot, itemId: string): RebootFact[] {
  return snapshot.events.filter(x => x.petId === snapshot.petId && x.completed === true && x.itemId === itemId);
}
export function hatReaction(snapshot: RebootSnapshot, interrupted?: string): RebootIntent {
  if (interrupted && (RESUMABLE_REBOOT_INTENTS as readonly string[]).includes(interrupted)) return 'hat_busy';
  return eligibleMemories(snapshot, REBOOT_ITEM.hat).length ? 'hat_again' : 'hat_first';
}
