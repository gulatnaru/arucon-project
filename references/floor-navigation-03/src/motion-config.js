/* Presentation-only tuning. These values never advance the domain/game clock. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AruconMotion=api;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const settings=Object.freeze({version:'active-motion-02',walkReserved:1.55,walkExpressive:1.72,turnResponse:12,acceleration:14,arrivalResponse:6,blendSeconds:.14,idleReserved:5.8,idleExpressive:4.3,simulationStep:1/120,maxCatchupSeconds:.12,standardFrameCap:60,lightFrameCap:30,springStiffness:110,springDamping:15});
function clipRate(name,from,to){
 if(name==='sleep')return 1.08;
 if(name==='wake')return 1.25;
 if(name==='eat')return 1.2;
 if(name.endsWith('_greet')&&from===0&&to>=1)return 2.8;
 if(name.endsWith('_ball')&&from===0)return 2.4;
 if(name.endsWith('_touch'))return 1.3;
 if(name.endsWith('_greet')||name.endsWith('_ball'))return 1.6;
 return 1;
}
// Keep phase across skipped callbacks. A 60Hz display is not forced into a 30Hz cadence.
class FramePacer{
 constructor(){this.reset();}
 reset(){this.last=null;this.next=null;this.cap=null;}
 take(now,cap=60){
  if(!Number.isFinite(now))return null;
  const interval=1000/cap;
  if(this.cap!==cap||this.last===null||now<this.last){this.cap=cap;this.last=now;this.next=now+interval;return {elapsedMs:0,dt:0};}
  if(now+.6<this.next)return null;
  const elapsedMs=now-this.last;this.last=now;
  this.next+=Math.max(1,Math.floor((now+.6-this.next)/interval)+1)*interval;
  return {elapsedMs,dt:Math.min(settings.maxCatchupSeconds,Math.max(0,elapsedMs/1000))};
 }
}
return {settings,clipRate,FramePacer};
});
