import fixture from '../../fixtures/reboot-memory-cases.json';
import { cosine, type RealEmbeddingPort } from './semantic';

/** Fixed synthetic cases. Gates are shared by A/B, never model-made facts. */
export async function evaluateNativeCases(port: RealEmbeddingPort) {
  const signal = new AbortController().signal;
  const input = [...fixture.corpus.map(x => 'title: none | text: ' + x.text),
    ...fixture.cases.map(x => 'task: search result | query: ' + x.query)];
  const start = performance.now(), values = await port.embed(input, signal);
  const doc = values.slice(0, fixture.corpus.length), queries = values.slice(fixture.corpus.length);
  const rows = fixture.cases.map((x, i) => {
    const eligible = fixture.corpus.map((m, j) => ({ m, j })).filter(({ m }) => x.gate === 'awake' && m.completed && m.petId === x.petId && m.item === x.item);
    const A = eligible.filter(({ m }) => m.context === x.context).slice(0, 2).map(({ m }) => m.id);
    const B = eligible.map(({ m, j }) => ({ id: m.id, score: cosine(queries[i], doc[j]) })).sort((a, b) => b.score - a.score).slice(0, 2).map(x => x.id);
    return { query: x.query, gate: x.gate, gold: x.gold, A, B };
  });
  const metrics = (key: 'A' | 'B') => {
    const positive = rows.filter(x => x.gold.length);
    return { RecallAt2: positive.reduce((sum, x) => sum + x[key].filter(y => x.gold.includes(y)).length / x.gold.length, 0) / positive.length,
      unnecessaryMemoryUse: rows.filter(x => !x.gold.length && x[key].length).length,
      illegalMemoryUse: rows.reduce((n, x) => n + x[key].filter(id => !fixture.corpus.some(m => m.id === id && m.completed && m.petId === 'main')).length, 0) };
  };
  return { status: 'REAL_NATIVE_SYNTHETIC_AB_24', identity: port.identity, elapsedMs: performance.now() - start,
    A: metrics('A'), B: metrics('B'), rows, scope: 'Shared structured gates; no visual/play/physical-device proof or assumed B superiority' };
}
