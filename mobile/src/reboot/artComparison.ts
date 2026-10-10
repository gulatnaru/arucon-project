import type { RebootPose } from './director';
import type { FloorPoint } from '../scene/types';
export type BabyArt = 'v8' | 'blender' | 'hybrid' | 'quad';
export const BABY_ART_CHOICES: readonly { id: BabyArt; label: string; accessibility: string }[] = [
  { id: 'v8', label: 'A · 기존 v8', accessibility: '모델 A v8 선택' },
  { id: 'blender', label: 'B · Blender 후보', accessibility: '모델 B Blender 선택' },
  { id: 'hybrid', label: 'C · Hybrid 후보', accessibility: '모델 C Hybrid 선택' },
];
export type ArtAngle = 'front' | 'side' | 'back' | 'all';
export type ArtCase = 'sequence' | 'neutral' | 'curious' | 'playful' | 'surprised' | 'walk' | 'hop' | 'pet' | 'release';
export type ArtComparison = Readonly<{ token: string; angle: ArtAngle; scene: ArtCase; paused: boolean }>;
export const ART_CASES: readonly ArtCase[] = ['sequence', 'neutral', 'curious', 'playful', 'surprised', 'walk', 'hop', 'pet', 'release'];
export const ART_LABELS: Record<ArtCase, string> = { sequence: '전체 같은 장면', neutral: '기본 자세', curious: '호기심', playful: '장난', surprised: '놀람', walk: '걷기·정지', hop: '통통·착지', pet: '쓰다듬기', release: '손 놓기·복원' };
export const artFacing = (angle: ArtAngle) => angle === 'side' ? Math.PI / 2 : angle === 'back' ? Math.PI : 0;
const smooth = (t: number) => t * t * (3 - 2 * t);
/** Read-only shared presentation. No director events, rewards or saved memories. */
export function sampleArtComparison(scene: ArtCase, angle: ArtAngle, seconds: number): { point: FloorPoint; facing: number; moving: boolean; pose?: RebootPose; hop?: number; press: number; scene: ArtCase; angle: ArtAngle } {
  if (scene === 'sequence') {
    const stages = ART_CASES.filter(s => s !== 'sequence');
    const actualAngle = angle === 'all' ? (['front', 'side', 'back'] as const)[Math.floor(Math.max(0, seconds) / 32) % 3] : angle;
    return sampleArtComparison(stages[Math.floor(Math.max(0, seconds) / 4) % stages.length], actualAngle, seconds % 4);
  }
  const t = Math.max(0, seconds) % 6, facing = artFacing(angle), point: FloorPoint = { x: 0, z: 1.8 };
  let moving = false;
  if (scene === 'walk') {
    const travel = t < 1 ? 0 : t < 3 ? .85 * (t - 1) : 1.7;
    point.x = Math.sin(facing) * (travel - .85); point.z += Math.cos(facing) * (travel - .85); moving = t >= 1 && t < 3;
  }
  const progress = scene === 'hop' ? Math.min(1, Math.max(0, (t - 1) / .9))
    : scene === 'release' ? Math.min(1, Math.max(0, (t - 1) / 1.5)) : Math.min(1, t / 2.4);
  const expression = scene === 'surprised' ? 'surprised' : scene === 'playful' ? 'playful' : scene === 'pet' || scene === 'release' ? 'content' : scene === 'hop' ? 'excited' : 'curious';
  const pose: RebootPose | undefined = scene === 'neutral' || scene === 'walk' ? undefined : {
    kind: scene === 'pet' || scene === 'release' ? 'hand' : 'baby_discover', stage: 'baby',
    phase: scene === 'release' && t > 1 ? 'recover' : 'contact', held: false, progress, releaseFrom: 1,
    baby: { beat: { id: scene === 'hop' ? 'tiny_hops' : scene === 'pet' || scene === 'release' ? 'head_lean' : 'notice', seconds: 2.4, expression }, progress },
  };
  return { point, facing, moving, pose, scene, angle, hop: scene === 'hop' && t >= 1 && t <= 1.9 ? progress : undefined,
    press: scene === 'pet' ? smooth(Math.min(1, t / .4)) : scene === 'release' ? 1 - smooth(progress) : 0 };
}
