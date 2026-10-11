"""One review-only room concept. Never loaded by the game or its save service.
Run with the already approved project Blender. Uses the unchanged baby GLB,
room coordinates and orthographic camera. This is an offline concept, not runtime evidence.
"""
from pathlib import Path
import bpy
from mathutils import Vector
import math, json, hashlib

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'evidence/reboot-04-emotion-2026-10-11/room-concept'
OUT.mkdir(exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, color, rough=.8):
    m = bpy.data.materials.new(name); m.diffuse_color = (*color, 1); m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value = (*color, 1); p.inputs['Roughness'].default_value = rough
    return m

cream = material('Warm cream plaster', (.83, .77, .65))
wood = material('Pale warm oak', (.63, .46, .29))
wood2 = material('Quiet oak variation', (.69, .52, .34))
edge = material('Ivory trim', (.91, .85, .72))
sage = material('Soft sage facility', (.43, .54, .43))
inside = material('Facility entry shade', (.19, .25, .20))
pot = material('Matte terracotta pot', (.64, .38, .25))
leaves = material('Living leaves', (.24, .39, .23))
stem = material('Plant stem', (.26, .31, .15))
linen = material('Linen rug', (.77, .68, .52))
stitch = material('Rug woven border', (.60, .51, .37))
lavender = material('Cushion cotton', (.56, .47, .62))
sky = material('Window daylight', (.64, .80, .86))

# Game x,y,z maps to Blender x,-z,y.
def pos(p): return (p[0], -p[2], p[1])
def cube(name, at, size, mat, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos(at)); o=bpy.context.object; o.name=name
    o.dimensions=(size[0],size[2],size[1]); bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(mat)
    if bevel:
        b=o.modifiers.new('Soft crafted edge','BEVEL');b.width=bevel;b.segments=3
        o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return o
def oval(name, at, scale, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, location=pos(at));o=bpy.context.object;o.name=name
    o.scale=(scale[0],scale[2],scale[1]);o.data.materials.append(mat)
    for p in o.data.polygons:p.use_smooth=True
    return o
def cylinder(name, at, radius, height, mat, top=None):
    bpy.ops.mesh.primitive_cone_add(vertices=48,radius1=radius,radius2=top if top is not None else radius,depth=height,location=pos(at));o=bpy.context.object;o.name=name;o.data.materials.append(mat)
    b=o.modifiers.new('Small rounded rim','BEVEL');b.width=.025;b.segments=3;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');return o

cube('Floor foundation',(0,-.12,1),(18,.20,22),wood)
# Geometry-only board seams, no downloaded texture or new production material.
for i in range(26):
    x=-9+i*.7
    cube('Quiet wide oak board',(x+.345,-.014,1),(.688,.022,22),wood if i%3 else wood2,.008)
cube('Cream back wall',(0,3.4,-5.1),(18,7,.15),cream)
cube('Low skirting',(0,.13,-4.98),(18,.24,.10),edge,.02)
cube('Window frame',(-.45,2.18,-4.91),(2.35,2.8,.10),edge,.055)
cube('Daylight glass',(-.45,2.18,-4.82),(2.08,2.52,.05),sky,.035)
cube('Window mullion',(-.45,2.18,-4.75),(.065,2.52,.065),edge,.012)
cube('Window crossbar',(-.45,2.0,-4.74),(2.12,.065,.065),edge,.012)
cube('Window ledge',(-.45,.80,-4.65),(2.56,.12,.43),wood2,.035)
oval('Woven edge',(0,.038,1.7),(2.67,.024,1.89),stitch)
oval('Linen rug',(0,.059,1.7),(2.57,.022,1.80),linen)
oval('Cushion seam',(-1.6,.13,.2),(.87,.12,.63),stitch)
oval('Lavender cushion',(-1.6,.23,.2),(.85,.21,.61),lavender)

# Existing green sphere is the basic toilet, not a toy. Keep its exact site.
cylinder('Basic toilet base',(-1.95,.14,-1.62),.47,.24,edge)
hood=oval('Basic toilet rounded cover',(-1.95,.40,-1.62),(.51,.49,.43),sage)
# An entry front inset makes the role legible without changing its game policy.
oval('Toilet entry recess',(-1.95,.31,-1.223),(.26,.27,.025),inside)
cube('Toilet threshold',(-1.95,.12,-1.13),(.54,.08,.32),edge,.035)
cylinder('Plant pot',(-2.8,.25,-3.65),.27,.48,pot,.33)
cylinder('Soil',(-2.8,.49,-3.65),.29,.025,inside)
cylinder('Plant stem',(-2.8,.9,-3.65),.025,.82,stem)
for i in range(6):
    s=-1 if i%2 else 1
    leaf=oval('Plant leaf',(-2.8+s*.20,.7+i*.11,-3.65),(.25,.075,.13),leaves)
    leaf.rotation_euler.y=s*.38

# Import original candidate byte-for-byte; do not sculpt/overwrite it for the room.
asset=ROOT/'mobile/assets/reboot-04/baby-two-paws.glb'
before=set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(asset))
imported=set(bpy.data.objects)-before
bpy.ops.object.empty_add(type='PLAIN_AXES',location=pos((0,0,1.8)));anchor=bpy.context.object;anchor.name='Unchanged two paw baby at game size'
for o in imported:
    if o.parent not in imported:o.parent=anchor
    if 'Hat' in o.name:o.hide_render=True
    if o.type=='ARMATURE':
        o.animation_data_clear()
        for bone in o.pose.bones:bone.matrix_basis.identity()
    if o.type=='MESH' and o.data.shape_keys:
        for k in o.data.shape_keys.key_blocks:k.value=0
anchor.scale=(.7155,)*3

scene=bpy.context.scene
bpy.ops.object.camera_add(location=pos((0,9.2,13.5)));camera=bpy.context.object
camera.rotation_euler=(Vector(pos((0,0,1.4)))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO';camera.data.ortho_scale=13.6;camera.data.sensor_fit='VERTICAL';scene.camera=camera
# Offline concept lights. Runtime cost/implementation remains unapproved/unmeasured.
bpy.ops.object.light_add(type='AREA',location=(-3,1,7));light=bpy.context.object;light.data.energy=650;light.data.shape='DISK';light.data.size=7
light.rotation_euler=(Vector((0,-1,0))-light.location).to_track_quat('-Z','Y').to_euler()
scene.world.color=(.35,.35,.35);scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.78,.83,.9,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.55
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.threads_mode='FIXED';scene.render.threads=4
scene.render.resolution_x=1170;scene.render.resolution_y=2532;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(OUT/'sunlit-nest-concept.png')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'sunlit-nest-concept.blend'))
bpy.ops.render.render(write_still=True)
(OUT/'manifest.json').write_text(json.dumps({'kind':'OFFLINE_CONCEPT_NOT_RUNTIME','approval':'USER_REVIEW_PENDING','babyAsset':str(asset.relative_to(ROOT)),
 'babySha256':hashlib.sha256(asset.read_bytes()).hexdigest(),'screen':[1170,2532],'cameraGame':[0,9.2,13.5],'lookAtGame':[0,0,1.4],
 'verticalSpan':13.6,'petScale':.7155,'petPosition':[0,0,1.8],'gameDefaultChanged':False,'runtimeCost':'NOT_RUN','offlineRenderer':'Cycles CPU24 / denoise / AgX'},ensure_ascii=False,indent=2))
