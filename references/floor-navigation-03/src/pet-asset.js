/* Delivered GLB loader/sampler extracted from motion 02; geometry and clips are unchanged. */
(function(){
 const G=window.RoomGL,lerp=(a,b,t)=>a+(b-a)*t;
  function decode(b64) { const s=atob(b64), b=new Uint8Array(s.length); for(let i=0;i<s.length;i++) b[i]=s.charCodeAt(i); return b.buffer; }
  function loadGLB(array) {
    const v=new DataView(array);
    if(v.getUint32(0,true)!==0x46546c67 || v.getUint32(4,true)!==2) throw Error('올바른 GLB 파일이 아닙니다.');
    const size=v.getUint32(12,true), json=JSON.parse(new TextDecoder().decode(new Uint8Array(array,20,size))), offset=28+size;
    const widths={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
    const access=i=>{const a=json.accessors[i], bv=json.bufferViews[a.bufferView], off=offset+(bv.byteOffset||0)+(a.byteOffset||0), T=a.componentType===5126?Float32Array:Uint16Array;return new T(array,off,a.count*widths[a.type]);};
    const wrap=new G.Node(), root=wrap.add(new G.Node()), nodes=[root], parts=[];
    const targetNames=json.meshes[0].extras.targetNames, targetCount=targetNames.length;
    for(let i=1;i<json.nodes.length;i++) {
      const d=json.nodes[i], mesh=json.meshes[d.mesh], p=mesh.primitives[0], pos=access(p.attributes.POSITION), normal=access(p.attributes.NORMAL);
      const factor=json.materials[p.material].pbrMetallicRoughness.baseColorFactor;
      const srgb=c=>c<=.0031308?c*12.92:1.055*Math.pow(c,1/2.4)-.055;
      const geo={p:new Float32Array(pos),n:new Float32Array(normal),idx:access(p.indices),c:p.attributes.COLOR_0!==undefined?access(p.attributes.COLOR_0):null};
      const node=root.add(new G.Node(geo));node.color=factor.slice(0,3).map(srgb);node.name=d.name;
      nodes.push(node);parts.push({node,geo,pos,normal,targets:p.targets.map(t=>({p:access(t.POSITION),n:access(t.NORMAL)})),weights:new Float32Array(targetCount)});
    }
    // GLB includes zero morph targets on parts unaffected by a facial controller.
    // Skip those targets without changing geometry, poses, or the original asset.
    for(const part of parts)part.activeTargets=part.targets.map((t,i)=>t.p.some(v=>v!==0)||t.n.some(v=>v!==0)?i:-1).filter(i=>i>=0);
    const clips={};
    for(const a of json.animations) clips[a.name]={name:a.name,duration:a.extras.durationSeconds,loop:a.extras.loop,phases:a.extras.phases||[],channels:a.channels.map(c=>{
      const s=a.samplers[c.sampler],path=c.target.path;
      return {node:c.target.node,path,times:access(s.input),values:access(s.output),width:path==='weights'?targetCount:path==='rotation'?4:3};
    })};
    return {json,wrap,root,nodes,parts,clips,targetNames,targetCount};
  }
  function sampleChannel(c,t) {
    const n=c.times.length;
    if(t<=c.times[0])return c.values.slice(0,c.width);
    if(t>=c.times[n-1])return c.values.slice((n-1)*c.width,n*c.width);
    let i=Math.min(n-2,Math.floor(t/c.times[n-1]*(n-1)));
    while(c.times[i]>t)i--;while(c.times[i+1]<t)i++;
    const f=(t-c.times[i])/(c.times[i+1]-c.times[i]),out=new Float32Array(c.width);
    for(let k=0;k<c.width;k++)out[k]=lerp(c.values[i*c.width+k],c.values[(i+1)*c.width+k],f);
    return out;
  }

window.AruconPetAsset={decode,loadGLB,sampleChannel};
})();
