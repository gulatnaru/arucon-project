(function(root){'use strict';
const G=root.RoomGL,{Node}=G;
const SP=G.sphere(),BX=G.box(),CY=G.lathe([[0,-.5],[.94,-.5],[1,-.43],[1,.43],[.94,.5],[0,.5]],40);
const C={cream:0xfaf6eb,pet:0xfffaf2,pink:0xeebcb7,ink:0x4b4749,wood:0xceab85,sage:0xa4b5a3};
function mesh(parent,g,c,p=[0,0,0],s=[1,1,1],kind=0){return parent.add(new Node(g,c,kind).pos(...p).scale(...s));}
const sphere=(p,c,pos,s)=>mesh(p,SP,c,pos,s),box=(p,c,pos,s,kind=0)=>mesh(p,BX,c,pos,s,kind),cyl=(p,c,pos,s)=>mesh(p,CY,c,pos,s);
function group(p,pos=[0,0,0]){return p.add(new Node().pos(...pos));}
function createRoom(){const root=new Node();
 const layout={petScale:.62,table:[2.28,0,.10],cushion:[-2.05,0,.20],ball:[1.35,.19,3.10],plant:[-2.8,0,-3.65],toilet:[-2.60,0,-1.62],bounds:{x:[-2.65,2.65],z:[-2.5,4.25]},floorBounds:{x:[-9,9],z:[-4.80,12]}};
 // floorBounds describes the existing floor mesh and front of the back wall.
 // bounds is its viewport-safe walkable inset, recomputed after camera resize.
 box(root,0xe9d8be,[0,-.12,1],[18,.2,22],1);
 box(root,0xf2eee2,[0,3.4,-5.10],[18,7,.15]);
 box(root,0xc1ceba,[0,.52,-4.97],[18,1.15,.13]);
 box(root,0xe9e5d8,[0,1.10,-4.85],[18,.09,.19]);
 box(root,0xd5d9c9,[0,.08,-4.80],[18,.13,.22]);
 for(let x=-6;x<6;x+=.55)box(root,0xb9c6b2,[x,.53,-4.87],[.018,.93,.04]);
 // One arched window; no external background raster.
 const win=group(root,[-.45,2.05,-4.92]);mesh(win,G.arch(1.15,2.65),0xc6ba9f);mesh(win,G.arch(1.02,2.43),0xcde2e4,[0,.12,.028],[1,1,1],3);
 box(win,0xf7f3e9,[0,1.35,.065],[.065,2.4,.055]);box(win,0xf7f3e9,[0,1.10,.073],[2.06,.065,.06]);
 box(win,0xe5d3b7,[0,.06,.16],[2.52,.13,.48]);
 const skySun=sphere(win,0xfff3c7,[-.56,1.8,.09],[.24,.24,.015]);skySun.kind=4;
 // Clouds outside sit behind the mullions without moving the whole room.
 const cloud=group(win,[.45,1.61,.052]);for(let [x,y,s] of [[-.22,0,.2],[0,.07,.27],[.25,0,.16]])sphere(cloud,0xf7faf3,[x,y,0],[s,s*.6,.015]).kind=4;
 // Two soft curtains, narrow enough to leave the scene uncluttered.
 const curtains=[];for(let side of [-1,1]){const c=group(root,[side*1.3-.45,3.45,-4.67]);for(let j=0;j<5;j++)sphere(c,j%2?0xe8e4d8:0xf5f0e4,[side*j*.06,0,.025*Math.sin(j)],[.095,1.34,.07]);sphere(c,0xdfd4bd,[side*.11,-.15,.11],[.2,.055,.09]);curtains.push(c);}
 // A small, quiet framed botanical print.
 const frame=group(root,[2.03,3.16,-4.81]);box(frame,0xbba68c,[0,0,0],[.83,1.05,.07]);box(frame,0xf7f0df,[0,0,.045],[.68,.89,.025]);sphere(frame,0xb9c5aa,[-.08,-.06,.074],[.13,.24,.013]).rot(0,0,-.28);sphere(frame,0xdbaa8f,[.13,.18,.074],[.12,.12,.013]);box(frame,0xb5b797,[-.02,-.22,.084],[.016,.22,.009]);
 // Central woven rug with a soft bound edge.
 const rug=group(root,[0,.013,1.70]).scale(1.30,1,1.35);let rugEdge=sphere(rug,0xd2be9c,[0,0,0],[2.05,.016,1.4]);rugEdge.kind=2;let rugTop=sphere(rug,0xeee2c8,[0,.012,0],[1.99,.014,1.35]);rugTop.kind=2;
 // Narrow seam ring, understated rather than decorative clutter.
 mesh(rug,G.torus(1,.009),0xd4c3a6,[0,.028,0],[1.83,1,1.18]);
 // Table and handmade ceramic bowl. Eating target is behind the bowl.
 const table=group(root,layout.table).scale(.86,.48,.86);for(let [x,z] of [[-.48,-.34],[.48,-.34],[-.48,.34],[.48,.34]])cyl(table,0xbe9b75,[x,.31,z],[.075,.61,.075]);sphere(table,0xcdac87,[0,.61,0],[.88,.125,.62]);sphere(table,0xe3c39b,[0,.68,0],[.87,.065,.61]);
 const bowl=group(table,[-.10,.72,-.32]);mesh(bowl,G.lathe([[0,0],[.21,0],[.28,.05],[.33,.19],[.32,.24],[.285,.24],[.235,.085],[0,.065]],48),0xf8eedb);mesh(bowl,G.torus(.303,.021),0xf6ead3,[0,.235,0]);
 const food=group(bowl,[0,.11,0]);for(let i=0;i<7;i++){let a=i*2.4,r=i?.14:0;sphere(food,[0xd69d67,0xc98a5f,0xe2ad72][i%3],[Math.cos(a)*r,.02+(.015*(i%2)),Math.sin(a)*r],[.077,.045,.067]);}food.visible=false;
 // Lavender cushion, with separate piping and a recessed tuft.
 const cushion=group(root,layout.cushion).scale(1.00,.73,1.00);sphere(cushion,0xb1a0ba,[0,.12,0],[.91,.14,.68]);sphere(cushion,0xc9bad0,[0,.26,0],[.85,.22,.63]);mesh(cushion,G.torus(1,.018),0xe1d7e5,[0,.23,0],[.85,1,.62]);sphere(cushion,0xb6a4c1,[0,.455,0],[.06,.012,.06]);
 // Plant near the wall.
 const plant=group(root,layout.plant);mesh(plant,G.lathe([[0,0],[.23,0],[.32,.54],[.35,.57],[.31,.62],[0,.59]],40),0xd5b69b);cyl(plant,0x76886a,[0,1.00,0],[.018,.9,.018]);const leaves=[];for(let i=0;i<6;i++){let dir=i%2?-1:1;let leaf=sphere(plant,[0x92a080,0xa3af8d,0x869978][i%3],[dir*(.15+(i%3)*.07),.83+i*.14,.025],[.15,.31,.045]);leaf.rot(0,dir*.15,dir*-.6);leaves.push({node:leaf,base:dir*-.6});}
 // Toy and toilet are hidden until owned in the domain.
 const ball=group(root,layout.ball);sphere(ball,0xdca28c,[0,0,0],[.22,.22,.22]);mesh(ball,G.torus(.218,.027),0xffe6c4).rot(Math.PI/2,.3,.4);ball.visible=false;
 const toilet=group(root,layout.toilet).scale(.82);sphere(toilet,0x9fac96,[0,.48,0],[.64,.63,.54]);sphere(toilet,0xd1d8bd,[0,.20,.37],[.52,.18,.30]);sphere(toilet,0x657862,[0,.42,.42],[.38,.4,.02]);sphere(toilet,0xf1e6cb,[0,.12,.49],[.37,.055,.25]);toilet.visible=false;
 const heartRoot=group(root),hearts=[];for(let i=0;i<3;i++){let h=group(heartRoot);sphere(h,0xdc9b9b,[-.055,.045,0],[.077,.085,.025]).rot(0,0,-.4);sphere(h,0xdc9b9b,[.055,.045,0],[.077,.085,.025]).rot(0,0,.4);sphere(h,0xdc9b9b,[0,-.02,0],[.085,.095,.025]);h.visible=false;hearts.push(h);}
 const motes=[];for(let i=0;i<5;i++){let m=sphere(root,0xfff6da,[-1+i*.43,1.5+i*.35,-3.6+i*.12],[.012,.012,.012]);m.kind=4;m.alpha=.25;motes.push(m);}
 return {layout,leaves,motes,root,table,bowl,food,cushion,plant,ball,toilet,curtains,skySun,cloud,hearts};
}
root.AruconScene={createRoom};
})(window);
