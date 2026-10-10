import type { SqlConnection } from '../storage/sqlite';
import type { FloorPoint } from '../scene/types';
import { newPersonality, validPersonality, type PersonalityId } from './personality';
import { type RebootFact, type RebootSnapshot, type RebootStage } from './contracts';

/** Keep first/latest completed experience per object within the same 64-fact budget.
 * Quiet cushion repeats must not turn a familiar hat into a first encounter.
 * Existing pruned facts are not reconstructed or inferred from ownership. */
function retainExperience(events: RebootFact[]): RebootFact[] {
  if (events.length <= 64) return events;
  const first = new Map<string, RebootFact>(), last = new Map<string, RebootFact>();
  for (const event of events) {
    const key = `${event.kind}:${event.itemId}`;
    if (!first.has(key)) first.set(key, event);
    last.set(key, event);
  }
  const keep = new Set([...first.values(), ...last.values()].map(event => event.eventId));
  for (let i = events.length - 1; i >= 0 && keep.size < 64; i--) keep.add(events[i].eventId);
  return events.filter(event => keep.has(event.eventId));
}

/** Auxiliary experience state; no economic migration and no raw SQLite handle. */
export class RebootMemoryStore {
  constructor(private readonly db: SqlConnection, readonly petId: string, private readonly personalityId?: PersonalityId) {
    if (!(personalityId ? /^reboot-04:(playful|warm|poised)$/u : /^reboot-01:[a-z0-9-]{1,40}$/u).test(petId)) throw new Error('Reboot memory requires an isolated pet');
  }
  private validate(x: RebootSnapshot) {
    if (x.schemaVersion !== 1 || x.petId !== this.petId || !Number.isSafeInteger(x.revision) || x.revision < 0 ||
      (this.personalityId ? !validPersonality(x.personality, this.petId) || x.personality?.profileId !== this.personalityId || !Number.isSafeInteger(x.randomState) || x.randomState! < 0 || x.randomState! > 0xffffffff : x.personality !== undefined) ||
      typeof x.hatWorn !== 'boolean' || !['baby', 'growing', 'evolved'].includes(x.previewStage) ||
      !Number.isSafeInteger(x.cushion.revision) || !Number.isFinite(x.cushion.x) || !Number.isFinite(x.cushion.z) ||
      Math.abs(x.cushion.x) > 2.1 || x.cushion.z < -.9 || x.cushion.z > 3 ||
      !Array.isArray(x.events) || x.events.length > 64 || JSON.stringify(x).length > 32768 || x.events.some(e => e.petId !== this.petId || e.completed !== true ||
        !Number.isSafeInteger(e.atMs) || e.atMs < 0 || !(this.personalityId ? ['hat_used', 'cushion_used', 'hand', 'personality_scene'] : ['hat_used', 'cushion_used', 'hand']).includes(e.kind) ||
        !(this.personalityId ? ['review:pearl-beret', 'review:rest-cushion', 'user:hand', 'review:personality'] : ['review:pearl-beret', 'review:rest-cushion', 'user:hand']).includes(e.itemId) ||
        e.position && (!Number.isFinite(e.position.x) || !Number.isFinite(e.position.z)) ||
        typeof e.eventId !== 'string' || e.eventId.length > 120 || !['baby', 'growing', 'evolved'].includes(e.stage) ||
        e.touchRegion !== undefined && !['head', 'body', 'unknown'].includes(e.touchRegion))) {
      throw new Error('기억 형식을 확인할 수 없어 저장을 보존했어요.');
    }
  }
  async load(): Promise<RebootSnapshot> {
    await this.db.execAsync('CREATE TABLE IF NOT EXISTS reboot_review_memory (pet_id TEXT PRIMARY KEY, snapshot TEXT NOT NULL)');
    const row = await this.db.getFirstAsync<{ snapshot: string }>('SELECT snapshot FROM reboot_review_memory WHERE pet_id=?', [this.petId]);
    const value = row ? (() => { if (row.snapshot.length > 32768) throw new Error('기억이 너무 커 원본을 보존했어요.'); return JSON.parse(row.snapshot); })()
      : this.initial();
    this.validate(value); return value;
  }
  private async mutate(work: (snapshot: RebootSnapshot) => RebootSnapshot): Promise<RebootSnapshot> {
    return this.db.withExclusiveTransactionAsync(async tx => {
      const row = await tx.getFirstAsync<{ snapshot: string }>('SELECT snapshot FROM reboot_review_memory WHERE pet_id=?', [this.petId]);
      const current = row ? JSON.parse(row.snapshot) as RebootSnapshot : await this.initial();
      this.validate(current);
      const next = work(current); this.validate(next);
      if (next === current) return current;
      await tx.runAsync('INSERT INTO reboot_review_memory VALUES (?,?) ON CONFLICT(pet_id) DO UPDATE SET snapshot=excluded.snapshot', [this.petId, JSON.stringify(next)]);
      return next;
    });
  }
  private initial(): RebootSnapshot { return { schemaVersion: 1, petId: this.petId, revision: 0,
    hatWorn: false, cushion: { x: -1.6, z: .2, revision: 0 }, previewStage: 'baby', events: [],
    ...(this.personalityId ? { personality: newPersonality(this.personalityId), randomState: newPersonality(this.personalityId).seed } : {}) }; }
  wear(worn: boolean, expectedRevision?: number) { return this.mutate(x => x.hatWorn === worn || expectedRevision !== undefined && x.revision !== expectedRevision ? x : { ...x, hatWorn: worn, revision: x.revision + 1 }); }
  stage(stage: RebootStage) { return this.mutate(x => x.previewStage === stage ? x : { ...x, previewStage: stage, revision: x.revision + 1 }); }
  moveCushion(at: FloorPoint, expectedRevision?: number) {
    if (!Number.isFinite(at.x) || !Number.isFinite(at.z)) return Promise.reject(new Error('유효한 바닥에 놓아 주세요.'));
    const x = Math.max(-2.1, Math.min(2.1, at.x)), z = Math.max(-.9, Math.min(3, at.z));
    return this.mutate(s => expectedRevision !== undefined && s.revision !== expectedRevision || s.cushion.x === x && s.cushion.z === z ? s : ({ ...s, revision: s.revision + 1, cushion: { x, z, revision: s.cushion.revision + 1 } }));
  }
  complete(event: RebootFact, expectedRevision: number, randomState?: number): Promise<RebootSnapshot> {
    if (event.petId !== this.petId || !event.completed || randomState !== undefined && (!Number.isSafeInteger(randomState) || randomState < 0 || randomState > 0xffffffff)) return Promise.reject(new Error('다른 아이·취소된 사건은 기억하지 않아요.'));
    return this.mutate(x => {
      if (x.revision !== expectedRevision || x.events.some(e => e.eventId === event.eventId)) return x;
      if (event.kind === 'hat_used' && !x.hatWorn || event.kind === 'cushion_used' && event.itemRevision !== x.cushion.revision) return x;
      if (event.kind === 'cushion_used' && (!event.position || event.position.x !== x.cushion.x || event.position.z !== x.cushion.z)) return x;
      return { ...x, revision: x.revision + 1, events: retainExperience([...x.events, event]), ...(this.personalityId && randomState !== undefined ? { randomState } : {}) };
    });
  }
}
