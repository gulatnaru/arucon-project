import * as THREE from 'three';

type Target = { index: number; values: THREE.BufferAttribute['array']; offsets: Uint32Array };
type Attribute = { output: THREE.BufferAttribute; base: Float32Array; targets: Target[]; previous: number[]; initialized: boolean };

/** Same morph equation; skip zero deltas and attributes unaffected by a changed weight. */
export function prepareCpuMorphs(root: THREE.Object3D): () => void {
  const bindings: { mesh: THREE.Mesh; attributes: Attribute[]; relative: boolean }[] = [];
  root.traverse(node => {
    if (!(node instanceof THREE.Mesh) || !node.morphTargetInfluences?.length) return;
    const geometry = node.geometry;
    const attributes = ['position', 'normal'].flatMap(name => {
      const source = geometry.getAttribute(name);
      const sourceTargets = geometry.morphAttributes[name as 'position' | 'normal'] as (THREE.BufferAttribute | THREE.InterleavedBufferAttribute)[] | undefined;
      if (!(source instanceof THREE.BufferAttribute) || !sourceTargets?.length ||
          sourceTargets.some(target => !(target instanceof THREE.BufferAttribute))) return [];
      const base = Float32Array.from(source.array);
      const output = new THREE.BufferAttribute(base.slice(), source.itemSize).setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute(name, output);
      const targets = sourceTargets.flatMap((target, index) => {
        const offsets: number[] = [];
        for (let i = 0; i < target.array.length; i++) if (target.array[i] !== 0) offsets.push(i);
        // Absolute targets affect the base coefficient even when all coordinates are zero.
        return offsets.length || !geometry.morphTargetsRelative ? [{ index, values: target.array, offsets: Uint32Array.from(offsets) }] : [];
      });
      return [{ output, base, targets, previous: Array(sourceTargets.length).fill(NaN), initialized: false }];
    });
    if (!attributes.length) return;
    bindings.push({ mesh: node, attributes, relative: geometry.morphTargetsRelative });
    geometry.morphAttributes = {};
    node.frustumCulled = false;
  });
  return () => {
    for (const binding of bindings) {
      const weights = binding.mesh.morphTargetInfluences!;
      for (const attribute of binding.attributes) {
        const { output, base, targets, previous } = attribute;
        let changed = !attribute.initialized;
        for (const target of targets) {
          const weight = weights[target.index] ?? 0;
          if (previous[target.index] !== weight) changed = true;
          previous[target.index] = weight;
        }
        if (!changed) continue;
        attribute.initialized = true;
        const result = output.array as Float32Array;
        if (binding.relative) result.set(base);
        else {
          const baseWeight = 1 - weights.reduce((sum, value) => sum + value, 0);
          for (let i = 0; i < result.length; i++) result[i] = base[i] * baseWeight;
        }
        for (const { index, values, offsets } of targets) {
          const weight = weights[index] ?? 0;
          if (weight === 0) continue;
          for (let n = 0; n < offsets.length; n++) { const i = offsets[n]; result[i] += values[i] * weight; }
        }
        output.needsUpdate = true;
      }
    }
  };
}
