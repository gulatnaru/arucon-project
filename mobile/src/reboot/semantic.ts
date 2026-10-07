import type { RebootSnapshot, RebootFact, RebootIntent } from './contracts';
import { eligibleMemories } from './contracts';

export const EMBEDDING_IDENTITY = Object.freeze({ model: 'google/embeddinggemma-2',
  revision: '914f7f89142e33e77833254d9c9b90c3cef7303b', dimensions: 768, license: 'Apache-2.0' });
export const NATIVE_EMBEDDING_IDENTITY = Object.freeze({ model: 'litert-community/embeddinggemma-2-text-270m-litert-lm',
  revision: '9be6e8b90982095dc05c2bd162e4b954ee4dbac7', dimensions: 768, license: 'Apache-2.0' });
export interface RealEmbeddingPort {
  readonly identity: Readonly<{ model: string; revision: string; dimensions: number; license: string }>;
  embed(texts: readonly string[], signal: AbortSignal): Promise<readonly (readonly number[])[]>;
}
export type RebootDecision = Readonly<{ intentId: RebootIntent; targetId: string; memoryIds: readonly string[];
  reasonCode: 'structured' | 'semantic' | 'fallback'; backend: 'A' | 'B_REAL' | 'A_FALLBACK' }>;

export function cosine(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length || ![128, 256, 512, 768].includes(a.length) ||
    [...a, ...b].some(x => !Number.isFinite(x))) throw new Error('Invalid embedding dimensions or values');
  let aa = 0, bb = 0, ab = 0;
  for (let i = 0; i < a.length; i++) { aa += a[i] * a[i]; bb += b[i] * b[i]; ab += a[i] * b[i]; }
  if (aa < 1e-10 || bb < 1e-10) throw new Error('Empty embedding norm');
  return ab / Math.sqrt(aa * bb);
}
const text = (x: RebootFact) => x.kind === 'hat_used' ? x.context === 'hat_first' ? '처음 이 모자를 쓰고 몇 걸음 걸으며 낯선 모자를 살펴보았다.' : x.context === 'hat_busy' ? '하던 일이 있을 때 이 모자를 쓰고 잠깐 확인했다.' : '이 모자를 다시 쓰고 익숙하게 앞발 인사를 했다.'
  : x.kind === 'cushion_used' ? `이 쿠션의 예전 자리 ${x.position?.x}, ${x.position?.z}에서 쉬었다.` : '내민 손에 다가가 닿았다가 편안히 돌아갔다.';

/** Serial/coalesced event queue. Never runs on a render tick or in SQL. */
export class RebootSemanticQueue {
  private epoch = 0;
  private controller?: AbortController;
  private tail: Promise<void> = Promise.resolve();
  private readonly cache = new Map<string, readonly number[]>();
  constructor(private readonly port: RealEmbeddingPort | null, private readonly timeoutMs = 250) {}
  cancel() { this.epoch++; this.controller?.abort(); }
  async decide(snapshot: RebootSnapshot, itemId: string, allowed: readonly RebootIntent[], base: RebootIntent,
    current: () => { petId: string; revision: number; awake: boolean }): Promise<RebootDecision | null> {
    const valid = () => { const x = current(); return x.petId === snapshot.petId && x.revision === snapshot.revision && x.awake; };
    if (!valid()) return null;
    const memories = eligibleMemories(snapshot, itemId);
    const fallback: RebootDecision = { intentId: base, targetId: itemId, memoryIds: memories.slice(-2).map(x => x.eventId),
      reasonCode: this.port ? 'fallback' : 'structured', backend: this.port ? 'A_FALLBACK' : 'A' };
    if (!allowed.includes(base)) throw new Error('No allowed fallback');
    if (!this.port || !memories.length) return fallback;
    if (![EMBEDDING_IDENTITY, NATIVE_EMBEDDING_IDENTITY].some(x => x.model === this.port!.identity.model && x.revision === this.port!.identity.revision && x.dimensions === this.port!.identity.dimensions)) return { ...fallback, reasonCode: 'fallback', backend: 'A_FALLBACK' };
    this.cancel(); const epoch = this.epoch, controller = new AbortController(); this.controller = controller;
    const work = this.tail.then(async () => {
      if (controller.signal.aborted) return fallback;
      const input = ['task: search result | query: ' + (base === 'hat_busy' ? '하던 일을 멈추지 않고 이 모자를 쓴 경험' : '같은 모자를 다시 쓰고 익숙하게 반응한 경험'), ...memories.map(x => 'title: none | text: ' + text(x))];
      let vectors: readonly (readonly number[])[];
      if (input.every(x => this.cache.has(x))) vectors = input.map(x => this.cache.get(x)!);
      else {
        vectors = await this.port!.embed(input, controller.signal);
        if (vectors.length !== input.length) throw new Error('Embedding count mismatch');
        for (const [i, v] of vectors.entries()) {
          if (v.length !== 768) throw new Error('Unexpected model dimension');
          cosine(v, v); if (!controller.signal.aborted) this.cache.set(input[i], v);
        }
        while (this.cache.size > 64) this.cache.delete(this.cache.keys().next().value!);
      }
      const state = current();
      if (epoch !== this.epoch || controller.signal.aborted || state.petId !== snapshot.petId ||
        state.revision !== snapshot.revision || !state.awake) return null;
      const ranked = memories.map((x, i) => ({ x, score: cosine(vectors[0], vectors[i + 1]) })).sort((a, b) => b.score - a.score);
      // Semantic similarity selects verified memory only. It cannot manufacture
      // an intent/target, change gear coordinates, or issue economic commands.
      return { intentId: base, targetId: itemId, memoryIds: ranked.slice(0, 2).map(x => x.x.eventId), reasonCode: 'semantic' as const, backend: 'B_REAL' as const };
    });
    this.tail = work.then(() => undefined, () => undefined);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try { return await Promise.race([work, new Promise<RebootDecision | null>(resolve => {
      timer = setTimeout(() => { controller.abort(); resolve(valid() ? { ...fallback, reasonCode: 'fallback', backend: 'A_FALLBACK' } : null); }, this.timeoutMs);
    })]); }
    catch { return valid() ? { ...fallback, reasonCode: 'fallback', backend: 'A_FALLBACK' } : null; }
    finally { if (timer) clearTimeout(timer); }
  }
}
