import * as THREE from 'three';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';

/** Official r166 edge-aware FXAA, opt-in review only. No blur/upscale/sharpen filter. */
export function createRoomFxaa(width: number, height: number) {
  const target = new THREE.WebGLRenderTarget(width, height, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    type: THREE.UnsignedByteType, depthBuffer: true, stencilBuffer: false, generateMipmaps: false });
  const uniforms = THREE.UniformsUtils.clone(FXAAShader.uniforms);
  uniforms.tDiffuse.value = target.texture; uniforms.resolution.value.set(1 / width, 1 / height);
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader: FXAAShader.vertexShader,
    fragmentShader: FXAAShader.fragmentShader, depthTest: false, depthWrite: false, toneMapped: false });
  const geometry = new THREE.PlaneGeometry(2, 2), scene = new THREE.Scene(); scene.add(new THREE.Mesh(geometry, material));
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  return { target, uniforms,
    render(renderer: THREE.WebGLRenderer, room: THREE.Scene, roomCamera: THREE.Camera) {
      renderer.setRenderTarget(target); renderer.render(room, roomCamera);
      renderer.setRenderTarget(null); renderer.render(scene, camera);
    },
    dispose() { target.dispose(); material.dispose(); geometry.dispose(); },
  };
}
