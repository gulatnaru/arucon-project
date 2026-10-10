import * as THREE from 'three';
import { vertexLitMaterial } from './vertexLitMaterial';
import { canCullOpaqueHull } from './opaqueHull';

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
export function applyPetMaterialProfile(root: THREE.Object3D, profile: 'source' | 'lambert' | 'vertex_lit', closedHullCulling = false) {
  if (profile === 'source') return;
  root.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return;
    const convert = (source: THREE.Material) => {
      if (profile !== 'vertex_lit' || !(source instanceof THREE.MeshStandardMaterial) || source.map || source.alphaMap || source.emissiveMap) return lowCostMaterial(source);
      const material = vertexLitMaterial(source.color, source.vertexColors);
      material.name = source.name;
      material.uniforms.opacity.value = source.opacity;
      material.transparent = source.transparent;
      material.side = closedHullCulling && canCullOpaqueHull(node.geometry, source) && node.matrixWorld.determinant() > 0 ? THREE.FrontSide : source.side;
      material.depthTest = source.depthTest; material.depthWrite = source.depthWrite;
      source.dispose();
      return material;
    };
    node.material = Array.isArray(node.material) ? node.material.map(convert) : convert(node.material);
  });
}
