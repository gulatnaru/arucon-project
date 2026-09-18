/* Fixed-layout, deterministic floor navigation. Not physics or free furniture placement. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AruconNavigation=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
function validPoint(p){return Array.isArray(p)&&p.length>=2&&p.every(Number.isFinite);}
function nearestFreePoint(goal,bounds,obs){
 if(!validPoint(goal))return null;
 const p=[clamp(goal[0],...bounds.x),clamp(goal[1],...bounds.z)];
 if(clearPoint(p,bounds,obs))return p;
 let best=null,distance=Infinity;
 const cols=Math.max(1,Math.ceil((bounds.x[1]-bounds.x[0])/.10)),rows=Math.max(1,Math.ceil((bounds.z[1]-bounds.z[0])/.10));
 for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
  const q=[bounds.x[0]+i/cols*(bounds.x[1]-bounds.x[0]),bounds.z[0]+j/rows*(bounds.z[1]-bounds.z[0])];
  const d=Math.hypot(q[0]-p[0],q[1]-p[1]);
  if(d<distance&&clearPoint(q,bounds,obs)){distance=d;best=q;}
 }
 return best;
}
function clearPoint(p,b,obs){return validPoint(p)&&p[0]>=b.x[0]&&p[0]<=b.x[1]&&p[1]>=b.z[0]&&p[1]<=b.z[1]&&!obs.some(o=>Math.hypot((p[0]-o.x)/o.rx,(p[1]-o.z)/o.rz)<1);}
function clearLine(a,b,bounds,obs){const n=Math.max(2,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.05));for(let i=0;i<=n;i++){const t=i/n;if(!clearPoint([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],bounds,obs))return false;}return true;}
function route(start,goal,bounds,obs){
 if(!validPoint(start)||!validPoint(goal))return [];
 const g=[clamp(goal[0],...bounds.x),clamp(goal[1],...bounds.z)];
 const pts=[],cols=Math.ceil((bounds.x[1]-bounds.x[0])/.20),rows=Math.ceil((bounds.z[1]-bounds.z[0])/.20);
 for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){const p=[bounds.x[0]+i/cols*(bounds.x[1]-bounds.x[0]),bounds.z[0]+j/rows*(bounds.z[1]-bounds.z[0])];pts.push(clearPoint(p,bounds,obs)?p:null);}
 const nearest=p=>{let at=-1,d=Infinity;pts.forEach((v,i)=>{if(v){const q=Math.hypot(v[0]-p[0],v[1]-p[1]);if(q<d){at=i;d=q;}}});return at;};
 const si=nearest(start),ti=nearest(g);if(si<0||ti<0)return [];
 const end=clearPoint(g,bounds,obs)?g:pts[ti];if(clearLine(start,end,bounds,obs))return [end];
 const costs=new Float64Array(pts.length).fill(Infinity),prev=new Int32Array(pts.length).fill(-1),open=new Set([si]);costs[si]=0;
 while(open.size){let u=-1,f=Infinity;for(const i of open){const n=costs[i]+Math.hypot(pts[i][0]-pts[ti][0],pts[i][1]-pts[ti][1]);if(n<f){u=i;f=n;}}if(u===ti)break;open.delete(u);const x=u%(cols+1),y=Math.floor(u/(cols+1));
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!(dx||dy))continue;const xx=x+dx,yy=y+dy;if(xx<0||xx>cols||yy<0||yy>rows)continue;const v=yy*(cols+1)+xx;if(!pts[v]||!clearLine(pts[u],pts[v],bounds,obs))continue;const d=costs[u]+Math.hypot(pts[u][0]-pts[v][0],pts[u][1]-pts[v][1]);if(d+1e-8<costs[v]){costs[v]=d;prev[v]=u;open.add(v);}}
 }
 if(!Number.isFinite(costs[ti]))return [];
 let rev=[],u=ti;while(u!==si&&u>=0){rev.push(pts[u]);u=prev[u];}rev.push(pts[si]);rev.reverse();rev.push(end);
 // Only authored docking departures can start inside a furniture footprint.
 let path=[],current=start,k=0;
 while(k<rev.length){let far=k;for(let j=k;j<rev.length;j++){if(clearLine(current,rev[j],bounds,obs))far=j;else break;}path.push(rev[far]);current=rev[far];k=far+1;}
 return path;
}
return {route,clearPoint,clearLine,nearestFreePoint};
});
