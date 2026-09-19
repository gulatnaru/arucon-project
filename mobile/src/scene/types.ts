import type { FormId } from '../domain/model';

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
  onPetTouch?: () => void;
  onFurnitureHit?: (furniture: 'table' | 'cushion' | 'toilet' | 'ball') => void;
  onMove?: (target: { x: number; z: number }) => void;
  onStatus?: (message: string) => void;
};

export type FloorPoint = { x: number; z: number };
