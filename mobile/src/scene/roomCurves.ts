import * as THREE from 'three';
export type RoomCurveRole = 'rug' | 'cushion' | 'leaf' | 'facility';
/** Refine projected large curves, not every prop. Same shape, dimensions, smooth analytic normals. */
export function roomCurveGeometry(role?: RoomCurveRole, legacy = false) {
  const [longitude, latitude] = legacy || !role ? [24, 16]
    : role === 'rug' ? [96, 16] : role === 'cushion' ? [64, 24] : role === 'leaf' ? [32, 20] : [48, 24];
  return new THREE.SphereGeometry(1, longitude, latitude);
}
