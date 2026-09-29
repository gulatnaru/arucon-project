export type RoomRendererConfig = {
  msaaSamples: number;
  contextAntialias: boolean;
  maxPixelRatio: number;
  roomMaterial: 'standard' | 'lambert' | 'basic' | 'vertex_lit';
  petMaterial: 'source' | 'lambert' | 'vertex_lit';
};

export type RoomRendererProfileId =
  | 'automatic'
  | 'software_legacy_333'
  | 'software_balanced'
  | 'software_low_resolution';

export type ResolvedRoomRendererProfile = RoomRendererConfig & {
  id: RoomRendererProfileId;
  /** Minimum time between submitted Expo GL frames. Simulation stays on RAF. */
  submissionIntervalMs: number;
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
  petMaterial: 'source',
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
  petMaterial: 'source',
};

const SOFTWARE_LOW_RESOLUTION: RoomRendererConfig = {
  msaaSamples: 0,
  contextAntialias: false,
  maxPixelRatio: 0.75,
  roomMaterial: 'lambert',
  petMaterial: 'lambert',
};

export function selectRoomRendererConfig(development: boolean): RoomRendererConfig {
  return development ? DEVELOPMENT_RENDERER : RELEASE_RENDERER;
}

/**
 * Engineering comparison profiles. These are reversible local diagnostics, not
 * release quality specifications. The legacy profile preserves the observed
 * 333 ms submission cap; the candidate reduces fragment work and targets a
 * 33 ms submission cadence without changing animation or game time.
 */
export function resolveRoomRendererProfile(
  requested: RoomRendererProfileId,
  development: boolean,
  platform: string,
  identity?: RoomRendererIdentity,
): ResolvedRoomRendererProfile {
  const softwareRenderer = isAppleSoftwareRenderer(platform, identity);
  if (requested === 'automatic' && softwareRenderer) {
    return { id: 'software_balanced', ...SOFTWARE_LOW_RESOLUTION, roomMaterial: 'vertex_lit', petMaterial: 'vertex_lit', maxPixelRatio: 1.5, submissionIntervalMs: 0 };
  }
  if (requested === 'software_balanced') return { id: requested, ...SOFTWARE_LOW_RESOLUTION, roomMaterial: 'vertex_lit', petMaterial: 'vertex_lit', maxPixelRatio: 1.5, submissionIntervalMs: 0 };
  if (requested === 'software_legacy_333') {
    return { id: requested, ...selectRoomRendererConfig(development), submissionIntervalMs: softwareRenderer ? 333 : 0 };
  }
  if (requested === 'software_low_resolution') {
    return { id: requested, ...SOFTWARE_LOW_RESOLUTION, submissionIntervalMs: softwareRenderer ? 33 : 0 };
  }
  return { id: requested, ...selectRoomRendererConfig(development), submissionIntervalMs: 0 };
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
  return resolveRoomRendererProfile('automatic', false, platform, identity).submissionIntervalMs;
}

export function isAppleSoftwareRenderer(platform: string, identity?: RoomRendererIdentity): boolean {
  const appleSoftwareRenderer = identity?.renderer === 'Apple Software Renderer' &&
    identity.vendor === 'Apple Inc.' &&
    identity.version.startsWith('OpenGL ES 3.0 APPLE-');
  return platform === 'ios' && appleSoftwareRenderer;
}
