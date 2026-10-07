import type { FloorPoint } from '../scene/types';

export type RebootStage = 'baby' | 'growing' | 'evolved';
export type RebootIntent = 'arrival' | 'explore' | 'dash' | 'stretch' | 'rest' | 'company' | 'hand'
  | 'hat_first' | 'hat_again' | 'hat_busy' | 'cushion_changed';
export type RebootFact = Readonly<{ eventId: string; petId: string; kind: 'hat_used' | 'cushion_used' | 'hand';
  itemId: string; atMs: number; completed: true; stage: RebootStage; context?: RebootIntent; itemRevision?: number; position?: FloorPoint }>;
export type RebootSnapshot = { schemaVersion: 1; petId: string; revision: number; hatWorn: boolean;
  cushion: FloorPoint & { revision: number }; previewStage: RebootStage; events: RebootFact[] };
export type RebootCommand = Readonly<{ token: string; kind: RebootIntent; sourceRevision: number;
  target?: FloorPoint; resume?: 'explore' | 'dash' | 'stretch'; itemRevision?: number }>;
export type RebootEvent = Readonly<{ token: string; kind: RebootIntent; phase: 'start' | 'look' | 'approach' | 'contact' | 'recover' | 'complete' | 'cancel';
  automatic: boolean; stage: RebootStage; sourceRevision: number; itemRevision?: number; target?: FloorPoint;
  rememberedPosition?: FloorPoint; currentTarget?: FloorPoint }>;
export type RebootView = Readonly<{ stage: RebootStage; hatWorn: boolean; revision: number;
  cushion: FloorPoint & { revision: number }; handOffered: boolean; command?: RebootCommand }>;
export const REBOOT_SCALE: Record<RebootStage, number> = { baby: .53, growing: .48, evolved: .43 };
export const REBOOT_HAND: FloorPoint = Object.freeze({ x: 0, z: 3.35 });
// Meet the front paws below the face; the old .48 height covered the mouth.
export const REBOOT_HAND_HEIGHT = .14;
export const REBOOT_ITEM = Object.freeze({ hat: 'review:pearl-beret', cushion: 'review:rest-cushion' });

export function eligibleMemories(snapshot: RebootSnapshot, itemId: string): RebootFact[] {
  return snapshot.events.filter(x => x.petId === snapshot.petId && x.completed === true && x.itemId === itemId);
}
export function hatReaction(snapshot: RebootSnapshot, interrupted?: string): RebootIntent {
  if (interrupted && ['explore', 'dash', 'stretch'].includes(interrupted)) return 'hat_busy';
  return eligibleMemories(snapshot, REBOOT_ITEM.hat).length ? 'hat_again' : 'hat_first';
}
