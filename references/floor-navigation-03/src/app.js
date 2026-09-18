/* Living-room integration of the unchanged motion-02 GLB and room-03 domain fixture. */
(function(){'use strict';
const $=id=>document.getElementById(id),C=window.AruconConfig,E=window.AruconEngine;
const app=$('app'),sheet=$('sheet'),canvas=$('room');
let session,renderer,scene,asset,actor,ready=false,paused=false,currentSheet='',lastFocus=null,lastFrame=0,frames=0,rafId=0,renderBlocked=false;
let toastTimer,hintTimer,speechTimer,playingMeal=null,lastPhase='',pointerOwner=null,pressSide=1,showSpeech=false,reduced=false;
const pref=matchMedia('(prefers-reduced-motion: reduce)'),esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pacer=new AruconMotion.FramePacer();
let walkDestination=null,lastFloorTap=null;
function clearFloorTarget(){walkDestination=null;const n=$('moveTarget');if(n)n.hidden=true;}
function floorMove(x,z){
 if(sheet.open||pointerOwner!==null||actor.holding||actor.busy||state().mode!=='awake'||session.pendingMeal())return false;
 const goal=AruconNavigation.nearestFreePoint([x,z],scene.layout.bounds,actor.obstacles());
 if(!goal)return false;
 const ok=actor.request('move',{x:goal[0],z:goal[1]});
 if(ok){hideHint();walkDestination=goal;targets();$('moveStatus').textContent=Math.hypot(goal[0]-x,goal[1]-z)>.1?'가까운 빈 바닥으로 갈게요.':'그쪽으로 갈게요.';}
 return ok;
}
function onFloorTap(e){
 if(e.isPrimary===false||e.button>0||sheet.open||pointerOwner!==null||actor.holding)return;
 const rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;
 const p=renderer.floorPoint(x,y),f=scene.layout.floorBounds;
 // Do not reinterpret a wall/window tap as a destination on the floor behind it.
 if(!p||p[0]<f.x[0]||p[0]>f.x[1]||p[2]<f.z[0]||p[2]>f.z[1]){lastFloorTap={status:'not-floor',screen:[x,y]};return;}
 if(actor.busy||state().mode!=='awake'||session.pendingMeal()){
  lastFloorTap={status:'busy',screen:[x,y]};
  toast(state().mode!=='awake'?'지금은 쉬는 중이에요. 위쪽 버튼으로 깨워주세요.':'하던 식사나 휴식을 마치면 갈게요.');return;
 }
 e.preventDefault();AruconMobile.inputReceived();const ok=floorMove(p[0],p[2]);
 lastFloorTap={status:ok?'accepted':'unreachable',screen:[x,y],requested:[p[0],p[2]],resolved:walkDestination?.slice()||null};
 if(!ok)toast('그곳에는 갈 수 없어요. 다른 빈 바닥을 눌러주세요.');
}
function updateWalkableBounds(){
 const r=renderer,L=scene.layout,f=L.floorBounds,unit=r.width/r.worldW,s=actor.scale;
 const halfW=Math.max(62,unit*2.62*s)/2,halfH=Math.max(70,unit*2.65*s)/2;
 const origin=r.project([0,0,0]),center=r.project([0,1.13*s,0]);
 const footOverhang=Math.max(0,center[1]-origin[1]+halfH);
 const dockTop=document.querySelector('.dock').getBoundingClientRect().top-app.getBoundingClientRect().top;
 const left=r.floorPoint(halfW+8,origin[1]),right=r.floorPoint(r.width-halfW-8,origin[1]);
 const front=r.floorPoint(r.width/2,Math.min(r.height-20,dockTop-12-footOverhang));
 if(!left||!right||!front)return;
 const next={x:[Math.max(f.x[0]+.8,left[0]),Math.min(f.x[1]-.8,right[0])],z:[f.z[0]+.75,Math.min(f.z[1]-.6,front[2])]};
 if(next.x[0]>=next.x[1]||next.z[0]>=next.z[1])return;
 const changed=JSON.stringify(next)!==JSON.stringify(L.bounds),destination=walkDestination?.slice();L.bounds=next;
 // A saved floor position may need a cosmetic adjustment on a narrower viewport.
 // Authored eating/sleeping docks remain owned by those transitions, not this clamp.
 if(changed&&!actor.busy&&state().mode==='awake'&&actor.y<=.05){
  const p=AruconNavigation.nearestFreePoint([actor.x,actor.z],next,actor.obstacles());
  if(p&&Math.hypot(p[0]-actor.x,p[1]-actor.z)>.001){actor.cancel();actor.x=p[0];actor.z=p[1];actor.y=0;}
  if(destination)floorMove(...destination);
 }
}

const state=()=>session.state;
function toast(s){$('toast').textContent=s;$('toast').classList.add('on');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('on'),3300);}
function speak(s){if(!showSpeech)return;$('speech').textContent=s;$('speech').classList.add('on');clearTimeout(speechTimer);speechTimer=setTimeout(()=>$('speech').classList.remove('on'),2100);}
function hideHint(){$('hint').classList.add('hide');}
function persist(){if(!session)return;if(actor)session.setPosition(actor);session.reduced=reduced;session.speech=showSpeech;session.save();}
function command(type,data={}){
 let out;try{session.setPosition(actor);out=session.command(type,data);}catch(e){toast('변경을 적용하지 못했어요. 기존 저장은 보존합니다.');return {ok:false,reason:e.message};}
 syncUI();if(!out.result.ok){toast(out.result.reason);return out.result;}
 const meals=out.events.filter(e=>e.type==='meal');if(meals.length>1)toast(`부재 중 ${meals.length}번의 식사를 정산했어요. 대표 장면만 보여드려요.`);
 return {...out.result,events:out.events};
}
function pumpMeals(){
 const p=session.pendingMeal();if(!p||playingMeal)return;
 if(state().mode!=='awake'){session.acknowledgeMeal(p.seq);return;}
 if(actor.busy||actor.active)return;
 if(actor.request('feed')){playingMeal=p;syncUI();}
}
function done(action){
 if(action==='move')clearFloorTarget();
 if(action==='feed'){
  if(playingMeal){session.acknowledgeMeal(playingMeal.seq);playingMeal=null;}
  scene.food.visible=false;speak(state().personality==='reserved'?'… 남기면 아깝잖아.':'맛있었어!');
 }else if(action==='sleep'){command('sleep');speak('잘 자.');}
 else if(action==='wake'){command('wake');}
 else if(['pet','greet','ball','cushion'].includes(action)){
  if(document.hidden)return;const q=state().personality==='expressive';
  const text={pet:q?'쓰다듬자 좋아하는 티를 내며 손 쪽으로 기댔어요.':'얼굴은 딴청을 피우지만, 몸은 손 쪽으로 슬쩍 기댔어요.',greet:q?'부르자 먼저 눈을 맞추고 반갑게 다가왔어요.':'힐끗 보곤 딴청을 피우다, 결국 곁에 와 앉았어요.',ball:q?'공을 보고 곧장 다가와 함께 굴렸어요.':'한 번만이라는 눈으로 공을 굴려주고, 슬쩍 다음 차례도 준비했어요.',cushion:'쿠션에 올라 몸을 낮추고 잠깐 편히 쉬었어요.'};
  command('observe',{action,text:text[action]});
 }
 persist();syncUI();
}
function interact(action,opts={}){
 hideHint();if(actor.busy||session.pendingMeal()){toast('식사나 휴식을 마친 뒤 함께해요.');return false;}
 const result=command('interact',{action});if(!result.ok)return false;
 actor.cancel();const ok=actor.request(action,opts);syncUI();return ok;
}
function beginPress(side){
 if(pointerOwner!==null||actor.busy||state().mode!=='awake'||session.pendingMeal())return false;
 const out=command('interact',{action:'pet'});if(!out.ok)return false;
 hideHint();pressSide=side;if(!actor.beginPress(side))return false;$('petTarget').classList.add('touching');return true;
}
function releasePress(cancelled=false){actor.releasePress(cancelled);pointerOwner=null;$('petTarget').classList.remove('touching');}
function sleepToggle(){
 closeSheet();hideHint();if(actor.busy||session.pendingMeal()){toast('하던 식사를 마치면 쉴 수 있어요.');return false;}
 if(state().mode==='hibernating')command('return');
 releasePress(true);if(state().mode==='sleep'){actor.syncMode('sleep');return actor.request('wake');}
 actor.cancel();const ok=actor.request('sleep');syncUI();return ok;
}
function syncUI(){if(!actor)return;scene.ball.visible=state().facilities.ball;scene.toilet.visible=state().facilities.toilet;actor.setProfile(state().personality);$('ballTarget').hidden=!scene.ball.visible;
 const sleep=state().mode!=='awake'||actor.action==='sleep'||actor.action==='sleeping';app.classList.toggle('night',sleep);$('sleepButton').setAttribute('aria-label',sleep?'깨우기':'재우기');$('sleepButton').title=sleep?'깨우기':'재우기';$('sleepButton').querySelector('use').setAttribute('href',sleep?'#i-sun':'#i-moon');
 const mood=state().mode==='sleep'?'편안히 잠든 중':state().mode==='hibernating'?'잠깐 쉬어가는 중':actor.action==='feed'?'식탁에서 한 끼를 준비하는 중':actor.action==='sleep'?'잠자리를 찾는 중':state().hungerU>=C.mealThreshold*C.meterScale?'슬슬 밥 생각 중':state().personality==='reserved'?'무심한 듯, 곁에':'솔직하게, 네 곁에';
 if($('mood').textContent!==mood)$('mood').textContent=mood;
}
function toggle(id,label,on){return `<button id="${id}" class="toggle-wrap" role="switch" aria-label="${label}" aria-checked="${on}"><span class="toggle" aria-hidden="true" aria-checked="${on}"></span></button>`;}
function baseSheet(title,kicker,html){lastFocus=document.activeElement;$('sheetTitle').textContent=title;$('sheetKicker').textContent=kicker;$('sheetBody').innerHTML=html;if(!sheet.open)sheet.showModal();hideHint();}
function closeSheet(){if(sheet.open)sheet.close();currentSheet='';if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});}
function openSheet(kind){clearFloorTarget();releasePress(true);currentSheet=kind;if(!actor.busy&&actor.action!=='sleeping'&&actor.action!=='hibernating')actor.cancel();renderSheet(kind);}
function renderSheet(kind){if(kind==='device'){AruconMobile.showPanel({baseSheet,closeSheet,toast,session,renderer,getState:state,isBusy:()=>actor.busy||actor.holding||!!session.pendingMeal(),qualityChanged:resize});return;}const s=state(),v=E.view(s,C),pending=session.pendingMeal();
 if(kind==='food'){
  const ok=E.canFeed(s,C);baseSheet('한 끼의 작은 행복','MEAL TIME',`<p class="copy">식탁까지 걸어가, 자기답게 한 끼를 먹어요.<br>직접 주어도 스스로 먹어도 같은 만큼 자랍니다.</p><div class="row"><div><strong>먹이 보관함</strong><small>걷기로 모으는 성장 재료</small></div><span class="value">${s.food}<small>개</small></span></div><div class="row"><div><strong>식탁에서 스스로 먹기</strong><small>배고플 때만 허용한 보관함 먹이를 사용해요.<br>잠들면 식사도 잠시 멈춥니다.</small></div>${toggle('autoToggle','자동급식',s.autoFeed)}</div><button class="primary" id="feedNow" ${!ok.ok||actor.busy||pending?'disabled':''}>먹이 1개 주기</button><p class="center-note">${pending?'확정된 식사 장면을 이어서 보여주는 중이에요.':ok.ok?'코인을 임의로 쓰거나 먹이를 자동구매하지 않아요.':esc(ok.reason)}</p><p class="life-note">이번 시연은 식사 결과를 먼저 저장하고 이동·먹기 장면을 재생합니다. 재생이 중단되거나 다시 이어져도 먹이를 두 번 쓰지 않습니다.</p>`);
  $('autoToggle').onclick=()=>{const on=!state().autoFeed;command('setAuto',{enabled:on});if(session.pendingMeal()){closeSheet();pumpMeals();}else renderSheet(kind);};
  $('feedNow').onclick=()=>{if(actor.busy||session.pendingMeal())return;actor.cancel();closeSheet();command('feed');pumpMeals();};
 }else if(kind==='decor'){
  const row=(key,note)=>`<div class="row"><div><strong>${C.shop[key].label}</strong><small>${note}</small></div>${s.facilities[key]?'<span class="tag">우리 방에 있어요</span>':`<button class="pill" data-buy="${key}">${C.shop[key].price} 코인</button>`}</div>`;
  baseSheet('우리의 작은 방','A PLACE TOGETHER',`<p class="copy">효율보다, 함께하는 장면을 늘려보세요.</p><div class="row"><strong>보유 코인</strong><span class="value">${s.coins}<small>코인</small></span></div>${row('table','작은 발로 다가가 한 끼를 먹는 자리')}${row('cushion','올라앉고, 몸을 낮추고, 쉬어가는 자리')}${row('ball','틱틱대지만 한 번 더 굴려주는 공')}${row('toilet','청소는 자동으로. 유지비는 없어요.')}<p class="center-note">식탁·쿠션은 이번 시연의 기본 가구입니다.<br>가격·재화·허기는 출시용으로 확정한 수치가 아닙니다.</p>`);
  document.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{const r=command('buy',{item:b.dataset.buy});if(r.ok){closeSheet();toast('방에 새로운 물건이 생겼어요.');}});
 }else if(kind==='journal'){
  const items=s.events.filter(e=>['meal','behavior','purchase','sleep','wake','clean','toilet','rest'].includes(e.type)).slice(-18).reverse();
  baseSheet('구름콘의 작은 기록','MOMENTS WITH YOU',`<p class="copy">실제로 남은 생활과 함께한 순간들.</p>${items.length?`<ul class="journal-list">${items.map(e=>`<li><small>${e.type==='behavior'?'함께한 순간':e.type==='meal'?e.source==='auto'?'스스로 먹은 한 끼':'직접 준 한 끼':'생활 기록'}</small>${esc(e.text)}${e.type==='meal'?`<br><span class="meal-count">먹이 −1 · 성장 +${(e.expMicro/C.expScale).toFixed(1)}</span>`:''}</li>`).join('')}</ul>`:'<div class="empty">아직 기록은 비어 있어요.<br>구름콘을 꾹 눌렀다가 놓아보세요.</div>'}<p class="center-note">중단된 교감을 완료한 일로 기록하지 않습니다.<br>기록 열기·장면 재생은 보상을 추가하지 않습니다.</p>`);
 }else if(kind==='info'){
  baseSheet('오늘의 구름콘','A LITTLE FRIEND',`<p class="copy">${s.personality==='reserved'?'까칠한 눈, 다정한 행동.<br>좋아하는 티는 몸짓으로 보여줘요.':'좋으면 바로 좋아하는 티를 내요.<br>같은 외형, 조금 다른 마음의 표현.'}</p><div class="metrics"><div class="metric"><label>배고픔</label><span class="value">${Math.round(v.hunger)}<small>/100</small></span></div><div class="metric"><label>활력</label><span class="value">${Math.round(v.stamina)}<small>/100</small></span></div></div><div class="row"><strong>성장 기록</strong><span>${v.exp.toFixed(1)} EXP</span></div><div class="row"><strong>방의 상태</strong><span class="tag">${esc(v.clean)}</span></div><button id="greetNow" class="primary">구름콘 부르기</button>${s.poop&&!s.facilities.toilet?'<button id="cleanNow" class="secondary" style="width:100%">방 정리하기</button>':''}<p class="center-note">배고픔·활력·성장은 게임 시연 데이터입니다.<br>실제 활동·수면을 읽지 않으며 진화는 연결하지 않았습니다.</p>`);
  $('greetNow').onclick=()=>{closeSheet();interact('greet');};if($('cleanNow'))$('cleanNow').onclick=()=>{command('clean');renderSheet(kind);};
 }else{
  baseSheet('방의 설정','FLOOR NAVIGATION · 03',`<p class="copy">승인한 아기형과 츤데레 모션을<br>이동·식사·수면·기록에 연결한 시연판입니다.</p><button id="deviceCheck" class="secondary" style="width:100%;margin-bottom:10px">휴대폰 점검 · 저장 / 화면 / 설치</button><div class="subheading">성격 비교</div><div class="choice"><button id="reserved" class="${s.personality==='reserved'?'active':''}">츤데레 아이</button><button id="expressive" class="${s.personality==='expressive'?'active':''}">솔직한 아이</button></div><p class="center-note">성격으로 식사량·성장·회복이 불리해지지 않아요.</p><div class="row"><div><strong>움직임 줄이기</strong><small>장식 배회·탄성·환경 움직임을 줄입니다.</small></div>${toggle('reduceToggle','움직임 줄이기',reduced)}</div><div class="row"><div><strong>작은 한마디</strong><small>행동의 분위기를 담은 짧은 말풍선</small></div>${toggle('speechToggle','작은 한마디',showSpeech)}</div><div class="subheading">검증용 시간 · 합성 활동</div><div class="test-actions"><button id="advance30" class="secondary">시간 +30분</button><button id="away3" class="secondary">자리 비움 3시간</button><button id="steps1000" class="secondary">예시 걸음 +1,000</button><button id="callPet" class="secondary">구름콘 부르기</button></div><p class="center-note">전경에서는 이 도구로 생활 시간을 진행합니다.<br>다시 열면 저장 시각 이후의 부재를 조건에 맞게 정산해요.<br>실제 건강정보·계정·결제·서버를 사용하지 않습니다.</p>${session.warning?`<p class="warning">${esc(session.warning)}</p>`:'<p class="center-note">이 브라우저의 로컬 저장소에 시연 기록을 보관합니다.</p>'}<button id="resetDemo" class="danger-lite">이번 생활 시연판만 처음으로</button>`);
  $('deviceCheck').onclick=()=>openSheet('device');
  for(const p of ['reserved','expressive'])$(p).onclick=()=>{if(actor.busy){toast('하던 일을 마친 뒤 비교해주세요.');return;}releasePress(true);actor.cancel();command('personality',{value:p});if(state().mode!=='awake')actor.syncMode(state().mode);persist();renderSheet(kind);};
  $('reduceToggle').onclick=()=>{reduced=!reduced;actor.setReduced(reduced);persist();renderSheet(kind);};
  $('speechToggle').onclick=()=>{showSpeech=!showSpeech;if(!showSpeech)$('speech').classList.remove('on');persist();renderSheet(kind);};
  const tools=()=>{if(actor.busy){toast('하던 일을 마친 뒤 시간을 바꿔주세요.');return false;}releasePress(true);actor.cancel();closeSheet();return true;};
  $('advance30').onclick=()=>{if(!tools())return;command('advance',{milliseconds:1800000});actor.syncMode(state().mode);pumpMeals();toast('게임 시간 30분을 진행했어요.');};
  $('away3').onclick=()=>{if(!tools())return;command('away',{milliseconds:10800000});command('return');actor.syncMode(state().mode);pumpMeals();toast('기존 재고로 가능한 3시간의 생활을 정산했어요.');};
  $('steps1000').onclick=()=>{if(!tools())return;command('activity',{totalSteps:state().activity.steps+1000});actor.syncMode(state().mode);pumpMeals();toast('예시 걸음으로 먹이와 코인을 모았어요.');};
  $('callPet').onclick=()=>{closeSheet();interact('greet');};
  $('resetDemo').onclick=()=>{if(!confirm('이번 생활 시연판의 기록만 초기화할까요? 이전 방·모션 파일의 저장은 건드리지 않습니다.'))return;reset();closeSheet();toast('처음의 방으로 돌아왔어요.');};
 }
}
function positionTarget(id,p,w,h){const n=$(id);n.style.left=p[0]+'px';n.style.top=p[1]+'px';n.style.width=w+'px';n.style.height=h+'px';}
function targets(){if(!renderer)return;
 if(walkDestination&&actor.action==='move'){
  const p=renderer.project([walkDestination[0],.035,walkDestination[1]]),m=$('moveTarget');m.hidden=false;m.style.left=p[0]+'px';m.style.top=p[1]+'px';
 }else if(walkDestination)clearFloorTarget();
 const unit=renderer.width/renderer.worldW,s=actor.scale;
 positionTarget('petTarget',renderer.project([actor.x,actor.y+1.13*s,actor.z]),Math.max(62,unit*2.62*s),Math.max(70,unit*2.65*s));
 const T=scene.layout.table,K=scene.layout.cushion;positionTarget('tableTarget',renderer.project([T[0],.43,T[2]]),Math.max(52,unit*1.55),Math.max(46,unit*.9));positionTarget('cushionTarget',renderer.project([K[0],.22,K[2]]),unit*1.85,Math.max(46,unit*.87));positionTarget('ballTarget',renderer.project(scene.ball.p),48,48);
 const p=renderer.project([actor.x,actor.y+2.63*s,actor.z]);$('speech').style.left=Math.max(65,Math.min(renderer.width-65,p[0]))+'px';$('speech').style.top=(p[1]-8)+'px';
}
function resize(){if(!renderer)return;const vv=window.visualViewport;if(vv&&Math.abs(vv.scale-1)<.02)document.documentElement.style.setProperty('--visible-height',Math.round(vv.height)+'px');renderer.dpr=Math.min(devicePixelRatio||1,AruconMobile.quality==='light'?1:1.65);const b=app.getBoundingClientRect();renderer.resize(b.width,b.height);updateWalkableBounds();targets();render();}
function present(dt,wander=false){actor.update(dt,state().mode,wander&&!sheet.open&&!session.pendingMeal());pumpMeals();
 const target=state().mode!=='awake'||actor.action==='sleep'||actor.action==='sleeping'?1:0;renderer.night+=(target-renderer.night)*(1-Math.exp(-dt*1.35));scene.skySun.color=RoomGL.color(renderer.night>.5?0xe2e8d9:0xfff3c7);
 const T=scene.layout.table,K=scene.layout.cushion,P=scene.layout.plant;renderer.shadows.fill(0);renderer.shadows.set([actor.x,actor.z,.82,.23,T[0],T[2],.84,.13,K[0],K[2],.92,.15,P[0],P[2],.60,.15]);
 if(lastPhase!==actor.phase){lastPhase=actor.phase;if(actor.action==='greet'&&actor.phase.includes('딴청'))speak('… 왜.');else if(actor.action==='ball'&&actor.phase.includes('툭'))speak(state().personality==='reserved'?'한 번만이야.':'받아!');else if(actor.holding)speak(state().personality==='reserved'?'… 그쪽 말고, 여기.':'좋아, 조금 더!');}
 syncUI();}
function render(){if(renderBlocked)return;renderer.render(scene.root);targets();if(window.AruconMobile)AruconMobile.afterRender();}
function startLoop(){if(!rafId&&!paused&&!document.hidden&&!renderBlocked)rafId=requestAnimationFrame(loop);}
function stopLoop(){if(rafId)cancelAnimationFrame(rafId);rafId=0;lastFrame=0;pacer.reset();}
function loop(now){rafId=0;if(paused||document.hidden||renderBlocked)return;
 const fps=AruconMobile.quality==='light'?AruconMotion.settings.lightFrameCap:AruconMotion.settings.standardFrameCap;
 const tick=pacer.take(now,fps);if(!tick){startLoop();return;}
 if(tick.elapsedMs)AruconMobile.sampleFrame(tick.elapsedMs);
 lastFrame=now;frames++;present(tick.dt,true);render();startLoop();}

function reset(){if(!session.reset())return false;clearFloorTarget();lastFloorTap=null;clearTimeout(toastTimer);clearTimeout(speechTimer);$('toast').classList.remove('on');$('speech').classList.remove('on');actor.cancel();playingMeal=null;actor.x=0;actor.y=0;actor.z=1.8;actor.yaw=-.06;actor.press=actor.pressVelocity=0;actor.wander=0;scene.ball.p=scene.layout.ball.slice();scene.food.visible=false;reduced=pref.matches;actor.setReduced(reduced);showSpeech=false;syncUI();present(0);render();persist();return true;}
function suspend(){clearFloorTarget();stopLoop();if(session.hiddenAt!==null)return;AruconMobile.interruptMeasurement();releasePress(true);if(!['sleeping','hibernating'].includes(actor.action))actor.cancel();playingMeal=null;session.setPosition(actor);session.suspend();}
function resume(){if(document.hidden||session.hiddenAt===null){startLoop();return;}session.resume();actor.syncMode(state().mode);lastFrame=0;pumpMeals();syncUI();render();startLoop();}
try{
 let storage=null;try{storage=window.localStorage;}catch(e){}
 const prefix='life-'+Math.floor(Math.random()*0x100000000).toString(36);
 session=new AruconSession.Session({engine:E,config:C,storage,prefix});reduced=pref.matches||session.reduced;showSpeech=session.speech;
 renderer=new RoomGL.Renderer(canvas);renderer.dpr=Math.min(devicePixelRatio||1,AruconMobile.quality==='light'?1:1.65);scene=AruconScene.createRoom();scene.hearts.forEach(n=>n.visible=false);
 asset=AruconPetAsset.loadGLB(AruconPetAsset.decode($('glb-data').textContent.trim()));actor=new AruconLifeActor.Actor(scene,asset,{onDone:done,reduced});actor.setProfile(state().personality);
 if(session.position){Object.assign(actor,session.position);}actor.syncMode(state().mode);
 $('foodButton').onclick=()=>openSheet('food');$('decorButton').onclick=()=>openSheet('decor');$('journalButton').onclick=()=>openSheet('journal');$('menuButton').onclick=()=>openSheet('settings');$('infoButton').onclick=()=>openSheet('info');$('sleepButton').onclick=sleepToggle;$('closeSheet').onclick=closeSheet;$('tableTarget').onclick=()=>openSheet('food');$('cushionTarget').onclick=()=>interact('cushion');$('ballTarget').onclick=()=>interact('ball');
 sheet.addEventListener('click',e=>{if(e.target===sheet){const b=sheet.getBoundingClientRect();if(e.clientY<b.top||e.clientX<b.left||e.clientX>b.right)closeSheet();}});sheet.addEventListener('cancel',()=>currentSheet='');
 const hit=$('petTarget');hit.addEventListener('pointerdown',e=>{if(e.isPrimary===false||e.button>0)return;e.preventDefault();AruconMobile.inputReceived();const b=hit.getBoundingClientRect();if(beginPress(e.clientX<b.x+b.width/2?-1:1)){pointerOwner=e.pointerId;hit.setPointerCapture(e.pointerId);}});
 hit.addEventListener('pointermove',e=>{if(pointerOwner!==e.pointerId||!actor.holding)return;const b=hit.getBoundingClientRect();actor.petSide=e.clientX<b.x+b.width/2?-1:1;});
 hit.addEventListener('pointerup',e=>{if(pointerOwner===e.pointerId)releasePress(false);});for(const event of ['pointercancel','lostpointercapture'])hit.addEventListener(event,e=>{if(pointerOwner===e.pointerId)releasePress(true);});
 hit.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();if(!e.repeat)beginPress(1);}});hit.addEventListener('keyup',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();releasePress(false);}});hit.addEventListener('blur',()=>{if(actor.holding)releasePress(true);});
 canvas.addEventListener('pointerdown',onFloorTap);
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();paused=true;renderBlocked=true;stopLoop();persist();$('failure').hidden=false;$('failureText').textContent=session.allowSave?'그래픽 연결이 끊겼어요. 기록을 저장했습니다. 새로고침해주세요.':'그래픽 연결이 끊겼고 저장도 사용할 수 없어요. 현재 시연 기록은 이 창에만 있습니다.';});
 window.addEventListener('resize',resize);if(window.visualViewport)window.visualViewport.addEventListener('resize',resize);window.addEventListener('pagehide',suspend);window.addEventListener('pageshow',resume);window.addEventListener('blur',()=>releasePress(true));
 window.addEventListener('storage',e=>{if(e.key===AruconSession.KEY){session.conflict();toast(session.warning);}});
 document.addEventListener('visibilitychange',()=>document.hidden?suspend():resume());
 pref.addEventListener('change',e=>{reduced=e.matches;actor.setReduced(reduced);persist();});
 window.addEventListener('keydown',e=>{if(e.key==='F2'){e.preventDefault();openSheet('settings');}});
 window.AruconLifeTest={
  get state(){return session.snapshot();},get actor(){return actor.stats();},get stats(){return {ready,frames,draws:renderer.draws,reduced,pending:session.pendingMeal(),playingMeal,storeWarning:session.warning,canSave:session.allowSave,readOnly:session.readOnly,worldWidth:renderer.worldW,petScale:actor.scale,meshCount:asset.parts.length,clipCount:Object.keys(asset.clips).length,rafScheduled:!!rafId,lastSaveOk:session.lastSaveOk,lastSaveAt:session.lastSaveAt,quality:AruconMobile.quality};},
  command:(t,d={})=>{const r=command(t,d);if(['away','return'].includes(t))actor.syncMode(state().mode);pumpMeals();present(0);render();return r;},
  open:openSheet,close:closeSheet,interact,sleepToggle,move:floorMove,project:p=>renderer.project(p),get floorInput(){return {lastTap:lastFloorTap,destination:walkDestination?.slice()||null,bounds:scene.layout.bounds};},
  pause(v=true){paused=v;lastFrame=0;if(v)stopLoop();else startLoop();},step(dt,wander=false){present(dt,wander);render();},advance(seconds,wander=false){const n=Math.ceil(seconds*30);for(let i=0;i<n;i++)present(Math.min(1/30,seconds-i/30),wander);render();},
  setHolding(v,side=1){if(v)beginPress(side);else releasePress(false);present(0);render();},cancelTouch(){releasePress(true);present(0);render();},
  setReduced(v){reduced=!!v;actor.setReduced(reduced);persist();present(0);render();},setSpeech(v){showSpeech=!!v;persist();},
  reset,suspend,resume,save:persist,session,scene,asset,renderer
 };
 resize();present(0);render();ready=true;persist();if(session.restoredMeals)toast(`부재 중 ${session.restoredMeals}번의 식사를 정산했어요.`);else if(session.warning)toast(session.warning);
 hintTimer=setTimeout(hideHint,15000);AruconMobile.boot({session,renderer,requestOpen:()=>openSheet('device'),showToast:toast});startLoop();
}catch(e){$('failure').hidden=false;$('failureText').textContent=e.message||String(e);console.error(e);}
})();
