/* Motion-02 GLB connected to world-space locomotion and authored furniture docks.
 * This renderer never modifies inventory, EXP, stamina, or game sleep state.
 */
(function(root){'use strict';
const G=root.RoomGL, A=root.AruconPetAsset, N=root.AruconNavigation, M=root.AruconMotion.settings;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,t)=>{let q=clamp((t-a)/(b-a),0,1);return q*q*(3-2*q);};
const pulse=(t,a,b,c,d)=>smooth(a,b,t)*(1-smooth(c,d,t));
const turn=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
class Actor{
 constructor(scene,asset,{onDone=()=>{},onState=()=>{},reduced=false}={}){
  this.s=scene;this.a=asset;this.L=scene.layout;this.onDone=onDone;this.onState=onState;this.reduced=reduced;
  this.scale=this.L.petScale;this.x=0;this.y=0;this.z=1.8;this.yaw=-.06;this.profile='reserved';
  this.time=0;this.idleTime=0;this.age=0;this.walkClock=0;this.walkSpeed=0;this.plan=[];this.step=null;this.action='idle';this.phase='느긋한 하루';this.pending=null;this.wander=0;
  this.holding=false;this.press=0;this.pressVelocity=0;this.petSide=1;this.postTouch=0;this.pressAge=0;this.lastPose=null;this.blend=null;this.lastSample='';
  // Dock points use the unchanged GLB's mouth/paw locations; furniture heights are adapted to the pet, not vice versa.
  this.dock={table:{x:this.L.table[0]-.086,z:this.L.table[2]-.82,y:0,yaw:0},cushion:{x:this.L.cushion[0],z:this.L.cushion[2],y:.31,yaw:0}};
  scene.root.add(asset.wrap);asset.wrap.s=[this.scale,this.scale,this.scale];
 }
 get busy(){return ['feed','sleep','wake'].includes(this.action);}
 get idle(){return this.action==='idle';}
 get active(){return !['idle','ambient','move','sleeping','hibernating'].includes(this.action);}
 setProfile(p){this.profile=p==='expressive'?'expressive':'reserved';}
 obstacles(){const L=this.L;return [{x:L.plant[0],z:L.plant[2],rx:.78,rz:.80},{x:L.table[0],z:L.table[2],rx:1.12,rz:.89},{x:L.cushion[0],z:L.cushion[2],rx:1.16,rz:1.03},...(this.s.toilet.visible?[{x:L.toilet[0],z:L.toilet[2],rx:.85,rz:.85}]:[])];}
 snapshot(){return {weights:this.a.parts.map(p=>new Float32Array(p.weights)),nodes:this.a.nodes.map(n=>({p:n.p.slice(),r:n.r.slice()}))};}
 setReduced(v){this.reduced=!!v;if(v){this.holding=false;this.press=this.pressVelocity=0;this.postTouch=0;if(['ambient','move','pet','greet','ball','cushion'].includes(this.action))this.cancel();}}
 cancel(){this.plan=[];this.step=null;this.pending=null;this.holding=false;this.postTouch=0;this.action='idle';this.age=0;this.idleTime=0;this.walkSpeed=0;this.blend={source:this.snapshot(),t:0};}
 start(action,steps,done=null){this.cancel();this.action=action;this.plan=steps;this.pending=done;this.next();return true;}
 next(){const previous=this.step;this.step=this.plan.shift()||null;const through=previous?.type==='move'&&this.step?.type==='move';if(!through){this.blend={source:this.snapshot(),t:0};this.walkSpeed=0;}this.age=0;
  if(this.step){this.step.start=[this.x,this.y,this.z];this.step.yawStart=this.yaw;this.step.distance=Math.hypot((this.step.x??this.x)-this.x,(this.step.z??this.z)-this.z);this.onState(this.step.label||this.step.type);}
  else{const old=this.action,done=this.pending;this.pending=null;this.action=old==='sleep'?'sleeping':old==='wake'?'idle':old==='cushion'?'idle':'idle';this.idleTime=0;if(done)this.onDone(done);}
 }
 clip(name,from,to,label,face=0){return {type:'clip',clip:name,from,to,duration:(to-from)/root.AruconMotion.clipRate(name,from,to),label,face};}
 go(x,z,y=0,label='작은 발로 다가오는 중',dock=false){return {type:'move',x,z,y,label,dock};}
 exitDock(){const k=this.dock.cushion;if(this.y>.05)return [this.go(k.x,1.40,0,'쿠션에서 내려오는 중',true)];const t=this.dock.table;if(Math.hypot(this.x-t.x,this.z-t.z)<.35)return [this.go(t.x,-1.05,0,'식탁에서 한 발 물러나는 중',true)];return [];}
 route(x,z){const depart=this.exitDock(),start=depart.length?[depart[depart.length-1].x,depart[depart.length-1].z]:[this.x,this.z];const path=N.route(start,[x,z],this.L.bounds,this.obstacles());return [...depart,...path.map(p=>this.go(p[0],p[1]))];}
 idleClip(){return 'idle_'+this.profile;}
 request(action,opts={}){
  if(this.busy||(['sleeping','hibernating'].includes(this.action)&&action!=='wake'))return false;
  const q=this.profile==='expressive',t=this.dock.table,k=this.dock.cushion,pre=q?'honest':'tsundere';
  if(action==='move'){
   const path=this.route(opts.x,opts.z);if(!path.length)return false;
   return this.start(action,[this.clip(pre+'_greet',0,q?.20:.55,q?'먼저 바라보기':'눈만 힐끗',this.yaw),...path,this.clip(this.idleClip(),0,.40,'그 자리에 머무는 중',-.06)],action);
  }
  if(action==='greet')return this.start(action,[this.clip(pre+'_greet',0,q?.35:1.35,q?'반가워':'딴청을 피우는 중',0),...this.route(q?-.10:.35,q?3.15:2.98),this.clip(pre+'_greet',q?2.1:4.1,q?4.8:6.4,q?'좋아하는 티를 내는 중':'눈은 피하고 곁에 머무는 중',0)],action);
  if(action==='feed'){
   this.s.food.visible=true;this.s.food.s=[1,1,1];
   return this.start(action,[this.clip(pre+'_greet',0,q?.18:.42,'그릇을 바라보는 중',0),...this.route(t.x,-1.12),this.go(t.x,t.z,0,'그릇 앞에 자리 잡는 중',true),this.clip(this.idleClip(),0,.35,'그릇 앞에 멈추기',0),this.clip('eat',0,3,'식탁에서 냠냠',0),this.clip(pre+'_greet',q?2.1:4.7,q?2.8:5.4,q?'잘 먹었어':'… 남기면 아깝잖아',0)],action);
  }
  if(action==='sleep'||action==='cushion')return this.start(action,[this.clip(pre+'_greet',0,q?.20:.55,'쿠션을 바라보는 중',0),...this.route(k.x,1.38),this.go(k.x,k.z,k.y,'쿠션에 올라앉는 중',true),this.clip('sleep',0,3.4,action==='sleep'?'몸을 낮추고 잠드는 중':'잠깐 편히 쉬는 중',0),...(action==='cushion'?[{type:'clip',clip:'sleep',from:3.4,to:3.4,duration:1.5,label:'잠깐 몸을 맡기는 중',face:0},this.clip('wake',0,2.2,'천천히 몸을 펴는 중',0)]:[])],action);
  if(action==='wake')return this.start(action,[this.clip('wake',0,2.2,'눈을 뜨고 몸을 펴는 중',0),this.go(k.x,1.38,0,'쿠션에서 내려오는 중',true),this.clip(this.idleClip(),0,.35,'다시 느긋하게',0)],action);
  if(action==='ball'){
   const b=this.s.ball.p.slice(),x=b[0]-.58,z=b[2]-.30;
   return this.start(action,[this.clip(pre+'_ball',0,q?.25:1.2,q?'공이다':'한 번만이라는 눈',.22),...this.route(x,z),{...this.clip(pre+'_ball',q?1.8:3,q?3.1:4.35,'공을 툭 굴려주는 중',.85),roll:true,ballStart:b},...this.route(x+.28,z+.20),this.clip(pre+'_greet',q?2.1:4.6,q?3.1:6.0,'슬쩍 다음 놀이를 준비하는 중',0)],action);
  }
  if(action==='pet'){return this.start(action,[this.clip(pre+'_touch',0,q?4.8:6.8,'몸은 손 쪽으로 기울기',0)],action);}
  return false;
 }
 beginPress(side=1){if(this.busy||['sleeping','hibernating'].includes(this.action))return false;this.cancel();this.action='pet';this.holding=true;this.pressAge=0;this.petSide=side<0?-1:1;return true;}
 releasePress(cancelled=false){if(!this.holding)return;this.holding=false;if(cancelled||this.pressAge<.08){this.cancel();return;}this.postTouch=.0001;this.touchStart=[this.x,this.y,this.z];this.touchEnd=[clamp(this.x+this.petSide*.08,...this.L.bounds.x),this.y,clamp(this.z+.055,...this.L.bounds.z)];if(this.reduced){this.postTouch=0;this.action='idle';this.onDone('pet');}}
 syncMode(mode){if(mode==='sleep'||mode==='hibernating'){this.cancel();this.action=mode==='sleep'?'sleeping':'hibernating';const k=this.dock.cushion;this.x=k.x;this.y=k.y;this.z=k.z;this.yaw=0;}else if(['sleeping','hibernating'].includes(this.action))this.cancel();}
 sample(name,t){const c=this.a.clips[name];this.lastSample=name;for(const n of this.a.nodes){n.p=[0,0,0];n.r=[0,0,0];}for(const p of this.a.parts)p.weights.fill(0);
  for(const ch of c.channels){const a=A.sampleChannel(ch,t),n=this.a.nodes[ch.node];if(ch.path==='translation')n.p=Array.from(a);else if(ch.path==='rotation')n.r[1]=2*Math.atan2(a[1],a[3]);else this.a.parts[ch.node-1].weights.set(a);}
  // World route owns X/Z. The clip's bounce and face-turn are local acting only.
  this.a.root.p[0]=0;this.a.root.p[2]=0;
 }
 ambient(){const n=this.wander++%4;if(n===0)this.start('ambient',[this.clip(this.profile==='expressive'?'honest_greet':'tsundere_greet',0,.75,'주변을 힐끗',-.20),this.clip(this.idleClip(),0,1.4,'느긋하게 쉬는 중',0)]);
  else if(n===1)this.start('ambient',[...this.route(-.45,-1.9),this.clip(this.idleClip(),0,2.4,'창가를 바라보는 중',Math.PI*.84)]);
  else if(n===2)this.start('ambient',[...this.route(this.profile==='expressive'?1.1:-.9,2.35),this.clip(this.idleClip(),0,1.9,'자기 자리를 고르는 중',0)]);
  else this.start('ambient',[...this.route(.2,1.95),this.clip(this.idleClip(),0,2.0,'곁에 머무는 중',-.06)]);
 }
 update(dt,mode='awake',canWander=false){
  // Simulate at small stable intervals; deform/upload each mesh only once per frame.
  let remaining=clamp(Number.isFinite(dt)?dt:0,0,M.maxCatchupSeconds);
  if(remaining===0)this.tick(0,mode,canWander);
  while(remaining>1e-9){const h=Math.min(M.simulationStep,remaining);this.tick(h,mode,canWander);remaining-=h;}
  this.deform();
 }
 tick(dt,mode='awake',canWander=false){this.time+=dt;this.age+=dt;if(this.holding)this.pressAge+=dt;
  let st=this.step,name=this.idleClip(),time=this.time%4,complete=false;
  if(st&&st.type==='move'){
   const dx=st.x-this.x,dz=st.z-this.z,d=Math.hypot(dx,dz),desired=this.profile==='expressive'?M.walkExpressive:M.walkReserved;
   const face=d>.008?Math.atan2(dx,dz):this.yaw;this.yaw=turn(this.yaw,face,1-Math.exp(-dt*M.turnResponse));
   const facing=Math.max(.08,Math.cos(face-this.yaw));const through=this.plan[0]?.type==='move';const wanted=Math.min(desired,through?desired:d*M.arrivalResponse)*facing;this.walkSpeed=mix(this.walkSpeed,wanted,1-Math.exp(-dt*M.acceleration));const travel=Math.min(d,this.walkSpeed*dt);
   if(d>.002){this.x+=dx/d*travel;this.z+=dz/d*travel;}
   const progress=st.distance<.001?1:clamp(1-d/st.distance,0,1);this.y=mix(st.start[1],st.y,smooth(.12,.94,progress));
   this.walkClock+=travel/(.42*this.scale)*1.2;name='walk';time=this.walkClock%1.2;this.a.root.r[1]=0;
   if(d<.022){this.x=st.x;this.z=st.z;this.y=st.y;complete=true;}
  }else if(st){name=st.clip;time=mix(st.from,st.to,clamp(this.age/st.duration,0,1));if(st.face!==undefined)this.yaw=turn(this.yaw,st.face,1-Math.exp(-dt*6));if(st.roll){let u=smooth(.06,.72,this.age/st.duration);this.s.ball.p=[st.ballStart[0]-.23*u,.19,st.ballStart[2]+.46*u];this.s.ball.r[0]=-u*3.2;}
   if(this.age>=st.duration)complete=true;
  }else if(['sleeping','hibernating'].includes(this.action)){name='sleep';time=3.4;this.phase=this.action==='sleeping'?'편안히 잠든 중':'잠깐 쉬어가는 중';}
  else if(this.action==='idle'){this.yaw=turn(this.yaw,-.06,1-Math.exp(-dt*1.3));if(canWander&&!this.reduced&&mode==='awake'){this.idleTime+=dt;if(this.idleTime>(this.profile==='expressive'?M.idleExpressive:M.idleReserved)){this.idleTime=0;this.ambient();}}}
  this.sample(name,time);if(st?.type==='move')this.a.root.r[1]=0;
  if(this.blend){this.blend.t+=dt;const u=smooth(0,M.blendSeconds,this.blend.t);this.a.nodes.forEach((n,i)=>{for(let k=0;k<3;k++){n.p[k]=mix(this.blend.source.nodes[i].p[k],n.p[k],u);n.r[k]=mix(this.blend.source.nodes[i].r[k],n.r[k],u);}});this.a.parts.forEach((p,i)=>{for(let k=0;k<p.weights.length;k++)p.weights[k]=mix(this.blend.source.weights[i][k],p.weights[k],u);});if(u===1)this.blend=null;}
  if(this.holding||Math.abs(this.press)>.001||Math.abs(this.pressVelocity)>.002){
   this.pressVelocity+=((this.holding?1:0)-this.press)*M.springStiffness*dt-this.pressVelocity*M.springDamping*dt;this.press+=this.pressVelocity*dt;if(this.reduced)this.press=this.pressVelocity=0;
   for(const p of this.a.parts){const w=p.weights,v=Math.max(0,this.press);w[0]=this.press;w[this.petSide<0?1:2]=v*(this.profile==='expressive'?.60:.40);w[6]=Math.max(0,this.press-.1)*.8;w[3]=v*(this.profile==='expressive'?.75:.08);if(this.profile==='reserved'){w[this.petSide<0?15:14]=v*.8;w[16]=v*.38;w[17]=v*.12;}else w[17]=v*.65;}
   this.a.root.r[1]+=(this.petSide<0?1:-1)*Math.max(0,this.press)*(this.profile==='reserved'?.18:.03);
  }
  if(this.postTouch){this.postTouch+=dt;const u=smooth(.30,.95,this.postTouch);this.x=mix(this.touchStart[0],this.touchEnd[0],u);this.z=mix(this.touchStart[2],this.touchEnd[2],u);
   if(!this.reduced){for(const p of this.a.parts){p.weights[this.petSide>0?2:1]+=.15*pulse(this.postTouch,.75,1.15,1.55,2.1);if(this.profile==='reserved'){p.weights[this.petSide>0?14:15]+=.72*pulse(this.postTouch,.90,1.2,1.55,2.1);p.weights[16]+=.25*pulse(this.postTouch,.90,1.2,1.55,2.1);}}
    if(this.postTouch>.30&&this.postTouch<.95){const foot=this.a.nodes.find(n=>n.name===(this.petSide>0?'Foot_R_Front':'Foot_L_Front'));foot.p[1]+=.047*Math.sin(Math.PI*(this.postTouch-.30)/.65);}}
   if(this.postTouch>=2.1){this.postTouch=0;this.action='idle';this.onDone('pet');}
  }
  if(this.reduced){for(const p of this.a.parts){for(const i of [0,1,2,6])p.weights[i]=0;if(name.startsWith('idle'))p.weights[3]=0;}if(name==='walk'){for(let i=1;i<this.a.nodes.length;i++)this.a.nodes[i].p=[0,0,0];}this.a.root.p[1]=0;}
  for(const p of this.a.parts){const w=p.weights;w[4]=this.profile==='expressive'?1-clamp(w[3],0,1):0;w[8]=w[0]*w[3];w[9]=w[5]*w[3];w[10]=w[7]*w[3];w[11]=w[0]*w[4];w[12]=w[5]*w[4];w[13]=w[7]*w[4];

  }
  this.a.wrap.p=[this.x,this.y,this.z];this.a.wrap.r=[0,this.yaw,0];this.a.wrap.s=[this.scale,this.scale,this.scale];
  if(this.action==='feed'&&name==='eat'){this.s.food.visible=time<2.8;this.s.food.s[1]=Math.max(.15,1-time/3);}else if(this.action!=='feed')this.s.food.visible=false;
  this.phase=this.holding?(this.profile==='reserved'?'얼굴은 딴청, 몸은 손 쪽으로':'좋아하는 만큼 기대는 중'):this.postTouch?(this.postTouch<.3?'말캉하게 돌아오는 중':'손이 있던 쪽으로 한 발'):this.step?.label||(['sleeping','hibernating'].includes(this.action)?this.phase:'느긋한 하루');
  const tm=this.time,r=this.reduced;this.s.cloud.p[0]=.45+(r?0:Math.sin(tm*.12)*.08);this.s.curtains.forEach((c,i)=>c.r[2]=r?0:Math.sin(tm*.7+i*.5)*.005);this.s.leaves.forEach((l,i)=>l.node.r[2]=l.base+(r?0:Math.sin(tm*.7+i)*.016));this.s.motes.forEach(n=>n.visible=false);
  if(complete&&this.step===st)this.next();
 }
 deform(){
  for(const p of this.a.parts){
   const w=p.weights,indices=p.activeTargets;let changed=!p.lastWeights;
   if(!p.lastWeights)p.lastWeights=new Float32Array(w.length).fill(NaN);
   for(const k of indices)if(Math.abs(w[k]-p.lastWeights[k])>1e-6||!Number.isFinite(p.lastWeights[k])){changed=true;break;}
   if(!changed)continue;
   p.geo.p.set(p.pos);p.geo.n.set(p.normal);
   for(const k of indices){if(Math.abs(w[k])<1e-6)continue;const t=p.targets[k];for(let i=0;i<p.geo.p.length;i++){p.geo.p[i]+=t.p[i]*w[k];p.geo.n[i]+=t.n[i]*w[k];}}
   p.lastWeights.set(w);p.geo.dirty=true;
  }
 }
 stats(){return {action:this.action,phase:this.phase,pose:this.lastSample,x:this.x,y:this.y,z:this.z,yaw:this.yaw,busy:this.busy,profile:this.profile,holding:this.holding,press:this.press,pressVelocity:this.pressVelocity,postTouch:this.postTouch,weights:Array.from(this.a.parts[0].weights),walkSpeed:this.walkSpeed,walkClock:this.walkClock,motionVersion:M.version,planRemaining:this.plan.length,reduced:this.reduced,meshes:this.a.parts.length};}
}
root.AruconLifeActor={Actor};
})(window);
