const test=require('node:test'),assert=require('node:assert/strict');
const {settings:M,FramePacer,clipRate}=require('../src/motion-config.js');
function drive(hz,cap){const p=new FramePacer(),ticks=[];for(let i=0;i<=hz;i++){const x=p.take(i*1000/hz,cap);if(x)ticks.push(x);}return ticks;}
test('60Hz callbacks keep approximately 60 real updates, not 30',()=>assert.equal(drive(60,60).length,61));
test('120Hz callbacks use a stable 60Hz update cadence',()=>{const t=drive(120,60);assert.equal(t.length,61);assert(t.slice(1).every(x=>Math.abs(x.elapsedMs-1000/60)<.01));});
test('Light mode remains a steady 30Hz on 60Hz displays',()=>{const t=drive(60,30);assert.equal(t.length,31);assert(t.slice(1).every(x=>Math.abs(x.elapsedMs-1000/30)<.01));});
test('Irregular 90Hz callbacks preserve accumulated phase',()=>{const t=drive(90,60);assert.equal(t.length,61);assert(Math.abs(t.reduce((a,b)=>a+b.dt,0)-1)<.001);});
test('A normal slow render frame does not turn 100ms of motion into 50ms',()=>{const p=new FramePacer();p.take(0);assert.equal(p.take(100).dt,.1);});
test('A long stall is capped without advancing the game clock',()=>{const p=new FramePacer();p.take(0);assert.equal(p.take(3000).dt,.12);});
test('Reset avoids a jump on visibility resume',()=>{const p=new FramePacer();p.take(0);p.reset();assert.equal(p.take(800000).dt,0);});
test('Invalid timestamps have no effect',()=>{const p=new FramePacer();assert.equal(p.take(NaN),null);assert.equal(p.take(Infinity),null);});
test('Changing quality resets its own presentation schedule',()=>{const p=new FramePacer();p.take(0);p.take(20);assert.equal(p.take(25,30).dt,0);});
test('Approved mochi stiffness and damping are retained',()=>{assert.equal(M.springStiffness,110);assert.equal(M.springDamping,15);});
test('Both personalities move briskly while still having distinct timing',()=>{assert(M.walkReserved>.92*1.5);assert(M.walkExpressive>1.1*1.5);assert(M.walkExpressive>M.walkReserved);});
test('Tsundere introduction keeps a glance while shortening the long delay',()=>{const wait=1.35/clipRate('tsundere_greet',0,1.35);assert(wait>.25&&wait<.55);});
test('Sleep is not globally sped up like a greeting',()=>assert(clipRate('sleep',0,3.4)<clipRate('tsundere_greet',0,1.35)));
