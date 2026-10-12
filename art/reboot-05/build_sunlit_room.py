"""REBOOT-05 room B: authored geometry from the preserved sunlit concept.
No downloaded textures, no changes to character/source room/saves. Blender5.2.
"""
from pathlib import Path
import bpy, math, json, hashlib
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'art/reboot-05';ASSET=ROOT/'mobile/assets/reboot-05/sunlit-room.glb'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(name,rgb):
 m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb,1);p.inputs['Roughness'].default_value=.92;return m
oak=mat('quiet pale oak',(.59,.42,.27));oak2=mat('oak gentle variation',(.63,.46,.30));wall=mat('ivory plaster',(.83,.77,.65));trim=mat('cream trim',(.91,.85,.72));sky=mat('soft daylight',(.64,.80,.86));rug=mat('linen rug',(.77,.68,.52));edge=mat('woven edge',(.59,.49,.35));lavender=mat('cotton cushion',(.56,.47,.62));seam=mat('cushion seam',(.45,.37,.50));pot=mat('matte terracotta',(.59,.33,.22));leaf=mat('soft leaf',(.23,.39,.24));stem=mat('plant stem',(.25,.31,.17));sage=mat('sage facility',(.43,.54,.43));inside=mat('entry recess',(.17,.24,.19))
def group(name):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);return o
static=group('RoomStatic');cushion=group('Cushion');toilet=group('Toilet');table=group('Table')
def pos(p):return(p[0],-p[2],p[1])
def cube(name,at,size,material,parent,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=pos(at));o=bpy.context.object;o.name=name;o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.parent=parent;o.data.materials.append(material)
 if bevel:
  m=o.modifiers.new('soft edges','BEVEL');m.width=bevel;m.segments=3;o.modifiers.new('weighted normals','WEIGHTED_NORMAL')
 return o
def oval(name,at,size,material,parent,segments=48,rings=16):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=pos(at));o=bpy.context.object;o.name=name;o.scale=(size[0],size[2],size[1]);o.parent=parent;o.data.materials.append(material)
 for f in o.data.polygons:f.use_smooth=True
 return o
def cylinder(name,at,radius,height,material,parent,top=None):
 bpy.ops.mesh.primitive_cone_add(vertices=32,radius1=radius,radius2=top if top is not None else radius,depth=height,location=pos(at));o=bpy.context.object;o.name=name;o.parent=parent;o.data.materials.append(material);b=o.modifiers.new('rounded rim','BEVEL');b.width=.02;b.segments=3;o.modifiers.new('weighted normals','WEIGHTED_NORMAL');return o
cube('floor foundation',(0,-.12,1),(18,.16,22),oak,static)
for i in range(26):cube('wide quiet board',(-8.65+i*.7,-.031,1),(.688,.022,22),oak2 if i%3==0 else oak,static,.006)
cube('ivory back wall',(0,3.4,-5.1),(18,7,.15),wall,static)
cube('low skirting',(0,.13,-4.98),(18,.24,.10),trim,static,.02)
cube('window frame',(-.45,2.18,-4.91),(2.35,2.8,.10),trim,static,.05)
cube('daylight glass',(-.45,2.18,-4.82),(2.08,2.52,.05),sky,static,.025)
cube('mullion',(-.45,2.18,-4.75),(.065,2.52,.065),trim,static,.01)
cube('crossbar',(-.45,2,-4.74),(2.12,.065,.065),trim,static,.01)
cube('window ledge',(-.45,.8,-4.65),(2.56,.12,.43),oak2,static,.03)
oval('woven rug edge',(0,.015,1.7),(2.67,.020,1.89),edge,static,64,12)
oval('linen rug',(0,.037,1.7),(2.58,.015,1.82),rug,static,64,12)
cylinder('plant pot',(-2.8,.25,-3.65),.27,.48,pot,static,.33)
cylinder('soil',(-2.8,.49,-3.65),.28,.018,inside,static)
cylinder('stem',(-2.8,.9,-3.65),.025,.82,stem,static)
for i in range(6):
 s=-1 if i%2 else 1;o=oval('leaf',(-2.8+s*.20,.7+i*.11,-3.65),(.25,.075,.13),leaf,static,24,12);o.rotation_euler.y=s*.38
oval('cushion seam',(0,.10,0),(.88,.10,.64),seam,cushion)
oval('cotton cushion',(0,.21,0),(.85,.21,.61),lavender,cushion)
cylinder('facility base',(0,.14,0),.47,.24,trim,toilet)
hood=oval('rounded facility cover',(0,.40,0),(.51,.49,.43),sage,toilet)
bpy.context.view_layer.objects.active=hood;hood.select_set(True);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=1,depth=1,location=pos((0,.30,.48)))
cutter=bpy.context.object;cutter.name='temporary entrance cutter';cutter.scale=(.245,.265,.56);cutter.rotation_euler.x=math.pi/2
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
cut=hood.modifiers.new('actual rounded entrance','BOOLEAN');cut.operation='DIFFERENCE';cut.object=cutter
bpy.context.view_layer.objects.active=hood;bpy.ops.object.modifier_apply(modifier=cut.name);bpy.data.objects.remove(cutter,do_unlink=True)
oval('entry shaded back',(0,.30,.20),(.235,.245,.025),inside,toilet,32,12)
cube('threshold',(0,.12,.49),(.54,.08,.32),trim,toilet,.03)
for x in [-.42,.42]:
 for z in [-.27,.27]:cube('table leg',(x,.22,z),(.1,.37,.1),oak,table,.016)
oval('rounded tabletop',(0,.44,0),(.72,.1,.52),oak2,table)
oval('table bowl',(-.09,.54,-.23),(.22,.07,.18),trim,table,32,12)
# Save source with only room roles, so mutable props retain identity/pivots.
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'sunlit-room.blend'))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(ASSET),export_format='GLB',export_animations=False,export_texcoords=False,export_cameras=False,export_lights=False,export_apply=True,export_extras=True)
(OUT/'manifest.json').write_text(json.dumps({'candidate':'B_sunlit','approval':'USER_REVIEW_PENDING','sourceConcept':'art/reboot-04/room_concept.py','asset':str(ASSET.relative_to(ROOT)),'sha256':hashlib.sha256(ASSET.read_bytes()).hexdigest(),'roles':['RoomStatic','Cushion','Toilet','Table'],'camera':[0,9.2,13.5],'lookAt':[0,0,1.4],'verticalSpan':13.6,'defaultRoomChanged':False,'textures':'NONE','runtimeShadow':'procedural contact shadow; no GPU shadow-map','estimatedTriangleCount':sum(len(o.data.polygons)*2 for o in bpy.data.objects if o.type=='MESH'),'scope':'authored game meshes, same facilities/navigation; no new items'},ensure_ascii=False,indent=2))
print('ROOM_B_EXPORTED',ASSET.stat().st_size)
