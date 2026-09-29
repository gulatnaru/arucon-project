import * as THREE from 'three';

/** Cache the tiny landmark's centroids before CPU morph conversion clears targets.
 * Evaluating an anchor is O(targets), not a per-frame geometry/bounds scan. */
export function createMorphedAnchor(mesh: THREE.Mesh): () => THREE.Vector3 {
  const mean = (attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) => {
    const center = new THREE.Vector3();
    for (let i = 0; i < attribute.count; i++) center.add(new THREE.Vector3().fromBufferAttribute(attribute, i));
    return center.divideScalar(attribute.count);
  };
  const base = mean(mesh.geometry.getAttribute('position'));
  const relative = mesh.geometry.morphTargetsRelative;
  const deltas = (mesh.geometry.morphAttributes.position ?? []).map(attribute => {
    const center = mean(attribute);
    return relative ? center : center.sub(base);
  });
  const world = new THREE.Vector3();
  return () => {
    world.copy(base);
    for (let i = 0; i < deltas.length; i++) world.addScaledVector(deltas[i], mesh.morphTargetInfluences?.[i] ?? 0);
    mesh.updateWorldMatrix(true, false);
    return world.applyMatrix4(mesh.matrixWorld);
  };
}
