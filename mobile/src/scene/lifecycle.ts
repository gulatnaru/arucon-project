import * as THREE from 'three';

export function disposeSceneObject(root: THREE.Object3D) {
  root.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      node.geometry.dispose();
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => material.dispose());
    }
  });
}

/** A parse finishing after unmount must not attach a model or leak its GPU objects. */
export function retainLoadedModel<T extends THREE.Object3D>(root: T, disposed: boolean): T | null {
  if (disposed) { disposeSceneObject(root); return null; }
  return root;
}

/**
 * Android can create the GL context before React Native resolves the initial
 * AppState. Treat that startup-only unknown state as foreground-ready; explicit
 * inactive/background states remain paused and later events own the lifecycle.
 */
export function shouldResumeRoomOnContext(appState: string | null): boolean {
  return appState === null || appState === 'unknown' || appState === 'active';
}

export class RafGate {
  private id: number | null = null;
  private active = false;
  private generation = 0;
  constructor(private readonly request: (callback: FrameRequestCallback) => number, private readonly cancel: (id: number) => void) {}
  get scheduled() { return this.id !== null; }
  get running() { return this.active; }
  resume(callback: FrameRequestCallback) {
    if (this.active) return false;
    this.active = true;
    return this.schedule(callback);
  }
  schedule(callback: FrameRequestCallback) {
    if (!this.active || this.id !== null) return false;
    const generation = this.generation;
    this.id = this.request((timestamp) => {
      if (!this.active || generation !== this.generation) return;
      this.id = null; callback(timestamp);
    });
    return true;
  }
  stop() { this.active = false; this.generation++; if (this.id !== null) this.cancel(this.id); this.id = null; }
}
