export type HitName = 'pet' | 'table' | 'cushion' | 'toilet' | 'ball';
export type ProjectedHits = Record<HitName, { x: number; y: number; visible: boolean }> & { cleanup?: { x: number; y: number; visible: boolean } };

const HIT_NAMES: readonly HitName[] = ['pet', 'table', 'cushion', 'toilet', 'ball'];

/** Speech follows the pet while staying clear of measured controls/safe areas. */
export function petBubbleBounds(pet: { x: number; y: number }, width: number, top: number, bottom: number, height: number) {
  const bubbleWidth = Math.min(288, Math.max(120, width - 24));
  const available = Math.max(0, bottom - top - 16);
  const boundedHeight = Math.min(height, available);
  const left = Math.max(12, Math.min(width - bubbleWidth - 12, pet.x - bubbleWidth / 2));
  const below = pet.y - 70 - boundedHeight < top + 8;
  const desired = below ? pet.y + 54 : pet.y - 70 - boundedHeight;
  return { left, top: Math.max(top + 8, Math.min(bottom - boundedHeight - 8, desired)),
    width: bubbleWidth, maxHeight: available, below,
    tailLeft: Math.max(16, Math.min(bubbleWidth - 28, pet.x - left - 6)) };
}

/** Avoids bridging unchanged hit targets into React while preserving visible motion. */
export function projectedHitsEqual(
  previous: ProjectedHits,
  next: ProjectedHits,
  tolerancePx = 0.5,
): boolean {
  const cleanupSame = !previous.cleanup && !next.cleanup || !!previous.cleanup && !!next.cleanup &&
    previous.cleanup.visible === next.cleanup.visible && Math.abs(previous.cleanup.x - next.cleanup.x) <= tolerancePx && Math.abs(previous.cleanup.y - next.cleanup.y) <= tolerancePx;
  return cleanupSame && HIT_NAMES.every((name) => {
    const before = previous[name];
    const after = next[name];
    return before.visible === after.visible
      && Math.abs(before.x - after.x) <= tolerancePx
      && Math.abs(before.y - after.y) <= tolerancePx;
  });
}
