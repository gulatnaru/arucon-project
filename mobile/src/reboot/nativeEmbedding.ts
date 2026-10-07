import { requireOptionalNativeModule } from 'expo';
import { File, Paths } from 'expo-file-system';
import { NATIVE_EMBEDDING_IDENTITY, type RealEmbeddingPort, cosine } from './semantic';
import { evaluateNativeCases } from './evaluation';

type NativeApi = { loadAsync(): Promise<Record<string, unknown>>; embedAsync(texts: readonly string[], requestId: string): Promise<number[][]>; cancel(id: string): void };
let sequence = 0;
export function nativeEmbeddingPort(): { port: RealEmbeddingPort; load: () => Promise<Record<string, unknown>> } | null {
  const api = requireOptionalNativeModule<NativeApi>('AruconEmbedding');
  if (!api) return null;
  return { load: () => api.loadAsync(), port: { identity: NATIVE_EMBEDDING_IDENTITY,
    async embed(texts, signal) {
      if (signal.aborted) throw new Error('Canceled');
      const id = `native-embedding:${Date.now()}:${++sequence}`;
      const cancel = () => api.cancel(id); signal.addEventListener('abort', cancel, { once: true });
      try { const values = await api.embedAsync(texts, id); if (signal.aborted) throw new Error('Canceled'); return values; }
      finally { signal.removeEventListener('abort', cancel); }
    } } };
}

/** Explicit development request file; normal play never invokes this probe. */
export async function runRequestedNativeProbe(): Promise<void> {
  const request = new File(Paths.cache, 'reboot-native-probe-request.json');
  if (!request.exists) return;
  let info: { requestId?: string };
  try { info = JSON.parse(await request.text()); } catch { return; }
  if (!info.requestId || !/^[a-z0-9-]{1,40}$/.test(info.requestId)) return;
  const response = new File(Paths.cache, `reboot-native-probe-${info.requestId}.json`);
  if (response.exists) return;
  try {
    const native = nativeEmbeddingPort(); if (!native) throw new Error('Native module unavailable');
    const load = await native.load(), texts = ['task: search result | query: 새 모자가 낯설어서 이마를 살폈어.',
      'title: none | text: 아루가 처음 모자를 쓰고 이마를 살펴봤다.', 'title: none | text: 쿠션을 오른쪽으로 옮겼다.'];
    const start = performance.now(), controller = new AbortController();
    const v = await native.port.embed(texts, controller.signal);
    const pairMs = performance.now() - start;
    const comparison = await evaluateNativeCases(native.port);
    response.write(JSON.stringify({ status: 'REAL_LOCAL_SIMULATOR_INFERENCE', load, identity: native.port.identity,
      dimensions: v.map(x => x.length), cosine: [cosine(v[0], v[1]), cosine(v[0], v[2])],
      pairMs, comparison, scope: 'Synthetic native system probe, not normal UI/play proof' }, null, 2));
  } catch (e) { response.write(JSON.stringify({ status: 'AI_ADAPTER_BLOCKED', error: String(e), scope: 'Actual native probe failure' }, null, 2)); }
}
