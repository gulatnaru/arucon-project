import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import type { SqlConnection, SqlExecutor } from '../../src/storage/sqlite';
import { RebootMemoryStore } from '../../src/reboot/memory';
import { RebootDirector, type RebootWorld } from '../../src/reboot/director';
import type { RebootEvent } from '../../src/reboot/contracts';
import { newPersonality, PERSONALITY_IDS } from '../../src/reboot/personality';
import { acknowledgeContext, emptyContextHistory, evaluateLifeContext, syntheticLifeContext, type LifeContext } from '../../src/reboot/lifeContext';
import { BubbleReadingClock, measuredSpeechWidth, speechReadingMs } from '../../src/presentation/bubbleReading';

test('unknown, failed, delayed, morning, missing reference and stale input never become activity/sleep deficit', () => {
  for (const name of ['missing', 'delayed', 'failed', 'permission', 'morning'] as const) {
    const c = syntheticLifeContext(name, 0); assert.equal(evaluateLifeContext(c, emptyContextHistory(), 'playful', c.queriedAtMs).cue, undefined);
  }
  const c = syntheticLifeContext('remaining', 0), evaluate = (x: LifeContext, at = x.queriedAtMs) => evaluateLifeContext(x, emptyContextHistory(), 'warm', at);
  for (const x of [{ ...c, personalGoal: undefined }, { ...c, observedSteps: undefined }, { ...c, observedSteps: -1 },
    { ...c, evidence: [] }, { ...c, source: 'real' } as unknown as LifeContext, { ...c, queriedAtMs: c.endMs - 1 }]) assert.equal(evaluate(x).cue, undefined);
  assert.equal(evaluate(c, c.queriedAtMs + 21 * 60_000).cue, undefined);
});
test('self report, short duration, goal and completed running have distinct meanings and care precedes invitation', () => {
  for (const [name, intent] of [['reported_sleep', 'care_reported'], ['short_sleep', 'care_recorded'], ['goal', 'goal'], ['run', 'run'], ['remaining', 'invite'], ['rest', 'rest']] as const) {
    const c = syntheticLifeContext(name, 0), cue = evaluateLifeContext(c, emptyContextHistory(), 'warm', c.queriedAtMs).cue!; assert.equal(cue.intent, intent);
    if (name === 'short_sleep') assert.ok(!/피곤|못 잤|질병/.test(cue.text));
  }
  const c = syntheticLifeContext('remaining', 0), combined = { ...c, completedRun: c.evidence[0] };
  assert.equal(evaluateLifeContext(combined, emptyContextHistory(), 'poised', c.queriedAtMs).cue?.intent, 'run');
});
test('same facts keep three stable identities while speech and causal body plans differ; no body shaming/pressure', () => {
  for (const name of ['remaining', 'reported_sleep', 'goal'] as const) {
    const c = syntheticLifeContext(name, 0), cues = PERSONALITY_IDS.map(p => evaluateLifeContext(c, emptyContextHistory(), p, c.queriedAtMs).cue!);
    assert.equal(new Set(cues.map(x => x.text)).size, 3); assert.equal(new Set(cues.map(x => JSON.stringify(x.plan))).size, 3);
    for (const cue of cues) { assert.ok(cue.plan.beats.some(x => x.id === cue.speechBeat)); assert.ok(!/살찐|뚱|체중|몸무게|게으|왜 안|벌점|운동 안/.test(cue.text)); }
  }
});
test('rest choice, sleep concern, topic reduction and daily limits survive revisions without inventing a rest choice', () => {
  const c = syntheticLifeContext('remaining', 0), cue = evaluateLifeContext(c, emptyContextHistory(), 'playful', c.queriedAtMs).cue!;
  let h = acknowledgeContext(emptyContextHistory(), cue, c.queriedAtMs);
  assert.equal(evaluateLifeContext({ ...c, revision: 2 }, h, 'playful', c.queriedAtMs).reason, 'ALREADY_ACKNOWLEDGED_EVENT');
  const changed = { ...c, eventId: 'synthetic:other:0', queriedAtMs: c.queriedAtMs + 15 * 60_000 };
  assert.equal(evaluateLifeContext(changed, h, 'playful', changed.queriedAtMs).reason, 'REST_OR_INVITE_LIMIT');
  const sleep = syntheticLifeContext('reported_sleep', 0); h = acknowledgeContext(emptyContextHistory(), evaluateLifeContext(sleep, emptyContextHistory(), 'warm', sleep.queriedAtMs).cue!, sleep.queriedAtMs);
  assert.equal(h.rested, false); assert.equal(h.avoidInvites, true);
  assert.equal(evaluateLifeContext(changed, h, 'warm', changed.queriedAtMs).cue, undefined);
  const rest = syntheticLifeContext('rest', 0); h = acknowledgeContext(h, evaluateLifeContext(rest, h, 'warm', rest.queriedAtMs).cue!, rest.queriedAtMs); assert.equal(h.rested, true);
  const next = syntheticLifeContext('remaining', 1); assert.equal(evaluateLifeContext(next, h, 'warm', next.queriedAtMs).cue?.intent, 'invite');
  assert.equal(evaluateLifeContext(next, { ...h, lessTalk: true }, 'warm', next.queriedAtMs).cue, undefined);
});

class DB implements SqlConnection {
  native = new DatabaseSync(':memory:'); tail = Promise.resolve(); fail = false;
  async execAsync(s: string) { this.native.exec(s); }
  async runAsync(s: string, p: readonly (string | number | null)[] = []) { if (this.fail) { this.fail = false; throw Error('injected disk failure'); } return this.native.prepare(s).run(...p); }
  async getFirstAsync<T>(s: string, p: readonly (string | number | null)[] = []) { return this.native.prepare(s).get(...p) as T ?? null; }
  async getAllAsync<T>(s: string, p: readonly (string | number | null)[] = []) { return this.native.prepare(s).all(...p) as T[]; }
  async withExclusiveTransactionAsync<T>(f: (tx: SqlExecutor) => Promise<T>) { let release = () => {}; const before = this.tail; this.tail = new Promise<void>(r => { release = r; }); await before;
    this.native.exec('BEGIN IMMEDIATE'); try { const x = await f(this); this.native.exec('COMMIT'); return x; } catch (e) { this.native.exec('ROLLBACK'); throw e; } finally { release(); } }
}
test('concurrent same-event claims and cold restart speak at most once; failure rolls back without economic tables', async () => {
  const db = new DB(), f = newPersonality('playful'), store = new RebootMemoryStore(db, f.petId, 'playful'), c = syntheticLifeContext('goal', 0);
  const before = await store.load(); db.fail = true; await assert.rejects(store.claimLifeContext(c, c.queriedAtMs)); assert.deepEqual(await store.load(), before);
  const results = await Promise.all(Array.from({ length: 20 }, () => store.claimLifeContext(c, c.queriedAtMs))); assert.equal(results.filter(x => x.cue).length, 1);
  const cold = new RebootMemoryStore(db, f.petId, 'playful'); assert.equal((await cold.claimLifeContext(c, c.queriedAtMs)).cue, undefined);
  const next = await cold.load(); assert.deepEqual(next.events, before.events); assert.deepEqual(next.personality, before.personality); assert.equal(next.cushion.revision, before.cushion.revision);
  assert.deepEqual(db.native.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(x => x.name), ['reboot_review_memory']);
  const other = new RebootMemoryStore(db, newPersonality('warm').petId, 'warm'); assert.ok((await other.claimLifeContext(c, c.queriedAtMs)).cue);
});
test('malformed auxiliary history fails closed and leaves the stored snapshot unchanged', async () => {
  const db = new DB(), f = newPersonality('warm'), s = new RebootMemoryStore(db, f.petId, 'warm'), before = await s.load();
  const raw = JSON.stringify({ ...before, lifeContext: { ...emptyContextHistory(), seen: { 'foreign-real-health': 1 } } });
  db.native.prepare('INSERT INTO reboot_review_memory VALUES (?,?)').run(f.petId, raw);
  await assert.rejects(s.load()); assert.equal(db.native.prepare('SELECT snapshot FROM reboot_review_memory WHERE pet_id=?').get(f.petId)!.snapshot, raw);
});
test('quiet sleep consideration is durably acknowledged and cannot later become an invitation', async () => {
  const db = new DB(), f = newPersonality('warm'), s = new RebootMemoryStore(db, f.petId, 'warm');
  await s.load();
  const goal = syntheticLifeContext('goal', 0); await s.claimLifeContext(goal, goal.queriedAtMs);
  const sleep = syntheticLifeContext('short_sleep', 0), quiet = await s.claimLifeContext(sleep, sleep.queriedAtMs);
  assert.equal(quiet.cue, undefined); assert.equal(quiet.memory.lifeContext!.avoidInvites, true); assert.equal(quiet.memory.lifeContext!.rested, false);
  const invite = syntheticLifeContext('remaining', 0, 15); assert.equal((await s.claimLifeContext(invite, invite.queriedAtMs)).cue, undefined);
});
test('normal director executes one coherent context cue and cancellation/generation changes never revive it', () => {
  for (const p of PERSONALITY_IDS) {
    const c = syntheticLifeContext('reported_sleep', 0), cue = evaluateLifeContext(c, emptyContextHistory(), p, c.queriedAtMs).cue!, f = newPersonality(p), events: RebootEvent[] = [];
    const world: RebootWorld = { enabled: true, awake: true, touching: false, moving: false, position: { x: 0, z: 2.5 }, view: { stage: 'baby', babyCharm: true, revision: 1, hatWorn: false, handOffered: false,
      cushion: { x: -1, z: .2, revision: 0 }, contextGeneration: 1, personality: { foundation: f, axes: f.latent, randomState: f.seed, evidenceIds: [] },
      command: { token: 'context', kind: 'life_context', sourceRevision: 1, contextGeneration: 1, contextCue: cue } } };
    const d = new RebootDirector({ navigate: () => true, stop: () => {}, event: e => events.push(e) });
    for (let i = 0; i < 220; i++) d.update(.05, world);
    assert.equal(events.filter(e => e.token === 'context' && e.phase === 'complete').length, 1);
    assert.ok(events.some(e => e.token === 'context' && e.phase === 'contact' && e.babyBeat === cue.speechBeat && e.expression === 'content'));
    world.view = { ...world.view, contextGeneration: 2, command: { ...world.view.command!, token: 'late', contextGeneration: 1 } };
    d.update(.05, world); assert.equal(events.some(e => e.token === 'late'), false);
    world.view = { ...world.view, command: { ...world.view.command!, token: 'current', contextGeneration: 2 } }; d.update(.05, world); world.enabled = false; d.update(.05, world);
    assert.equal(d.pose, undefined); assert.ok(events.some(e => e.token === 'current' && e.phase === 'cancel'));
  }
});
test('reading pause handles nested long-press/accessibility holds and replacement safely; measured glyph widths vary', () => {
  const c = new BubbleReadingClock(5000, 0); c.hold('press', 1000); c.hold('focus', 2000); assert.equal(c.remainingMs(20000), 4000);
  c.release('press', 20000); assert.equal(c.paused, true); c.release('focus', 22000); assert.equal(c.remainingMs(23000), 3000);
  c.release('already-released', 24000); assert.equal(c.remainingMs(24000), 2000);
  assert.equal(measuredSpeechWidth([{ width: 28 }], 280), 54); assert.equal(measuredSpeechWidth([{ width: 150 }, { width: 40 }], 280), 280);
  assert.equal(measuredSpeechWidth([{ width: 150 }], 280), 176);
  assert.equal(measuredSpeechWidth([{ width: 430 }], 240), 240); assert.ok(speechReadingMs('긴 한국어를 천천히 읽어도 괜찮아요. 🐾') > speechReadingMs('히히!'));
});
