/* Mobile check instrumentation. Opt-in, bounded in-memory samples, no uploads.
 * A render interval is NOT GPU performance, battery use or glass-to-glass latency.
 */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.AruconMobile=api;})(typeof window!=='undefined'?window:globalThis,function(root){
'use strict';
const BUILD='floor-navigation-03',QA_KEY='arucon.mobile-check.qa.v1',PREF_KEY='arucon.mobile-check.preferences.v1';
const read=(key,backup)=>{try{const s=JSON.parse(root.localStorage?.getItem(key)||'null');return s&&typeof s==='object'?s:backup;}catch(_){return backup;}};
const write=(key,value)=>{try{root.localStorage.setItem(key,JSON.stringify(value));return true;}catch(_){return false;}};
const pref=read(PREF_KEY,{});let quality=pref.quality==='light'?'light':'standard';
const observations=[['face','작게 보여도 시크한 눈매가 읽혀요'],['touch','누르고 놓을 때 말캉한 반응이 자연스러워요'],['targets','버튼·펫·가구를 원하는 대로 누를 수 있어요'],['return','다른 앱에 다녀와도 식사·기록이 중복되지 않아요'],['save','완전히 닫았다 다시 열어도 같은 기록이 있어요']];
let qa=read(QA_KEY,{});if(qa.version!==1)qa={version:1,checks:{},comment:''};
qa.checks=qa.checks&&typeof qa.checks==='object'?qa.checks:{};qa.comment=typeof qa.comment==='string'?qa.comment.slice(0,500):'';
let env=null,measure=null,lastMeasurement=null,inputAt=null,lastReport=null,registration=null,swStatus='not-started',installPrompt=null;
const clock=()=>root.performance?root.performance.now():Date.now();
const round=n=>Math.round(n*10)/10;
function summarize(values){const v=values.filter(n=>Number.isFinite(n)&&n>0&&n<60000).sort((a,b)=>a-b);if(!v.length)return {samples:0,p50Ms:null,p95Ms:null,meanMs:null,over50ms:0};const p=n=>v[Math.ceil(v.length*n)-1];return {samples:v.length,p50Ms:round(p(.5)),p95Ms:round(p(.95)),meanMs:round(v.reduce((s,x)=>s+x,0)/v.length),over50ms:v.filter(n=>n>50).length};}
function stopMeasure(reason='complete'){
 if(!measure)return null;clearTimeout(measure.timer);const m=measure;measure=null;
 lastMeasurement={status:reason,durationSeconds:round((clock()-m.start)/1000),requestedFrameCap:m.cap,quality:m.quality,renderIntervals:summarize(m.frames),eventToRender:summarize(m.inputs),scope:'JavaScript event / render callback timing; not physical touch latency, GPU or battery measurement'};
 const banner=root.document?.getElementById('measureBanner');if(banner)banner.hidden=true;
 if(env)env.showToast(reason==='complete'?'30초 관찰이 끝났어요. 설정의 휴대폰 점검에서 확인해주세요.':'측정이 중단됐어요. 돌아온 뒤 다시 시작할 수 있어요.');return lastMeasurement;
}
function startMeasure(seconds=30){stopMeasure('replaced');measure={start:clock(),cap:quality==='light'?30:60,quality,frames:[],inputs:[],timer:null};inputAt=null;const banner=root.document?.getElementById('measureBanner');if(banner){banner.textContent='30초 화면 관찰 중 · 평소처럼 만져보세요';banner.hidden=false;}measure.timer=setTimeout(()=>stopMeasure('complete'),seconds*1000);}
function saveQA(){const ok=write(QA_KEY,qa);if(!ok&&env)env.showToast('체크 결과는 이 창에만 남아요. 보고서로 보관해주세요.');return ok;}
function getReport(){
 const s=env?.session,r=env?.renderer,nav=root.navigator||{};
 return {schemaVersion:1,build:BUILD,createdAt:new Date().toISOString(),verification:'User-entered observations; device class and physical-device execution are not certified by this report',viewport:{width:root.innerWidth||null,height:root.innerHeight||null,devicePixelRatio:root.devicePixelRatio||1,canvasWidth:r?.canvas.width||null,canvasHeight:r?.canvas.height||null},displayMode:(root.matchMedia&&root.matchMedia('(display-mode: standalone)').matches)||nav.standalone?'standalone':'browser',secureContext:!!root.isSecureContext,connectionHint:nav.onLine===false?'browser-reports-offline':'browser-reports-online-not-proof',serviceWorker:swStatus,storage:{lastWriteSucceeded:!!s?.lastSaveOk,readOnly:!!s?.readOnly,lastWriteAt:s?.lastSaveAt?new Date(s.lastSaveAt).toISOString():null,note:'A successful write is not proof of persistence across browser deletion or restart'},quality,measurement:lastMeasurement,observations:observations.map(([id,label])=>({id,label,userChecked:qa.checks[id]===true})),comment:qa.comment,note:'No health data, account ID, pet ledger, URL, IP address, full user-agent or automatic external upload included.'};
}
async function exportReport(){
 lastReport=JSON.stringify(getReport(),null,2);const b=new Blob([lastReport],{type:'application/json'}),name='arucon-mobile-check.json';
 try{const f=new File([b],name,{type:'application/json'});if(root.navigator?.canShare?.({files:[f]})){await root.navigator.share({files:[f],title:'아루콘 휴대폰 점검'});return 'shared';}}catch(e){if(e.name==='AbortError')return 'cancelled';}
 const url=URL.createObjectURL(b),a=root.document.createElement('a');a.href=url;a.download=name;root.document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);return 'download-requested';
}
function storageLabel(s){return s.readOnly?'다른 창 변경 · 읽기 전용':s.lastSaveOk?'최근 쓰기 성공':s.allowSave?'확인 전':'임시 메모리';}
function showPanel(ctx){
 const {baseSheet,closeSheet,toast,session,renderer,qualityChanged}=ctx;
 const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const mm=lastMeasurement?.renderIntervals,measureText=mm?`${mm.samples} 프레임 · 간격 p95 ${mm.p95Ms??'—'} ms`:'아직 측정하지 않았어요';
 const offline=swStatus==='ready'?'캐시 준비됨':swStatus==='update-waiting'?'업데이트 대기':swStatus==='unsupported-insecure'?'HTTPS에서 준비 가능':swStatus==='registering'?'파일 준비 중':'이 환경에서는 미확인';
 const html=`<p class="copy">여기는 휴대폰 체험을 점검하는 도구예요.<br>게임 규칙·캐릭터·말캉함은 바꾸지 않습니다.</p>
 <div class="device-grid"><div class="device-card"><small>이 창의 저장</small><strong>${storageLabel(session)}</strong></div><div class="device-card"><small>화면 / 그리기 해상도</small><strong>${Math.round(renderer.width)} × ${Math.round(renderer.height)}<br>${renderer.canvas.width} × ${renderer.canvas.height}</strong></div><div class="device-card"><small>홈 화면 실행</small><strong>${getReport().displayMode==='standalone'?'웹앱으로 열림':'브라우저로 열림'}</strong></div><div class="device-card"><small>오프라인 파일</small><strong id="offlineStatus">${offline}</strong></div></div>
 <p class="center-note">저장 쓰기 성공과 재실행 보존은 다릅니다.<br>같은 주소·같은 브라우저에서 닫았다가 다시 확인해주세요.</p>
 <div class="subheading">그리기 옵션</div><div class="choice"><button id="qualityStandard" class="${quality==='standard'?'active':''}">기본</button><button id="qualityLight" class="${quality==='light'?'active':''}">가볍게</button></div><p class="center-note">가볍게는 그리기 해상도와 요청 빈도만 줄여요.<br>실기기 성능·배터리 개선을 보장하는 설정은 아닙니다.</p>
 <div class="subheading">실행 중 30초 관찰</div><p class="progress-line" id="measurementStatus">${esc(measureText)}${lastMeasurement?.status&&lastMeasurement.status!=='complete'?' · 중단됨':''}</p><button id="measureNow" class="primary">30초 관찰 시작</button><p class="center-note">버튼을 누르면 방으로 돌아갑니다.<br>기록은 이 창에만 남으며 서버로 보내지 않아요.<br>프레임 간격은 배터리·터치 촉감 측정값이 아닙니다.</p>
 <div class="subheading">직접 확인한 것만 체크</div><ul class="device-list">${observations.map(([id,label])=>`<li><label class="device-check"><input type="checkbox" data-qa="${id}" ${qa.checks[id]===true?'checked':''}><span>${label}</span></label></li>`).join('')}</ul><textarea id="deviceComment" class="device-comment" maxlength="500" placeholder="어색했던 장면만 적어주세요. 개인정보는 넣지 마세요." aria-label="체험 메모">${esc(qa.comment)}</textarea><button id="exportDeviceReport" class="secondary" style="width:100%;margin-top:12px">점검 결과 파일로 보관</button><pre id="reportFallback" class="device-output" hidden></pre>
 <div class="subheading">홈 화면에서 열기</div><p class="copy">iPhone: Safari 공유 → 홈 화면에 추가.<br>‘웹 앱으로 열기’가 보이면 켜두세요.<br>Android: 브라우저 메뉴의 설치 / 홈 화면에 추가.</p><p class="center-note">홈 화면 아이콘으로 여는 웹앱입니다.<br>아이콘 뒤에서 움직이는 배경화면·위젯은 아니에요.<br>처음 오프라인 파일을 준비하려면 HTTPS 연결이 필요해요.</p>${installPrompt?'<button id="installMobile" class="primary">홈 화면에 설치</button>':''}${registration?.waiting?'<button id="applyMobileUpdate" class="secondary">준비된 업데이트 적용</button><p class="center-note">하던 식사·터치가 끝난 뒤 저장하고 다시 엽니다.</p>':''}<button id="refreshDevice" class="secondary" style="width:100%;margin-top:12px">표시 상태 새로 확인</button>`;
 baseSheet('휴대폰에서 만나요','DEVICE CHECK · 02',html);
 const $=id=>root.document.getElementById(id);
 for(const [id,q] of [['qualityStandard','standard'],['qualityLight','light']])$(id).onclick=()=>{quality=q;write(PREF_KEY,{quality});if(measure)stopMeasure('quality-changed');qualityChanged();showPanel(ctx);};
 $('measureNow').onclick=()=>{closeSheet();startMeasure();};
 root.document.querySelectorAll('[data-qa]').forEach(i=>i.onchange=()=>{qa.checks[i.dataset.qa]=i.checked;saveQA();});
 $('deviceComment').oninput=e=>{qa.comment=e.target.value.slice(0,500);saveQA();};
 $('exportDeviceReport').onclick=async()=>{try{const result=await exportReport();if(result==='download-requested')toast('파일 저장을 요청했어요. 아래에도 같은 내용을 표시합니다.');}catch(_){toast('파일 저장을 열지 못했어요. 아래 내용을 복사할 수 있습니다.');}if(lastReport){$('reportFallback').hidden=false;$('reportFallback').textContent=lastReport;}};
 if($('installMobile'))$('installMobile').onclick=async()=>{await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;showPanel(ctx);};
 if($('applyMobileUpdate'))$('applyMobileUpdate').onclick=()=>{if(ctx.isBusy()){toast('하던 일을 마친 뒤 적용해주세요.');return;}session.save();if(!session.lastSaveOk){toast('저장이 확인되지 않아 업데이트를 멈췄어요.');return;}const target=registration?.waiting;if(target){session.suspend();root.navigator.serviceWorker.addEventListener('controllerchange',()=>root.location.reload(),{once:true});target.postMessage({type:'ARUCON_ACTIVATE'});}};
 $('refreshDevice').onclick=()=>showPanel(ctx);
}
async function boot(options){
 env=options;
 if(root.addEventListener){root.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});root.addEventListener('appinstalled',()=>{installPrompt=null;});}
 const protocol=root.location?.protocol;if(protocol!=='http:'&&protocol!=='https:'){swStatus='file-preview';return;}
 if(!root.isSecureContext){swStatus='unsupported-insecure';return;}
 if(!root.navigator?.serviceWorker){swStatus='unsupported';return;}
 if(!root.document.querySelector('link[rel="manifest"]')){swStatus='standalone-file';return;}
 swStatus='registering';
 try{registration=await root.navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});swStatus=registration.waiting?'update-waiting':registration.active?'ready':'registering';registration.addEventListener('updatefound',()=>{const w=registration.installing;w?.addEventListener('statechange',()=>{if(w.state==='installed')swStatus=registration.waiting?'update-waiting':'ready';});});const ready=await root.navigator.serviceWorker.ready;swStatus=registration.waiting?'update-waiting':ready.active?'ready':'registering';}catch(_){swStatus='failed';}
}
return {BUILD,QA_KEY,PREF_KEY,summarize,get quality(){return quality;},get measurement(){return lastMeasurement;},get measuring(){return !!measure;},get serviceWorkerStatus(){return swStatus;},showPanel,boot,startMeasure,stopMeasure,interruptMeasurement:()=>{if(measure)stopMeasure('backgrounded');inputAt=null;},sampleFrame(ms){if(measure&&measure.frames.length<2000)measure.frames.push(ms);},inputReceived(){if(measure)inputAt=clock();},afterRender(){if(measure&&inputAt!==null){if(measure.inputs.length<100)measure.inputs.push(clock()-inputAt);inputAt=null;}},getReport,exportReport};
});
