/* Tiny offline WebGL renderer, authored for this visual prototype.
 * No external scripts, fonts, textures, telemetry or network requests.
 * Shapes + scene graph deliberately separate from AruconEngine.
 */
(function(root){'use strict';
const M={
 identity:()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),
 mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o;},
 trs(p,r,s){const [x,y,z]=r,cx=Math.cos(x),sx=Math.sin(x),cy=Math.cos(y),sy=Math.sin(y),cz=Math.cos(z),sz=Math.sin(z);let a=new Float32Array([cy*cz,cy*sz,-sy,0,sx*sy*cz-cx*sz,sx*sy*sz+cx*cz,sx*cy,0,cx*sy*cz+sx*sz,cx*sy*sz-sx*cz,cx*cy,0,p[0],p[1],p[2],1]);for(let j=0;j<3;j++)for(let i=0;i<3;i++)a[j*4+i]*=s[j];return a;},
 ortho(l,r,b,t,n,f){return new Float32Array([2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1]);},
 look(eye,target){const norm=v=>{let n=Math.hypot(...v)||1;return v.map(x=>x/n)},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);let z=norm(eye.map((v,i)=>v-target[i])),x=norm(cross([0,1,0],z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);},
 point(a,p){const v=[...p,1],o=[0,0,0,0];for(let i=0;i<4;i++)for(let j=0;j<4;j++)o[i]+=a[j*4+i]*v[j];return o.slice(0,3).map(n=>n/o[3]);},
 normal(a){const x=[a[0],a[1],a[2]],y=[a[4],a[5],a[6]],z=[a[8],a[9],a[10]],cross=(p,q)=>[p[1]*q[2]-p[2]*q[1],p[2]*q[0]-p[0]*q[2],p[0]*q[1]-p[1]*q[0]];let n1=cross(y,z),n2=cross(z,x),n3=cross(x,y),d=x[0]*n1[0]+x[1]*n1[1]+x[2]*n1[2];return new Float32Array([...n1,...n2,...n3].map(v=>v/(d||1)));}
};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function color(hex){return [hex>>16&255,hex>>8&255,hex&255].map(v=>v/255);}
class Node{
 constructor(g=null,c=0xffffff,kind=0){this.g=g;this.color=color(c);this.kind=kind;this.p=[0,0,0];this.r=[0,0,0];this.s=[1,1,1];this.children=[];this.visible=true;this.alpha=1;}
 add(n){this.children.push(n);return n;}
 pos(x,y,z){this.p=[x,y,z];return this;}
 scale(x,y=x,z=x){this.s=[x,y,z];return this;}
 rot(x=0,y=0,z=0){this.r=[x,y,z];return this;}
}
function lathe(points,segments=48){let p=[],n=[],idx=[];for(let i=0;i<points.length;i++){let a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],dr=b[0]-a[0],dy=b[1]-a[1],ll=Math.hypot(dr,dy)||1;for(let j=0;j<=segments;j++){let th=j/segments*Math.PI*2,cs=Math.cos(th),sn=Math.sin(th);p.push(points[i][0]*cs,points[i][1],points[i][0]*sn);n.push(dy/ll*cs,-dr/ll,dy/ll*sn);if(i<points.length-1&&j<segments){let k=i*(segments+1)+j;idx.push(k,k+segments+1,k+1,k+1,k+segments+1,k+segments+2);}}}return {p,n,idx};}
function sphere(){return lathe(Array.from({length:25},(_,i)=>{let a=i/24*Math.PI;return [Math.sin(a),-Math.cos(a)];}),32);}
function box(){let p=[],n=[],idx=[];const faces=[[[1,0,0],[1,-1,-1],[1,1,-1],[1,1,1],[1,-1,1]],[[-1,0,0],[-1,-1,1],[-1,1,1],[-1,1,-1],[-1,-1,-1]],[[0,1,0],[-1,1,-1],[-1,1,1],[1,1,1],[1,1,-1]],[[0,-1,0],[-1,-1,1],[-1,-1,-1],[1,-1,-1],[1,-1,1]],[[0,0,1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],[[0,0,-1],[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]]];for(let f of faces){let k=p.length/3;for(let v of f.slice(1)){p.push(...v.map(q=>q*.5));n.push(...f[0]);}idx.push(k,k+1,k+2,k,k+2,k+3);}return {p,n,idx};}
function torus(R=.8,r=.03){let p=[],n=[],idx=[],aN=64,bN=8;for(let i=0;i<=aN;i++)for(let j=0;j<=bN;j++){let a=i/aN*6.283185,b=j/bN*6.283185;p.push((R+r*Math.cos(b))*Math.cos(a),r*Math.sin(b),(R+r*Math.cos(b))*Math.sin(a));n.push(Math.cos(b)*Math.cos(a),Math.sin(b),Math.cos(b)*Math.sin(a));if(i<aN&&j<bN){let k=i*(bN+1)+j;idx.push(k,k+bN+1,k+1,k+1,k+bN+1,k+bN+2);}}return {p,n,idx};}
function arch(w=1,h=2.3){let pts=[[-w,0],[w,0],[w,h-w]];for(let i=1;i<=32;i++){let a=i/32*Math.PI;pts.push([Math.cos(a)*w,h-w+Math.sin(a)*w]);}let p=[0,h/2,0],n=[0,0,1],idx=[];pts.forEach(v=>{p.push(...v,0);n.push(0,0,1);});for(let i=1;i<=pts.length;i++)idx.push(0,i,i===pts.length?1:i+1);return{p,n,idx};}
// Smooth flattened ear tube. The pink inner follows the same silhouette, not a decal from a generated sheet.
function ear(side=1,inner=false){let p=[],n=[],idx=[],N=28,K=24;for(let i=0;i<=N;i++){let t=i/N,a=side===1? .48*t : -.5*t,cY=side===1? .95*t : .08*Math.sin(t*Math.PI)-.82*t;let dx=side===1?.48:-.5,dy=side===1?.95:.08*Math.PI*Math.cos(t*Math.PI)-.82,len=Math.hypot(dx,dy),nx=dy/len,ny=-dx/len;let rr=(.09+.14*Math.sin(t*Math.PI))*(1-Math.pow(t,12));if(inner)rr*=.63;for(let j=0;j<=K;j++){let q=j/K*2*Math.PI,cs=Math.cos(q),sn=Math.sin(q),depth=inner?.055:.145;p.push(a+nx*rr*cs,cY+ny*rr*cs,sn*depth*Math.sin((.08+.9*t)*Math.PI)+(inner?.095:0));n.push(nx*cs,ny*cs,sn);if(i<N&&j<K){let k=i*(K+1)+j;idx.push(k,k+1,k+K+1,k+1,k+K+2,k+K+1);}}}return {p,n,idx};}
const V=`attribute vec3 aPosition;attribute vec3 aNormal;attribute vec3 aColor;varying vec3 vColor;uniform mat4 uMVP,uModel;uniform mat3 uNormal;varying vec3 vWorld,vNormal;void main(){vColor=aColor;vWorld=(uModel*vec4(aPosition,1.)).xyz;vNormal=normalize(uNormal*aNormal);gl_Position=uMVP*vec4(aPosition,1.);}`;
const F=`precision highp float;varying vec3 vWorld,vNormal;varying vec3 vColor;uniform vec3 uColor,uEye;uniform float uKind,uNight,uAlpha;uniform vec4 uShadows[8];
float line(float v,float a){return 1.-smoothstep(0.,a,abs(v));}
void main(){vec3 n=normalize(vNormal),c=uColor*vColor;float key=max(0.,dot(n,normalize(vec3(-.55,.8,.65))));vec3 light=mix(vec3(.81,.79,.77),vec3(.88,.89,.88),n.y*.5+.5)+vec3(.14,.135,.125)*key;light*=mix(1.,.59,uNight);float occ=mix(.96,1.,clamp(vWorld.y*.6,0.,1.));
if(uKind>0.5&&uKind<1.5){float row=floor(vWorld.z*1.3);float seam=line(fract(vWorld.z*1.3)-.5,.009);float end=line(fract((vWorld.x+mod(row,2.)*1.8)/3.6)-.5,.003);float grain=sin(vWorld.x*31.+sin(vWorld.z*4.)*.4)*sin(vWorld.x*7.3+vWorld.z*2.5);c*=1.-.035*seam-.02*end+.007*grain;float sh=0.;for(int i=0;i<8;i++){vec4 o=uShadows[i];vec2 q=(vWorld.xz-o.xy)/max(.01,o.z);sh+=exp(-dot(q,q)*2.6)*o.w;}c*=1.-min(.34,sh);}
if((uKind>1.5&&uKind<2.5)||uKind>4.5){float grain=0.;float sh=0.;for(int i=0;i<8;i++){vec4 o=uShadows[i];vec2 q=(vWorld.xz-o.xy)/max(.01,o.z);sh+=exp(-dot(q,q)*2.6)*o.w;}c*=1.-min(.28,sh);}
if(uKind>2.5&&uKind<3.5){c=mix(vec3(.78,.89,.91),vec3(.89,.94,.88),clamp((4.8-vWorld.y)/2.,0.,1.));c=mix(c,vec3(.16,.23,.36),uNight);light=vec3(1.);occ=1.;}
if(uKind>3.5&&uKind<4.5){light=vec3(1.);occ=1.;}
if(uKind>4.5){light=vec3(1.);occ=1.;}vec3 v=normalize(uEye-vWorld),h=normalize(v+normalize(vec3(-.55,.8,.65)));float spec=pow(max(0.,dot(n,h)),35.)*.028;if(uKind>0.5)spec=0.;gl_FragColor=vec4(c*light*occ+spec,uAlpha);}`;
class Renderer{
 constructor(canvas){this.canvas=canvas;this.gl=canvas.getContext('webgl',{antialias:true,alpha:false,powerPreference:'low-power',preserveDrawingBuffer:true});if(!this.gl)throw Error('WebGL을 사용할 수 없습니다. Chrome 또는 Safari의 일반 브라우저에서 열어주세요.');let gl=this.gl;const shader=(type,src)=>{let s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};let p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,V));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,F));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));this.program=p;gl.useProgram(p);this.u={};for(let k of ['MVP','Model','Normal','Color','Eye','Kind','Night','Alpha','Shadows'])this.u[k]=gl.getUniformLocation(p,'u'+k+(k==='Shadows'?'[0]':''));this.aP=gl.getAttribLocation(p,'aPosition');this.aN=gl.getAttribLocation(p,'aNormal');this.aC=gl.getAttribLocation(p,'aColor');gl.enableVertexAttribArray(this.aC);gl.enableVertexAttribArray(this.aP);gl.enableVertexAttribArray(this.aN);gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);this.eye=[0,8.9,13.2];this.target=[0,1.4,.7];this.view=M.look(this.eye,this.target);this.night=0;this.shadows=new Float32Array(32);this.draws=0;this.dpr=Math.min(window.devicePixelRatio||1,1.65);}
 upload(g){if(g.buffers)return g;let gl=this.gl;if(!g.c)g.c=new Float32Array(g.p.length).fill(1);g.buffers={};for(let [name,data,target,Type] of [['p',g.p,gl.ARRAY_BUFFER,Float32Array],['n',g.n,gl.ARRAY_BUFFER,Float32Array],['c',g.c,gl.ARRAY_BUFFER,Float32Array],['idx',g.idx,gl.ELEMENT_ARRAY_BUFFER,Uint16Array]]){let b=gl.createBuffer();gl.bindBuffer(target,b);gl.bufferData(target,new Type(data),gl.STATIC_DRAW);g.buffers[name]=b;}return g;}
 resize(w,h){this.width=w;this.height=h;this.canvas.width=Math.round(w*this.dpr);this.canvas.height=Math.round(h*this.dpr);let worldW=6.8,hh=worldW*h/w;if(h/w<1.6){hh=11.0;worldW=hh*w/h;}this.proj=M.ortho(-worldW/2,worldW/2,-hh/2,hh/2,.1,80);this.vp=M.mul(this.proj,this.view);this.worldW=worldW;this.worldH=hh;}
 project(p){let a=M.point(this.vp,p);return [(a[0]+1)*.5*this.width,(1-a[1])*.5*this.height];}
 floorPoint(x,y){
  // Invert the two projected floor axes together; CSS coordinates, not device pixels.
  // The camera is orthographic. This is not a perspective-ray approximation.
  if(!Number.isFinite(x)||!Number.isFinite(y))return null;
  const o=this.project([0,0,0]),px=this.project([1,0,0]),pz=this.project([0,0,1]);
  const ax=px[0]-o[0],ay=px[1]-o[1],bx=pz[0]-o[0],by=pz[1]-o[1],det=ax*by-ay*bx;
  if(!Number.isFinite(det)||Math.abs(det)<1e-8)return null;
  return [((x-o[0])*by-(y-o[1])*bx)/det,0,(ax*(y-o[1])-ay*(x-o[0]))/det];
 }
 render(root){let gl=this.gl;gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(.91,.88,.81,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);gl.uniform3fv(this.u.Eye,this.eye);gl.uniform1f(this.u.Night,this.night);gl.uniform4fv(this.u.Shadows,this.shadows);this.draws=0;const walk=(node,parent)=>{if(!node.visible)return;let world=M.mul(parent,M.trs(node.p,node.r,node.s));if(node.g){let g=this.upload(node.g);if(g.dirty){for(let k of ['p','n']){gl.bindBuffer(gl.ARRAY_BUFFER,g.buffers[k]);gl.bufferSubData(gl.ARRAY_BUFFER,0,g[k]);}g.dirty=false;}gl.bindBuffer(gl.ARRAY_BUFFER,g.buffers.p);gl.vertexAttribPointer(this.aP,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,g.buffers.n);gl.vertexAttribPointer(this.aN,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,g.buffers.c);gl.vertexAttribPointer(this.aC,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,g.buffers.idx);gl.uniformMatrix4fv(this.u.Model,false,world);gl.uniformMatrix4fv(this.u.MVP,false,M.mul(this.vp,world));gl.uniformMatrix3fv(this.u.Normal,false,M.normal(world));gl.uniform3fv(this.u.Color,node.color);gl.uniform1f(this.u.Kind,node.kind);gl.uniform1f(this.u.Alpha,node.alpha);gl.drawElements(gl.TRIANGLES,g.idx.length,gl.UNSIGNED_SHORT,0);this.draws++;}node.children.forEach(c=>walk(c,world));};walk(root,M.identity());}
}
root.RoomGL={M,Node,Renderer,lathe,sphere,box,torus,arch,ear,clamp,color};
})(window);
