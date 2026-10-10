import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { makeComparisonCase, comparisonBaseline } from '../../src/reboot/comparison';
import { PERSONALITY_IDS, validPersonality } from '../../src/reboot/personality';
import { RebootMemoryStore } from '../../src/reboot/memory';
import { ComparisonWindow } from '../../src/scene/comparisonWindow';
import { RoomPerformanceProbe } from '../../src/scene/performanceProbe';
import { RafGate } from '../../src/scene/lifecycle';
import type { SqlConnection, SqlExecutor } from '../../src/storage/sqlite';

class Db implements SqlConnection {
  native = new DatabaseSync(':memory:');
  async execAsync(s:string){this.native.exec(s);}
  async runAsync(s:string,p:readonly(string|number|null)[]=[]){return this.native.prepare(s).run(...p);}
  async getFirstAsync<T>(s:string,p:readonly(string|number|null)[]=[]){return this.native.prepare(s).get(...p) as T??null;}
  async getAllAsync<T>(s:string,p:readonly(string|number|null)[]=[]){return this.native.prepare(s).all(...p) as T[];}
  async withExclusiveTransactionAsync<T>(f:(x:SqlExecutor)=>Promise<T>){this.native.exec('BEGIN IMMEDIATE');try{const x=await f(this);this.native.exec('COMMIT');return x;}catch(e){this.native.exec('ROLLBACK');throw e;}}
}

test('matched cases vary only profile/owner while conditions, experiences and random inputs match',()=>{
  const cases=PERSONALITY_IDS.map(id=>makeComparisonCase('mr1234567',id,2_000_000));
  assert.deepEqual(comparisonBaseline(cases[0]),comparisonBaseline(cases[1]));assert.deepEqual(comparisonBaseline(cases[1]),comparisonBaseline(cases[2]));
  assert.equal(new Set(cases.map(x=>x.petId)).size,3);assert.equal(new Set(cases.map(x=>JSON.stringify(x.memory.personality!.latent))).size,3);
  for(const x of cases){assert.ok(validPersonality(x.memory.personality,x.petId));assert.equal(x.memory.events.length,4);assert.ok(x.memory.events.every(e=>e.origin==='synthetic_comparison'&&e.petId===x.petId));}
  assert.equal(validPersonality(cases[0].memory.personality,cases[1].petId),false);assert.throws(()=>makeComparisonCase('bad','warm',2_000_000));
});
test('synthetic seed cannot reset a real review owner or overwrite an existing comparison history',async()=>{
 const db=new Db(),real=new RebootMemoryStore(db,'reboot-04:playful','playful');const original=await real.load();
 const c=makeComparisonCase('mr1234567','playful',2_000_000);assert.throws(()=>new RebootMemoryStore(db,'reboot-04:playful','playful',c.memory));
 const store=new RebootMemoryStore(db,c.petId,'playful',c.memory);assert.deepEqual(await store.load(),c.memory);const changed=await store.wear(true);
 const reloaded=await new RebootMemoryStore(db,c.petId,'playful',{...c.memory,revision:99}).load();assert.deepEqual(reloaded,changed);assert.deepEqual(await real.load(),original);
});
test('warmup uses readiness and monotonic time; scene selection begins only after the full window',()=>{
 const w=new ComparisonWindow('case');assert.equal(w.step(0,0,false,true),undefined);assert.equal(w.actorEnabled,false);
 assert.equal(w.step(10,100,true,true)?.phase,'warmup');assert.equal(w.step(30009,30100,true,true),undefined);assert.equal(w.actorEnabled,false);
 assert.equal(w.step(30010,30100,true,true)?.phase,'measure');assert.equal(w.actorEnabled,true);assert.equal(w.finish(90100)?.phase,'complete');assert.equal(w.finish(90101),undefined);
});
test('an interrupted warmup or measurement cannot silently restart/complete',()=>{
 const w=new ComparisonWindow('abort');w.step(0,0,true,true);assert.equal(w.step(900,900,true,false)?.phase,'interrupted');assert.equal(w.actorEnabled,false);assert.equal(w.step(99999,99999,true,true),undefined);assert.equal(w.finish(99999),undefined);
});
test('head reservation keeps one pending callback and lifecycle cancellation rejects stale delivery',()=>{
 const pending=new Map<number,FrameRequestCallback>();let n=0,count=0;const cancelled:number[]=[];
 const g=new RafGate(cb=>{pending.set(++n,cb);return n;},id=>{cancelled.push(id);pending.delete(id);});
 const tick:FrameRequestCallback=()=>{count++;assert.ok(g.schedule(tick));assert.equal(g.schedule(tick),false);};g.resume(tick);const first=pending.get(1)!;pending.delete(1);first(1);assert.equal(count,1);assert.equal(pending.size,1);const stale=pending.get(2)!;g.stop();stale(2);assert.equal(count,1);assert.deepEqual(cancelled,[2]);
});
test('phase probes distinguish decision, transform, GL presentation and frame scheduler wait without changing budgets',()=>{
 let t=0;const p=new RoomPerformanceProbe('quality_250',()=>t);p.beginCapture();
 for(let i=0;i<20;i++){t+=50;p.recordRaf(t);p.recordPhase('decision',.1);p.recordPhase('pose',.5);p.recordPhase('present',.3);p.recordPhase('frameWork',20);p.recordPhase('frameIdle',30);p.recordSubmission(t);}
 t=60000;const r=p.finishCaptureIfDue()!;assert.equal(r.summary.phaseCost.decision.p95Ms,.1);assert.equal(r.summary.phaseCost.frameIdle.p95Ms,30);assert.equal(r.summary.jsRafInterval.status,'fail');assert.equal(r.summary.budgets.jsRafIntervalP95Ms,33.34);
});
