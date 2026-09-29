import * as THREE from 'three';

/** Color-only software GL: fixed room lighting and sRGB encoding per vertex, not per fragment.
 * CPU morphing still supplies animated positions/normals; hardware keeps its source material.
 */
export function vertexLitMaterial(color: THREE.ColorRepresentation = 0xffffff, vertexColors = false) {
  return new THREE.ShaderMaterial({
    vertexColors,
    uniforms: {
      baseColor: { value: new THREE.Color(color) },
      groundColor: { value: new THREE.Color(0xc9b49a) },
      sunColor: { value: new THREE.Color(0xfff3d9) },
      opacity: { value: 1 },
    },
    vertexShader: `
      uniform vec3 baseColor;
      uniform vec3 groundColor;
      uniform vec3 sunColor;
      varying vec3 litColor;
      vec3 encodeSRGB(vec3 value) {
        value = max(value, vec3(0.0));
        return mix(12.92 * value, 1.055 * pow(value, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), value));
      }
      void main() {
        vec3 n = normalize(normalMatrix * normal);
        vec3 up = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
        vec3 sun = normalize((viewMatrix * vec4(-3.0, 9.0, 7.0, 0.0)).xyz);
        vec3 diffuse = baseColor;
        #ifdef USE_COLOR
          diffuse *= color;
        #endif
        vec3 light = mix(groundColor, vec3(1.0), dot(n, up) * 0.5 + 0.5) * 1.9;
        light += sunColor * max(0.0, dot(n, sun)) * 1.45;
        litColor = encodeSRGB(diffuse * light / 3.14159265359);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec3 litColor;
      uniform float opacity;
      void main() { gl_FragColor = vec4(litColor, opacity); }`,
  });
}
