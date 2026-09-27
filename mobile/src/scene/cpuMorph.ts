import * as THREE from 'three';

/** Software GL avoids repeated texture-backed morph fetches; clips/weights stay intact. */
export function prepareCpuMorphs(root: THREE.Object3D): () => void {
  const bindings: { mesh: THREE.Mesh; previous: number[]; attributes: {
    output: THREE.BufferAttribute; base: Float32Array; targets: readonly THREE.BufferAttribute[];
  }[]; relative: boolean }[] = [];
  root.traverse(node => {
    if (!(node instanceof THREE.Mesh) || !node.morphTargetInfluences?.length) return;
    const geometry = node.geometry;
    const attributes = ['position', 'normal'].flatMap(name => {
      const source = geometry.getAttribute(name);
      const targets = geometry.morphAttributes[name as 'position' | 'normal'];
      if (!(source instanceof THREE.BufferAttribute) || !targets?.length ||
          targets.some((target: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) => !(target instanceof THREE.BufferAttribute))) return [];
      const base = Float32Array.from(source.array);
      const output = new THREE.BufferAttribute(base.slice(), source.itemSize).setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute(name, output);
      return [{ output, base, targets: targets as THREE.BufferAttribute[] }];
    });
    if (!attributes.length) return;
    // Model remains animated by the original mixer via morphTargetInfluences.
    bindings.push({ mesh: node, previous: Array(node.morphTargetInfluences.length).fill(NaN), attributes, relative: geometry.morphTargetsRelative });
    geometry.morphAttributes = {};
    node.frustumCulled = false;
  });
  return () => {
    for (const binding of bindings) {
      const weights = binding.mesh.morphTargetInfluences!;
      if (weights.length === binding.previous.length && weights.every((w, i) => w === binding.previous[i])) continue;
      for (let i = 0; i < weights.length; i++) binding.previous[i] = weights[i];
      const baseWeight = binding.relative ? 1 : 1 - weights.reduce((sum, value) => sum + value, 0);
      for (const { output, base, targets } of binding.attributes) {
        const result = output.array as Float32Array;
        for (let i = 0; i < base.length; i++) result[i] = base[i] * baseWeight;
        for (let t = 0; t < targets.length; t++) {
          const weight = weights[t] ?? 0;
          if (weight === 0) continue;
          const delta = targets[t].array;
          for (let i = 0; i < result.length; i++) result[i] += delta[i] * weight;
        }
        output.needsUpdate = true;
      }
    }
  };
}
