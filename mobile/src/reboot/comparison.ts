import { newPersonality, personalityOwnsPet, type PersonalityId } from './personality';
import type { RebootSnapshot } from './contracts';

export const COMPARISON_SEED = 0x3412abcd;
export const COMPARISON_WARMUP_MS = 30_000;
export const COMPARISON_CAPTURE_MS = 60_000;
export type ComparisonCase = Readonly<{ id: string; petId: string; atMs: number; memory: RebootSnapshot }>;
let sequence = 0;
export const newComparisonId = () => `${Date.now().toString(36)}${(++sequence).toString(36)}`;

/** New synthetic owners only. Existing review memories are never read/reset. */
export function makeComparisonCase(id: string, profile: PersonalityId, atMs: number): ComparisonCase {
  if (!/^[a-z0-9]{8,20}$/u.test(id) || !Number.isSafeInteger(atMs) || atMs < 60_000) throw Error('Invalid synthetic comparison');
  const petId = `reboot-04:compare:${id}:${profile}`;
  if (!personalityOwnsPet(profile, petId)) throw Error('Invalid comparison owner');
  const foundation = { ...newPersonality(profile), petId, seed: COMPARISON_SEED };
  const memory: RebootSnapshot = { schemaVersion: 1, petId, revision: 0, hatWorn: false,
    cushion: { x: -1.6, z: .2, revision: 0 }, previewStage: 'baby', personality: foundation, randomState: COMPARISON_SEED,
    events: [
      { kind: 'hand', context: 'hand', itemId: 'user:hand', touchRegion: 'head' },
      { kind: 'hand', context: 'hand', itemId: 'user:hand', touchRegion: 'body' },
      { kind: 'cushion_used', context: 'rest', itemId: 'review:rest-cushion', itemRevision: 0, position: { x: -1.6, z: .2 } },
      { kind: 'personality_scene', context: 'baby_scout', itemId: 'review:personality' },
    ].map((e, i) => ({ ...e, petId, eventId: `${petId}:fixture:${i}`, atMs: atMs - 60_000 + i,
      completed: true, stage: 'baby', origin: 'synthetic_comparison' })) as RebootSnapshot['events'] };
  return { id, petId, atMs, memory };
}

export function comparisonBaseline(c: ComparisonCase) {
  return { protocol: 'REBOOT04_MATCHED_V1', atMs: c.atMs, stage: c.memory.previewStage,
    hat: c.memory.hatWorn, cushion: c.memory.cushion, randomState: c.memory.randomState,
    facts: c.memory.events.map(({ petId: _petId, eventId: _eventId, ...e }) => e),
    appearance: 'quad', size: 1.35, render: 'quality_250', reduced: false,
    observation: 'NORMAL_DIRECTOR_SELECTION', warmupMs: COMPARISON_WARMUP_MS, measureMs: COMPARISON_CAPTURE_MS };
}
