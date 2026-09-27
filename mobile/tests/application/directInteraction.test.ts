import test from 'node:test';
import assert from 'node:assert/strict';
import { petBubbleBounds } from '../../src/scene/projectedHits';
import { ReactionRuntime } from '../../src/presentation/reactionRuntime';
import { emptyReactionMemory } from '../../src/reactions';

test('speech stays within actual control boundaries on small/large-text layouts', () => {
  for (const width of [320, 390, 768]) for (const y of [150, 350, 550]) {
    const bounds = petBubbleBounds({x: width-10, y},width,120,600,160);
    assert.ok(bounds.left>=12 && bounds.left+bounds.width<=width-12);
    assert.ok(bounds.top>=128 && bounds.top+160<=592);
    assert.ok(bounds.tailLeft>=16 && bounds.tailLeft<=bounds.width-28);
  }
  assert.equal(petBubbleBounds({x:160,y:300},320,200,240,160).maxHeight,24);
});

test('normal repeated petting offers varied complete scenes and choices without developer replay', () => {
  let time = 1000;
  const runtime = new ReactionRuntime({memory:emptyReactionMemory('pet'),now:()=>time,random:()=>0,
    onCommands:()=>{},schedule:()=>0 as unknown as ReturnType<typeof setTimeout>,clearSchedule:()=>{}});
  const seen=new Set<string>();
  for(let i=0;i<12;i++) {
    const result=runtime.start({petId:'pet',trigger:'petting',personality:'reserved',growthStage:1,
      domainState:{sleeping:false,hibernating:false,condition:'well',cleanliness:'clean'},affordances:['toilet'],touchTarget:'unknown'});
    assert.ok(result); seen.add(result.selection.reaction.family); time+=1000;
  }
  assert.ok(seen.size>=5, `ordinary pet input reached only ${[...seen]}`);
  assert.ok(seen.has('petting.companion_choice'));
  runtime.dispose();
});
