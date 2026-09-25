export type HitName = 'pet' | 'table' | 'cushion' | 'toilet' | 'ball';
export type ProjectedHits = Record<HitName, { x: number; y: number; visible: boolean }>;

const HIT_NAMES: readonly HitName[] = ['pet', 'table', 'cushion', 'toilet', 'ball'];

/** Avoids bridging unchanged hit targets into React while preserving visible motion. */
export function projectedHitsEqual(
  previous: ProjectedHits,
  next: ProjectedHits,
  tolerancePx = 0.5,
): boolean {
  return HIT_NAMES.every((name) => {
    const before = previous[name];
    const after = next[name];
    return before.visible === after.visible
      && Math.abs(before.x - after.x) <= tolerancePx
      && Math.abs(before.y - after.y) <= tolerancePx;
  });
}
