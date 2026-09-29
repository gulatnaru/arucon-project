import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Consolidate only immutable opaque room props. Furniture/hit targets and the pet stay independent. */
export function batchStaticRoom(objects: readonly THREE.Object3D[], mode: 'basic' | 'lambert' | 'standard'): THREE.Mesh {
  const geometries: THREE.BufferGeometry[] = [];
  for (const object of objects) {
    object.updateMatrixWorld(true);
    object.traverse(node => {
      if (!(node instanceof THREE.Mesh) || Array.isArray(node.material)) return;
      const source = node.material as THREE.MeshLambertMaterial;
      if (!source.color || source.transparent || source.map) throw new Error('Static room batch accepts opaque color-only props');
      const geometry = node.geometry.clone().applyMatrix4(node.matrixWorld);
      const colors = new Float32Array(geometry.getAttribute('position').count * 3);
      for (let i = 0; i < colors.length; i += 3) {
        colors[i] = source.color.r; colors[i + 1] = source.color.g; colors[i + 2] = source.color.b;
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometries.push(geometry);
    });
  }
  const merged = mergeGeometries(geometries, false);
  for (const geometry of geometries) geometry.dispose();
  if (!merged) throw new Error('Static room geometry is incompatible');
  const material = mode === 'basic' ? new THREE.MeshBasicMaterial({ vertexColors: true })
    : mode === 'lambert' ? new THREE.MeshLambertMaterial({ vertexColors: true })
      : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95 });
  const mesh = new THREE.Mesh(merged, material);
  mesh.name = 'StaticRoomBatch';
  return mesh;
}
