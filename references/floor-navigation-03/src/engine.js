/* Pure domain fixture. No DOM, system clock, random, network or storage APIs. */
(function(root,factory){const v=factory();if(typeof module==='object'&&module.exports)module.exports=v;else root.AruconEngine=v;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x));
const finiteInt=(v,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const profiles=['expressive','reserved'];
function createState(c){return {
 schema:c.schema,configVersion:c.version,simMs:0,lastActiveMs:0,
 personality:c.initial.personality,formId:'mochi-horn-preview',
 food:c.initial.food,coins:c.initial.coins,expMicro:0,
 hungerU:c.initial.hunger*c.meterScale,staminaU:c.initial.stamina*c.meterScale,
 mode:'awake',previousMode:'awake',sleepMinutes:0,lastRecoveryDay:-1,
 poop:c.initial.poop,wasteMinutes:0,foodWasteCount:0,sick:false,dirtyMinutes:0,recoveryMinutes:null,
 facilities:{table:false,toilet:false,ball:false,cushion:false},autoFeed:false,
 activity:{steps:0,foodCarry:0,coinCarry:0,suppressed:0},mealSeq:0,
 mealCounts:{manual:0,auto:0},behaviorCursor:0,eventSeq:0,events:[],receipts:[]
};}
function validate(s,c){
 if(!s||s.schema!==c.schema||s.configVersion!==c.version)return false;
 const ints=['simMs','lastActiveMs','food','coins','expMicro','hungerU','staminaU','sleepMinutes','poop','wasteMinutes','foodWasteCount','dirtyMinutes','mealSeq','behaviorCursor','eventSeq'];
 if(ints.some(k=>!finiteInt(s[k])))return false;
 if(s.lastActiveMs>s.simMs||s.hungerU>c.hungerMax*c.meterScale||s.staminaU>c.staminaMax*c.meterScale)return false;
 if(!['awake','sleep','hibernating'].includes(s.mode)||!['awake','sleep'].includes(s.previousMode)||!profiles.includes(s.personality))return false;
 if(typeof s.sick!=='boolean'||typeof s.autoFeed!=='boolean'||!s.facilities||Object.keys(c.shop).some(k=>typeof s.facilities[k]!=='boolean'))return false;
 if(s.autoFeed&&!s.facilities.table)return false;
 if(!s.activity||['steps','foodCarry','coinCarry','suppressed'].some(k=>!finiteInt(s.activity[k])))return false;
 if(s.activity.foodCarry>=c.stepsPerFood||s.activity.coinCarry>=c.stepsPerCoin)return false;
 if(!s.mealCounts||!finiteInt(s.mealCounts.manual)||!finiteInt(s.mealCounts.auto)||s.mealSeq!==s.mealCounts.manual+s.mealCounts.auto)return false;
 if(!Number.isInteger(s.lastRecoveryDay)||s.lastRecoveryDay< -1||(s.recoveryMinutes!==null&&!finiteInt(s.recoveryMinutes)))return false;
 if(!Array.isArray(s.events)||s.events.length>c.journalLimit||!s.events.every(e=>finiteInt(e.id,1)&&finiteInt(e.at)&&typeof e.type==='string'&&typeof e.text==='string'&&e.text.length<=300))return false;
 if(!Array.isArray(s.receipts)||s.receipts.length>c.receiptLimit||!s.receipts.every(id=>typeof id==='string'&&id.length<=128))return false;
 return true;
}
function addEvent(s,type,text,c,data={}){const e={id:++s.eventSeq,at:s.simMs,type,text,...data};s.events.push(e);if(s.events.length>c.journalLimit)s.events.shift();return e;}
function canFeed(s,c){
 if(s.mode==='hibernating')return {ok:false,reason:'동면 중이에요. 돌아오기 후 다시 만나요.'};
 if(s.mode==='sleep')return {ok:false,reason:'지금은 자는 중이에요. 식사는 깨어난 뒤에 해요.'};
 if(s.food<1)return {ok:false,reason:'먹이가 비었어요. 예시 걸음으로 채워볼까요?'};
 if(s.hungerU<c.mealThreshold*c.meterScale)return {ok:false,reason:'아직 배가 불러요. 지금은 함께 놀아도 좋아요.'};
 return {ok:true};
}
function startRecovery(s){s.poop=0;s.dirtyMinutes=0;if(s.sick&&s.recoveryMinutes===null)s.recoveryMinutes=0;}
function waste(s,c){
 if(s.facilities.toilet){addEvent(s,'toilet','화장실이 배설물을 자동으로 처리했어요.',c);return;}
 s.poop++;
 if(s.poop>=c.dirtyThreshold&&s.recoveryMinutes!==null)s.recoveryMinutes=null;
 addEvent(s,'waste','방에 작은 배설물이 생겼어요.',c);
}
function meal(s,source,c){
 if(!canFeed(s,c).ok)return false;
 const mood=c.moodBands.find(b=>s.poop>=b.minimum).multiplier;
 const gain=Math.round(c.expPerFood*c.expScale*mood*(s.sick?c.sickMultiplier:1)*(s.staminaU<c.lowStamina*c.meterScale?c.lowMultiplier:1));
 s.food--;s.expMicro+=gain;s.hungerU=Math.max(0,s.hungerU-c.hungerPerFood*c.meterScale);
 s.staminaU=Math.max(0,s.staminaU-c.staminaPerFood*c.meterScale);
 s.mealSeq++;s.mealCounts[source]++;s.foodWasteCount++;
 addEvent(s,'meal',source==='auto'?'식탁에서 먹이 1개를 스스로 먹었어요.':'손으로 준 먹이 1개를 먹었어요.',c,{mealId:'meal-'+s.mealSeq,source,expMicro:gain});
 if(s.foodWasteCount>=c.poopEveryFoods){s.foodWasteCount-=c.poopEveryFoods;waste(s,c);}
 return true;
}
function maybeAuto(s,c){if(s.facilities.table&&s.autoFeed&&s.mode==='awake')meal(s,'auto',c);}
function tick(s,c){
 if(s.mode==='hibernating')return;
 if(s.sick){
   if(s.recoveryMinutes!==null&&s.poop<c.dirtyThreshold){s.recoveryMinutes++;if(s.recoveryMinutes>=c.recoveryMinutes){s.sick=false;s.recoveryMinutes=null;s.dirtyMinutes=0;addEvent(s,'recovery','청결이 유지되어 다시 기운을 찾았어요.',c);}}
   else if(s.poop>=c.dirtyThreshold)s.recoveryMinutes=null;
 }else if(s.poop>=c.dirtyThreshold){s.dirtyMinutes++;if(s.dirtyMinutes>=c.sickAfterMinutes){s.sick=true;s.recoveryMinutes=null;addEvent(s,'condition','잠시 기운이 없어요. 깨끗한 공간에서 쉬면 회복해요.',c);}}
 else s.dirtyMinutes=0;
 if(s.mode==='awake'){
   s.hungerU=Math.min(c.hungerMax*c.meterScale,s.hungerU+c.hungerPerHour*c.meterScale/60);
   s.staminaU=Math.max(0,s.staminaU-c.staminaPerHour*c.meterScale/60);
 }else s.sleepMinutes++;
 s.wasteMinutes++;
 if(s.wasteMinutes>=c.poopEveryMinutes){s.wasteMinutes-=c.poopEveryMinutes;waste(s,c);}
 maybeAuto(s,c);
}
function advance(s,milliseconds,away,c){
 const end=s.simMs+milliseconds, boundary=s.lastActiveMs+c.hibernateMinutes*60000;
 // The hibernation boundary is exclusive: no other event at that instant.
 const stop=away?Math.min(end,boundary):end;
 if(s.mode!=='hibernating'){
  for(let t=(Math.floor(s.simMs/60000)+1)*60000;t<=stop;t+=60000){
   if(away&&t>=boundary)break;
   s.simMs=t;tick(s,c);
  }
  if(away&&end>=boundary){
   s.simMs=boundary;s.previousMode=s.mode;s.mode='hibernating';
   addEvent(s,'hibernate','데모 부재 한도에 도달해 생활 시간이 잠시 멈췄어요.',c);
  }
 }
 s.simMs=end;
 if(!away)s.lastActiveMs=end;
}
function dispatch(input,cmd,c){
 if(!validate(input,c))throw new Error('저장 상태 형식이 맞지 않습니다. 원본을 보존하고 복구를 확인하세요.');
 if(!cmd||typeof cmd.id!=='string'||cmd.id.length<1||cmd.id.length>128)throw new Error('commandId가 필요합니다.');
 if(input.receipts.includes(cmd.id))return {state:copy(input),events:[],result:{ok:true,duplicate:true}};
 const s=copy(input);const before=s.eventSeq;let result={ok:true};
 const fail=reason=>{result={ok:false,reason};};
 const active=()=>{s.lastActiveMs=s.simMs;};
 switch(cmd.type){
 case 'activity':{
   if(!finiteInt(cmd.totalSteps,0,100000000)){fail('유효한 예시 걸음이 필요해요.');break;}
   const delta=Math.max(0,cmd.totalSteps-s.activity.steps);s.activity.steps=Math.max(s.activity.steps,cmd.totalSteps);
   const potential=Math.floor((s.activity.foodCarry+delta)/c.stepsPerFood),coins=Math.floor((s.activity.coinCarry+delta)/c.stepsPerCoin);
   const food=Math.min(potential,Math.max(0,c.foodCap-s.food));s.activity.suppressed+=potential-food;
   s.activity.foodCarry=(s.activity.foodCarry+delta)%c.stepsPerFood;s.activity.coinCarry=(s.activity.coinCarry+delta)%c.stepsPerCoin;
   s.food+=food;s.coins+=coins;active();
   if(delta)addEvent(s,'activity',`예시 ${delta.toLocaleString('ko-KR')}걸음으로 먹이 ${food}개와 코인 ${coins}개를 얻었어요.`,c);
   // Supply and consumption remain two separate committed domain events.
   maybeAuto(s,c);break;
 }
 case 'buy':{
   const item=Object.hasOwn(c.shop,cmd.item)?c.shop[cmd.item]:null;if(!item){fail('없는 상품이에요.');break;}
   if(s.facilities[cmd.item]){fail('이미 우리 집에 있어요.');break;}
   if(s.coins<item.price){fail('데모 코인이 조금 더 필요해요.');break;}
   s.coins-=item.price;s.facilities[cmd.item]=true;active();
   addEvent(s,'purchase',`${item.label}을 마련했어요.`,c,{item:cmd.item});
   if(cmd.item==='toilet'){startRecovery(s);addEvent(s,'clean','화장실 설치와 함께 방을 정리했어요. 이제 자동으로 처리해요.',c);}
   break;
 }
 case 'setAuto':
   if(typeof cmd.enabled!=='boolean'){fail('설정값이 올바르지 않아요.');break;}
   if(cmd.enabled&&!s.facilities.table){fail('먼저 식탁을 마련해주세요.');break;}
   s.autoFeed=cmd.enabled;active();addEvent(s,'setting',s.autoFeed?'보관함 먹이의 자동급식을 켰어요.':'자동급식을 껐어요. 직접 먹여도 좋아요.',c);maybeAuto(s,c);break;
 case 'feed':{
   const possible=canFeed(s,c);if(!possible.ok){fail(possible.reason);break;}active();meal(s,'manual',c);break;
 }
 case 'clean':active();startRecovery(s);addEvent(s,'clean',s.facilities.toilet?'화장실 덕분에 방이 깨끗해요.':'방을 깨끗하게 정리했어요.',c);break;
 case 'interact':
   if(!['pet','greet','ball','cushion'].includes(cmd.action)){fail('없는 행동이에요.');break;}
   if(s.mode!=='awake'){fail('지금은 쉬는 중이에요. 깨면 함께해요.');break;}
   if(['ball','cushion'].includes(cmd.action)&&!s.facilities[cmd.action]){fail('아직 이 가구가 없어요. 상점에서 만나보세요.');break;}
   active();result={ok:true,behavior:cmd.action,variant:s.behaviorCursor++};break;
 case 'observe':
   if(typeof cmd.text!=='string'||cmd.text.length>180||!['pet','greet','ball','cushion','newObject'].includes(cmd.action)){fail('완료된 관찰 기록만 남길 수 있어요.');break;}
   addEvent(s,'behavior',cmd.text,c,{action:cmd.action});break;
 case 'personality':
   if(!profiles.includes(cmd.value)){fail('알 수 없는 비교 성격이에요.');break;}
   s.personality=cmd.value;active();break;
 case 'sleep':
   if(s.mode!=='awake'){fail('이미 쉬는 중이에요.');break;}
   active();s.mode='sleep';s.sleepMinutes=0;addEvent(s,'sleep','편안히 잠들었어요.',c);break;
 case 'wake':{
   if(s.mode!=='sleep'){fail('먼저 수면 상태를 확인해주세요.');break;}
   active();s.mode='awake';const day=Math.floor((s.simMs/60000+c.startClockMinutes)/1440);
   if(s.sleepMinutes>=c.sleepMinMinutes&&s.lastRecoveryDay!==day){s.staminaU=Math.min(c.staminaMax*c.meterScale,s.staminaU+c.sleepRecovery*c.meterScale);s.lastRecoveryDay=day;addEvent(s,'rest','데모 휴식 조건을 채워 체력을 회복했어요. 실제 수면 평가는 아니에요.',c);}
   addEvent(s,'wake','눈을 뜨고 방을 둘러봤어요.',c);maybeAuto(s,c);break;
 }
 case 'advance':case 'away':{
   if(!finiteInt(cmd.milliseconds,0,c.maxAdvanceMinutes*60000)){fail('시간 범위를 확인해주세요.');break;}
   advance(s,cmd.milliseconds,cmd.type==='away',c);break;
 }
 case 'return':
   if(s.mode==='hibernating'){s.mode=s.previousMode;addEvent(s,'return','돌아왔어요. 멈췄던 생활을 이어가요.',c);}active();break;
 default:throw new Error('Unknown command: '+cmd.type);
 }
 s.receipts.push(cmd.id);if(s.receipts.length>c.receiptLimit)s.receipts.shift();
 if(!validate(s,c))throw new Error('상태 검증 실패: 변경을 저장하지 않았습니다.');
 return {state:s,events:s.events.filter(e=>e.id>before),result};
}
function view(s,c){return {
 hunger:s.hungerU/c.meterScale,stamina:s.staminaU/c.meterScale,exp:s.expMicro/c.expScale,
 clean:s.facilities.toilet?'자동 청결':s.poop===0?'깨끗해요':`정리 ${s.poop}개`,
 mood:s.sick?'기운 없음':s.mode==='sleep'?'자는 중':s.mode==='hibernating'?'동면 중':s.hungerU>=c.mealThreshold*c.meterScale?'밥 생각 중':'느긋한 하루'
};}
return {createState,validate,canFeed,dispatch,view};});
