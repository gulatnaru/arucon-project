/* Local prototype session. Domain commands, storage, and visual acknowledgement are separate.
 * Not server synchronization, a production transaction store, or a cross-tab lock.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AruconSession=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x));
const KEY='arucon.life-room.v1';
class Session{
 constructor({engine,config,storage,now=()=>Date.now(),prefix='local'}={}){this.E=engine;this.C=config;this.storage=storage;this.now=now;this.prefix=prefix;this.seq=0;this.warning='';this.allowSave=true;this.readOnly=false;this.reduced=false;this.speech=false;this.ackMeal=0;this.position=null;this.hiddenAt=null;this.restoredMeals=0;this.lastSaveAt=null;this.lastSaveOk=false;this.state=this.seed();this.load();}
 seed(){const s=this.E.createState(this.C);s.formId='baby-motion-02';s.facilities.table=true;s.facilities.cushion=true;s.poop=0;return s;}
 id(){return this.prefix+'-'+this.now()+'-'+(++this.seq);}
 load(){try{const raw=this.storage?.getItem(KEY);if(!raw)return;if(raw.length>300000)throw Error('oversized');const p=JSON.parse(raw);if(p.version!==1||!this.E.validate(p.state,this.C)||!Number.isSafeInteger(p.savedAt)||p.savedAt<0||!Number.isSafeInteger(p.ackMeal)||p.ackMeal<0||p.ackMeal>p.state.mealSeq)throw Error('invalid save');this.state=p.state;this.ackMeal=p.ackMeal;this.reduced=!!p.reduced;this.speech=!!p.speech;
 if(p.position&&['x','y','z','yaw'].every(k=>Number.isFinite(p.position[k]))&&Math.abs(p.position.x)<=9&&p.position.z>=-4.8&&p.position.z<=12&&p.position.y>=0&&p.position.y<=.5)this.position=p.position;
 const elapsed=Math.max(0,Math.min(this.now()-p.savedAt,this.C.maxAdvanceMinutes*60000));if(elapsed>=60000){const before=this.state.mealSeq;this.state=this.E.dispatch(this.state,{id:this.id(),type:'away',milliseconds:Math.floor(elapsed)},this.C).state;this.state=this.E.dispatch(this.state,{id:this.id(),type:'return'},this.C).state;this.restoredMeals=this.state.mealSeq-before;}
 }catch(e){this.allowSave=false;this.warning='저장을 읽을 수 없어 임시로 실행해요. 기존 기록은 덮어쓰지 않습니다.';this.state=this.seed();this.ackMeal=0;this.position=null;}}
 save(){if(!this.allowSave||this.readOnly){this.lastSaveOk=false;return false;}try{if(!this.storage)throw Error('storage unavailable');this.storage.setItem(KEY,JSON.stringify({version:1,state:this.state,ackMeal:this.ackMeal,savedAt:this.hiddenAt===null?this.now():this.hiddenAt,reduced:this.reduced,speech:this.speech,position:this.position}));this.lastSaveOk=true;this.lastSaveAt=this.now();return true;}catch(e){this.lastSaveOk=false;this.allowSave=false;this.warning='이 환경에서는 저장할 수 없어요. 현재 창에서만 체험합니다.';return false;}}
 command(type,data={}){if(this.readOnly)return {state:this.state,events:[],result:{ok:false,reason:'다른 창에서 기록이 바뀌어 이 창은 읽기 전용이에요. 새로고침해주세요.'}};const out=this.E.dispatch(this.state,{id:this.id(),type,...data},this.C);this.state=out.state;this.save();return out;}
 pendingMeal(){if(this.ackMeal>=this.state.mealSeq)return null;return {seq:this.state.mealSeq,count:this.state.mealSeq-this.ackMeal,event:[...this.state.events].reverse().find(e=>e.type==='meal')||null};}
 acknowledgeMeal(seq){if(Number.isSafeInteger(seq)&&seq>=0)this.ackMeal=Math.max(this.ackMeal,Math.min(seq,this.state.mealSeq));this.save();}
 setPosition(p){if(p)this.position={x:p.x,y:p.y,z:p.z,yaw:p.yaw};}
 suspend(){if(this.hiddenAt!==null)return false;this.hiddenAt=this.now();this.save();return true;}
 resume(){if(this.hiddenAt===null)return null;const elapsed=Math.max(0,Math.min(this.now()-this.hiddenAt,this.C.maxAdvanceMinutes*60000));this.hiddenAt=null;if(elapsed<60000)return null;const result=this.command('away',{milliseconds:Math.floor(elapsed)});this.command('return');return result;}
 conflict(){this.readOnly=true;this.warning='다른 창에서 상태가 바뀌었어요. 덮어쓰지 않도록 이 창의 게임 변경을 멈췄습니다.';}
 reset(){if(this.readOnly)return false;this.state=this.seed();this.ackMeal=0;this.position=null;this.allowSave=true;this.warning='';this.hiddenAt=null;this.save();return true;}
 snapshot(){return copy(this.state);}
}
return {Session,KEY};
});
