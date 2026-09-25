export type RoomRendererConfig = {
  msaaSamples: number;
  contextAntialias: boolean;
  maxPixelRatio: number;
  roomMaterial: 'standard' | 'lambert';
};

export type RoomRendererIdentity = {
  renderer: string;
  vendor: string;
  version: string;
};

// Release uses the same bounded budget until physical-device measurements can
// justify a capability-gated quality tier. The GLB, motion and room geometry
// remain identical; this only bounds fragment work and material complexity.
const RELEASE_RENDERER: RoomRendererConfig = {
  msaaSamples: 0,
  contextAntialias: false,
  maxPixelRatio: 1.65,
  roomMaterial: 'lambert',
};

/**
 * The iOS Simulator uses a software OpenGL renderer. At the native 3x backing
 * resolution, each large room surface took minutes to finish a Standard-material
 * draw while finite GLB geometry and morph draws completed with GL_NO_ERROR.
 * This development profile matches the approved browser reference's 1.65 DPR cap
 * and keeps the model, scene dimensions, motion, and furniture intact.
 */
const DEVELOPMENT_RENDERER: RoomRendererConfig = {
  msaaSamples: 0,
  contextAntialias: false,
  maxPixelRatio: 1.65,
  roomMaterial: 'lambert',
};

export function selectRoomRendererConfig(development: boolean): RoomRendererConfig {
  return development ? DEVELOPMENT_RENDERER : RELEASE_RENDERER;
}

export function roomRenderSurfaceScale(devicePixelRatio: number, maxPixelRatio: number): number {
  if (!Number.isFinite(devicePixelRatio) || devicePixelRatio <= 0) return 1;
  return Math.min(1, maxPixelRatio / devicePixelRatio);
}

/**
 * Expo GL submits frames asynchronously. Throttle the observed iOS software
 * renderer to reduce pressure on its serial queue in every build mode.
 */
export function roomFrameSubmissionIntervalMs(
  platform: string,
  identity?: RoomRendererIdentity,
): number {
  const appleSoftwareRenderer = identity?.renderer === 'Apple Software Renderer' &&
    identity.vendor === 'Apple Inc.' &&
    identity.version.startsWith('OpenGL ES 3.0 APPLE-');
  return platform === 'ios' && appleSoftwareRenderer ? 333 : 0;
}
