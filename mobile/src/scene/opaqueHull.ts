import * as THREE from 'three';

/** Load-time conservative test. Open surfaces, degenerate/mixed winding and
 * inward shells keep their source rendering. No vertices/indices are changed. */
export function closedOutwardHull(g: THREE.BufferGeometry): boolean {
  const p=g.getAttribute('position'), idx=g.getIndex();if(!p||!idx||idx.count%3)return false;
  const ids:number[]=[],keys=new Map<string,number>(),parents:number[]=[];
  for(let i=0;i<p.count;i++){
    const xyz=[p.getX(i),p.getY(i),p.getZ(i)];if(!xyz.every(Number.isFinite))return false;
    const key=xyz.map(v=>Math.round(v*1e5)).join(':');let id=keys.get(key);
    if(id===undefined){id=keys.size;keys.set(key,id);parents.push(id);}ids.push(id);
  }
  const root=(i:number):number=>{while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i];}return i;};
  const edges=new Map<string,{count:number;balance:number}>(),faces:{v:number;volume:number}[]=[];
  for(let t=0;t<idx.count;t+=3){
    const a=idx.getX(t),b=idx.getX(t+1),c=idx.getX(t+2),v=[ids[a],ids[b],ids[c]];
    if(v.some(x=>x===undefined))return false;if(new Set(v).size<3)continue;
    parents[root(v[1])]=root(v[0]);parents[root(v[2])]=root(v[0]);
    for(let k=0;k<3;k++){const x=v[k],y=v[(k+1)%3],key=x<y?`${x}:${y}`:`${y}:${x}`;const e=edges.get(key)??{count:0,balance:0};e.count++;e.balance+=x<y?1:-1;edges.set(key,e);}
    const ax=p.getX(a),ay=p.getY(a),az=p.getZ(a),bx=p.getX(b),by=p.getY(b),bz=p.getZ(b),cx=p.getX(c),cy=p.getY(c),cz=p.getZ(c);
    faces.push({v:v[0],volume:(ax*(by*cz-bz*cy)+ay*(bz*cx-bx*cz)+az*(bx*cy-by*cx))/6});
  }
  if(!faces.length||[...edges.values()].some(e=>e.count!==2||e.balance!==0))return false;
  const volumes=new Map<number,number>();for(const f of faces){const r=root(f.v);volumes.set(r,(volumes.get(r)??0)+f.volume);}
  return [...volumes.values()].every(v=>v>1e-10);
}

export function canCullOpaqueHull(g:THREE.BufferGeometry,m:THREE.Material){
 return m.side===THREE.DoubleSide&&!m.transparent&&m.opacity===1&&m.alphaTest===0&&closedOutwardHull(g);
}
