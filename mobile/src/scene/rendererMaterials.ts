import * as THREE from 'three';

function lowCostMaterial(source: THREE.Material): THREE.Material {
  if (!(source instanceof THREE.MeshStandardMaterial)) return source;
  const material = new THREE.MeshLambertMaterial({
    name: source.name,
    color: source.color,
    map: source.map,
    alphaMap: source.alphaMap,
    aoMap: source.aoMap,
    emissive: source.emissive,
    emissiveMap: source.emissiveMap,
    opacity: source.opacity,
    transparent: source.transparent,
    side: source.side,
    depthTest: source.depthTest,
    depthWrite: source.depthWrite,
    vertexColors: source.vertexColors,
    alphaTest: source.alphaTest,
  });
  material.blending = source.blending;
  material.toneMapped = source.toneMapped;
  material.visible = source.visible;
  source.dispose();
  return material;
}

/**
 * The software profile preserves GLB geometry, morph targets, skinning, maps,
 * transparency and animation while replacing its expensive PBR fragment
 * material. Hardware and legacy comparison profiles keep source materials.
 */
export function applyPetMaterialProfile(root: THREE.Object3D, profile: 'source' | 'lambert') {
  if (profile === 'source') return;
  root.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return;
    node.material = Array.isArray(node.material)
      ? node.material.map(lowCostMaterial)
      : lowCostMaterial(node.material);
  });
}
