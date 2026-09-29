import type { SqlConnection } from '../storage/sqlite';
import { emptyLifeMemory, LIFE_LINES, type LifeMemory } from './content';

/** Optional presentation history, separate from economic ledgers and schema version. */
export class LifeMemoryStore {
  private tail: Promise<void> = Promise.resolve();
  constructor(private readonly db: SqlConnection, private readonly petId: string) {}
  async load(): Promise<LifeMemory> {
    await this.db.execAsync('CREATE TABLE IF NOT EXISTS living_memory (pet_id TEXT PRIMARY KEY, snapshot TEXT NOT NULL)');
    const row = await this.db.getFirstAsync<{ snapshot: string }>('SELECT snapshot FROM living_memory WHERE pet_id = ?', [this.petId]);
    if (!row) return emptyLifeMemory(this.petId);
    if (row.snapshot.length > 16_384) throw new Error('생활 기억 크기가 한도를 넘어 원본을 보존했어요.');
    const value = JSON.parse(row.snapshot) as LifeMemory;
    this.validate(value);
    return value;
  }
  private validate(value: LifeMemory) {
    if (value.schemaVersion !== 1 || value.petId !== this.petId || !Array.isArray(value.shown) || value.shown.length > 48 ||
      !Array.isArray(value.completed) || value.completed.length > 32 || !Number.isSafeInteger(value.lastAutomaticAtMs) || value.lastAutomaticAtMs < 0 ||
      value.completed.some(x => !Object.hasOwn(LIFE_LINES, x.scene) || !Number.isSafeInteger(x.atMs) || x.atMs < 0) ||
      value.shown.some(x => typeof x.id !== 'string' || x.id.length > 100 || !Number.isSafeInteger(x.atMs) || x.atMs < 0)) {
      throw new Error('생활 기억 형식을 확인할 수 없어 원본을 보존했어요.');
    }
  }
  save(value: LifeMemory) {
    this.validate(value);
    const snapshot = JSON.stringify(value);
    const work = this.tail.then(() => this.db.runAsync('INSERT INTO living_memory (pet_id, snapshot) VALUES (?, ?) ON CONFLICT(pet_id) DO UPDATE SET snapshot = excluded.snapshot', [this.petId, snapshot])).then(() => undefined);
    this.tail = work.catch(() => undefined);
    return work;
  }
}
