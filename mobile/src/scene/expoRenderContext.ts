/** Expo iOS GLView's default is a managed nonzero FBO (including MSAA), not
 * GLES framebuffer zero. Three's postprocessing switch requests WebGL BACK
 * there; GLES requires COLOR_ATTACHMENT0. Adapt this public call in our own
 * renderer facade, without changing Expo/Three objects, packages or binaries.
 * The unwrapped context remains the owner of endFrameEXP and resource life.
 */
export function expoRenderContext<T extends { BACK: number; COLOR_ATTACHMENT0: number; drawBuffers(buffers: number[]): void }>(gl: T, managedDefault: boolean): T {
  if (!managedDefault) return gl;
  const functions = new Map<PropertyKey, unknown>();
  return new Proxy(gl, { get(target, key) {
    if (functions.has(key)) return functions.get(key);
    const value = Reflect.get(target, key, target);
    if (typeof value !== 'function') return value;
    const method = key === 'drawBuffers' ? (buffers: number[]) => target.drawBuffers(buffers.map(x => x === target.BACK ? target.COLOR_ATTACHMENT0 : x))
      : value.bind(target);
    functions.set(key, method); return method;
  } });
}
