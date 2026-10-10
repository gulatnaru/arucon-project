import { DatabaseSync } from 'node:sqlite';
import type { SqlConnection, SqlExecutor } from '../../src/storage/sqlite';
import { RebootMemoryStore } from '../../src/reboot/memory';
import test from 'node:test';
import assert from 'node:assert/strict';
import { expressPersonality, newPersonality, personalityAddress, PERSONALITY_IDS, personalityPlan, personalitySelection, personalityReachability, validPersonality } from '../../src/reboot/personality';
import { RebootDirector } from '../../src/reboot/director';
import type { RebootEvent, RebootView, RebootFact, RebootIntent } from '../../src/reboot/contracts';
import { BabyGait } from '../../src/reboot/babyGait';
test('continuous pet axes address16 combinations and reject cross-pet/version/nonfinite foundations',()=>{
 const addresses=new Set<number>();for(let i=0;i<16;i++)addresses.add(personalityAddress({approach:i&1?.8:-.8,play:i&2?.7:-.7,company:i&4?.6:-.6,novelty:i&8?.9:-.9}));assert.equal(addresses.size,16);
 for(const id of PERSONALITY_IDS){const x=newPersonality(id);assert.ok(validPersonality(x,x.petId));assert.equal(validPersonality(x,'dev-local-pet-1'),false);assert.equal(validPersonality({...x,version:2},x.petId),false);assert.equal(validPersonality({...x,latent:{...x.latent,approach:NaN}},x.petId),false);}
});
test('each representative has six distinct causal episodes, six touch primitives and six reachable facial expressions',()=>{
 for(const id of PERSONALITY_IDS){const reach=personalityReachability(id);assert.equal(reach.autonomous.length,6);assert.equal(new Set(reach.touch).size,6);const plans=new Set<string>(),faces=new Set<string>();
 for(const k of reach.autonomous){const p=personalityPlan(id,k as RebootIntent,'unknown',[])!;assert.ok(p.beats.length>=3);plans.add(p.beats.map(b=>b.id).join('>'));p.beats.forEach(b=>faces.add(b.expression));}
 for(const region of ['head','body']as const)for(const context of ['baby_scout','baby_discover','rest']as const)personalityPlan(id,'hand',region,[],context,'owned-hand')!.beats.forEach(b=>faces.add(b.expression));
 assert.equal(plans.size,6);assert.ok(faces.size>=6,`${id}:${[...faces]}`);
 // Exercise ordinary context/region/history selection; a listed primitive alone
 // is not proof that normal user inputs can ever select it.
 let seed=42; const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const selected=new Set<string>(), contexts=[undefined,'hand',...reach.autonomous] as (RebootIntent|undefined)[];
 let recent:string[]=[];
 for(let i=0;i<600;i++){
  const region=(['head','body','unknown'] as const)[Math.floor(rand()*3)];
  const p=personalityPlan(id,'hand',region,recent,contexts[Math.floor(rand()*contexts.length)],rand()>.3?'owned-hand':undefined)!;
  assert.ok(!recent.slice(-2).includes(p.touchStyle!));selected.add(p.touchStyle!);recent=[...recent,p.touchStyle!].slice(-3);
 }
 assert.deepEqual([...selected].sort(),[...reach.touch].sort());
 }
 assert.notDeepEqual(personalityPlan('playful','baby_scout','head',[]),personalityPlan('warm','baby_scout','head',[]));
 assert.notDeepEqual(personalityPlan('warm','hand','body',[],'baby_scout'),personalityPlan('poised','hand','body',[],'baby_scout'));
});
test('only varied owned completed experiences influence small expression hints; stable identity and growth interface',()=>{
 const f=newPersonality('warm'),fact=(n:number,petId=f.petId):RebootFact=>({eventId:'event'+n,petId,kind:n<2?'hand':'cushion_used',itemId:n<2?'user:hand':'review:rest-cushion',completed:true,atMs:n,stage:'baby',context:['hand','baby_scout','rest','cushion_changed'][n]as RebootIntent,touchRegion:n?'body':'head',itemRevision:n});
 const before=JSON.stringify(f);const grown=expressPersonality(f,[0,1,2,3].map(n=>fact(n)),'growing');assert.ok(grown.companyHint>0&&grown.noveltyHint>0);assert.equal(JSON.stringify(f),before);assert.equal(grown.maturity,.5);
 assert.equal(expressPersonality(f,[0,1,2,3].map(n=>fact(n,'other')),'baby').companyHint,0);assert.equal(expressPersonality(f,Array.from({length:30},()=>fact(0)),'baby').companyHint,0);
 const a=personalityPlan('warm','hand','head',[])!;const b=personalityPlan('warm','hand','head',[a.touchStyle!])!;assert.notEqual(a.touchStyle,b.touchStyle);
});
test('stateful selection excludes recent two yet retains each family and profile-specific random inputs',()=>{
 for(const id of PERSONALITY_IDS){const f=newPersonality(id),seen=new Set<string>();for(let i=0;i<100;i++){const x=personalitySelection(id,['baby_scout','rest'],i/100,{x:-1.6,z:.2},f.latent);assert.ok(!['baby_scout','rest'].includes(x.kind));seen.add(x.kind);}assert.equal(seen.size,4);}
 assert.notEqual(newPersonality('playful').seed,newPersonality('warm').seed);
});
test('ordinary autonomous director reaches recipes with trace and cancels without completed memory while sleeping',()=>{
 for(const id of PERSONALITY_IDS){let at=1000;const events:RebootEvent[]=[];let moving=false;const f=newPersonality(id),view:RebootView={stage:'baby',revision:0,hatWorn:false,cushion:{x:-1.6,z:.2,revision:0},handOffered:false,babyCharm:true,personality:{foundation:f,axes:f.latent,randomState:f.seed,evidenceIds:[]}};
 const d=new RebootDirector({navigate:()=>{moving=true;return true;},stop:()=>{moving=false;},event:e=>events.push(e)},()=>.5,()=>at);
 for(let i=0;i<2000;i++){at+=50;d.update(.05,{enabled:true,awake:true,moving,touching:false,position:{x:0,z:1.8},view});moving=false;}
 assert.ok(events.filter(e=>e.phase==='complete').length>=6);assert.ok(events.some(e=>e.expression&&e.personalityId===id));assert.ok(events.some(e=>e.randomState!==undefined));
 const count=events.filter(e=>e.phase==='complete').length;d.update(.05,{enabled:true,awake:false,moving:false,touching:true,position:{x:0,z:1.8},view});assert.equal(d.pose,undefined);assert.equal(events.filter(e=>e.phase==='complete').length,count);
 }
});
test('four-paw diagonal support stays planted in world coordinates and settles at stop',()=>{
 const g=new BabyGait([{x:-.265,z:.1,phase:0},{x:.265,z:.1,phase:.5},{x:-.265,z:-.34,phase:.5},{x:.265,z:-.34,phase:0}]);let prev=g.update({position:{x:0,z:0},facing:0,scale:1,dt:.016,moving:true,reduced:false}).feet.map(x=>({...x}));
 for(let i=1;i<50;i++){g.update({position:{x:0,z:i*.01},facing:0,scale:1,dt:.016,moving:true,reduced:false});g.feet.forEach((f,n)=>{if(f.planted&&prev[n].planted){assert.equal(f.x,prev[n].x);assert.equal(f.z,prev[n].z);}});prev=g.feet.map(x=>({...x}));}
 for(let i=0;i<30;i++)g.update({position:{x:0,z:.49},facing:0,scale:1,dt:.016,moving:false,reduced:false});assert.equal(g.feet.length,4);assert.ok(g.feet.every(f=>f.planted&&f.y===0));
});

class DB implements SqlConnection {
  native = new DatabaseSync(':memory:'); tail: Promise<void> = Promise.resolve(); failWrite = false;
  async execAsync(sql: string) { this.native.exec(sql); }
  async runAsync(sql: string, p: readonly (string | number | null)[] = []) {
    if (this.failWrite) { this.failWrite = false; throw new Error('test disk failure'); }
    return this.native.prepare(sql).run(...p);
  }
  async getFirstAsync<T>(sql: string, p: readonly (string | number | null)[] = []) { return this.native.prepare(sql).get(...p) as T ?? null; }
  async getAllAsync<T>(sql: string, p: readonly (string | number | null)[] = []) { return this.native.prepare(sql).all(...p) as T[]; }
  async withExclusiveTransactionAsync<T>(work: (tx: SqlExecutor) => Promise<T>): Promise<T> {
    let release = () => {}; const previous = this.tail; this.tail = new Promise(resolve => { release = resolve; }); await previous;
    this.native.exec('BEGIN IMMEDIATE');
    try { const result = await work(this); this.native.exec('COMMIT'); return result; }
    catch (e) { this.native.exec('ROLLBACK'); throw e; } finally { release(); }
  }
}

test('review repositories preserve three separate foundations/RNG/memories, reject cross-pet and stale writes, and fail closed on disk failure',async()=>{
 const db=new DB(), stores=PERSONALITY_IDS.map(id=>new RebootMemoryStore(db,newPersonality(id).petId,id));
 const initial=await Promise.all(stores.map(s=>s.load()));assert.equal(new Set(initial.map(x=>x.personality!.seed)).size,3);
 const f:RebootFact={petId:initial[0].petId,eventId:'actual-complete',kind:'personality_scene',itemId:'review:personality',atMs:1,completed:true,stage:'baby',context:'baby_scout'};
 await stores[0].complete(f,0,123);
 assert.equal((await stores[1].load()).events.length,0);assert.equal((await stores[2].load()).events.length,0);
 const cold=await new RebootMemoryStore(db,f.petId,'playful').load();assert.equal(cold.randomState,123);assert.deepEqual(cold.personality,initial[0].personality);
 await assert.rejects(stores[1].complete(f,0));assert.equal((await stores[0].complete({...f,eventId:'stale'},0,456)).events.length,1);
 db.failWrite=true;await assert.rejects(stores[0].wear(true));assert.equal((await stores[0].load()).hatWorn,false);
 const legacy=await new RebootMemoryStore(db,'reboot-01:main').load();assert.equal(legacy.personality,undefined);assert.equal(legacy.events.length,0);
});
test('a real short touch can finish its contextual follow-up, but cancel cannot revive it',()=>{
 let at=0;const events:RebootEvent[]=[];const f=newPersonality('playful'),view:RebootView={stage:'baby',revision:0,hatWorn:false,cushion:{x:-1.6,z:.2,revision:0},handOffered:false,babyCharm:true,personality:{foundation:f,axes:f.latent,randomState:f.seed,evidenceIds:[]}};
 const d=new RebootDirector({navigate:()=>true,stop:()=>{},event:e=>events.push(e)},()=>.5,()=>at);
 d.update(.05,{enabled:true,awake:true,moving:false,touching:true,touchRegion:'head',position:{x:0,z:1.8},view});
 for(let i=0;i<65;i++){at+=50;d.update(.05,{enabled:true,awake:true,moving:false,touching:false,position:{x:0,z:1.8},view});}
 assert.ok(events.some(e=>e.babyBeat==='paw_offer'));assert.ok(events.some(e=>e.babyBeat==='paw_flick'));
 d.cancel();const count=events.filter(e=>e.phase==='complete').length;d.update(.1,{enabled:false,awake:true,moving:false,touching:false,position:{x:0,z:1.8},view});assert.equal(events.filter(e=>e.phase==='complete').length,count);
});
