const test=require('node:test'),assert=require('node:assert/strict');
const N=require('../src/navigation.js'),E=require('../src/engine.js'),C=require('../src/config.js'),{Session,KEY}=require('../src/session.js');
const bounds={x:[-2.45,2.45],z:[-4.05,8.45]},obs=[{x:2.28,z:.1,rx:1.12,rz:.89},{x:-2.05,z:.2,rx:1.16,rz:1.03},{x:-2.8,z:-3.65,rx:.78,rz:.8}];
function fixture(){const storage={d:{},getItem(k){return this.d[k]??null},setItem(k,v){this.d[k]=v}};const make=()=>new Session({engine:E,config:C,storage,now:()=>1e9,prefix:'floor-test'});return {storage,make};}
for(const [name,end] of [['front beyond rug',[0,7]],['back toward window',[0,-3.8]],['left aisle',[-2.3,4.8]],['right aisle',[2.3,6]]])test('Reach '+name+' with collision-free route',()=>{let a=[0,1.8];const path=N.route(a,end,bounds,obs);assert(path.length);for(const b of path){assert(N.clearLine(a,b,bounds,obs));a=b;}assert(Math.hypot(a[0]-end[0],a[1]-end[1])<1e-8);});
test('Front-to-back path avoids both furniture and plant',()=>{let a=[-2.3,7],p=N.route(a,[-2.2,-3.8],bounds,obs);assert(p.length);for(const b of p){assert(N.clearLine(a,b,bounds,obs));a=b;}});
test('Edge target resolves to an inset point instead of disappearing',()=>{assert.deepEqual(N.nearestFreePoint([20,20],bounds,obs),[2.45,8.45]);});
test('Plant footprint resolves to adjacent empty floor',()=>{const p=N.nearestFreePoint([-2.3,-3.6],bounds,obs);assert(p);assert(N.clearPoint(p,bounds,obs));});
test('Furniture footprint resolves deterministically',()=>{const a=N.nearestFreePoint([2.28,.1],bounds,obs);assert(N.clearPoint(a,bounds,obs));assert.deepEqual(a,N.nearestFreePoint([2.28,.1],bounds,obs));});
test('Invalid input is rejected before route search',()=>{for(const p of [[NaN,0],[Infinity,0],null]){assert.equal(N.nearestFreePoint(p,bounds,obs),null);assert.deepEqual(N.route([0,2],p,bounds,obs),[]);}});
test('Blocked room returns no reachable endpoint',()=>{assert.equal(N.nearestFreePoint([0,0],{x:[-1,1],z:[-1,1]},[{x:0,z:0,rx:10,rz:10}]),null);});
test('New outer-floor position round trips without resetting domain',()=>{const f=fixture(),a=f.make();a.command('activity',{totalSteps:1000});a.setPosition({x:1.2,y:0,z:7,yaw:.4});a.save();const b=f.make();assert.deepEqual(b.position,a.position);assert.deepEqual(b.state,a.state);assert.equal(b.ackMeal,a.ackMeal);});
test('Existing version-1 rug position remains compatible',()=>{const f=fixture(),a=f.make();a.setPosition({x:1,y:0,z:1.8,yaw:0});a.save();assert.deepEqual(f.make().position,a.position);assert.equal(JSON.parse(f.storage.d[KEY]).version,1);});
test('Out-of-room position rejected independently of valid game save',()=>{const f=fixture(),a=f.make();a.setPosition({x:0,y:0,z:999,yaw:0});a.save();const b=f.make();assert.equal(b.position,null);assert.deepEqual(b.state,a.state);});
test('Same-floor nearest point leaves valid endpoints unchanged',()=>{for(const p of [[0,7],[0,-3.8],[1.2,6]])assert.deepEqual(N.nearestFreePoint(p,bounds,obs),p);});
