"""Create Hybrid C in Blender from immutable A design geometry, with new face/rig/motion.

Run with the approved project-local Blender --background --factory-startup
--offline-mode --python-exit-code 1 --python art/reboot-03-1/build_hybrid_baby.py.
The editable file retains modeling topology, shape keys, weights and actions.
The game uses in-place skeletal clips; its existing navigation owns root travel.
"""
from pathlib import Path
import bpy
import math
import json
import hashlib
import bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "mobile/assets/reboot-03-1"
A_PATH = ROOT / "mobile/assets/reboot-02/baby-gait.glb"
A_SHA = hashlib.sha256(A_PATH.read_bytes()).hexdigest()
assert A_SHA == "6ae771875c6da450d3f81b7c76985071568e84c504cd18e50ef15d2adcbedeb1"
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.render.fps = 30
scene.frame_start, scene.frame_end = 0, 90
characters = bpy.data.collections.new("C_Hybrid_Character")
scene.collection.children.link(characters)

def own(obj):
    for collection in list(obj.users_collection):
        collection.objects.unlink(obj)
    characters.objects.link(obj)
    return obj

def material(name, color, roughness=.86, metallic=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    rgb = [int(color[i:i+2], 16)/255 for i in (1, 3, 5)]
    linear = [v/12.92 if v < .04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    node = mat.node_tree.nodes.get("Principled BSDF")
    node.inputs["Base Color"].default_value = (*linear, 1)
    node.inputs["Roughness"].default_value = roughness
    node.inputs["Metallic"].default_value = metallic
    mat.diffuse_color = (*linear, 1)
    return mat

skin = material("Mochi_Warm_Cream", "#f4eee9")
ink = material("Soft_Charcoal_Face", "#3b3546", .95)
blush = material("Blush", "#e8b5c6", .95)
pearl = material("Single_Pearl_Horn", "#dcd9f2", .48, .06)
accent = material("Pastel_Blue", "#d5e5ef", .84)
shine = material("Eye_Catchlight", "#faf6f0", .95)

def mesh(name, verts, faces, mat):
    data = bpy.data.meshes.new(name + "_EditableTopology")
    data.from_pydata(verts, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    characters.objects.link(obj)
    obj.data.materials.append(mat)
    for polygon in data.polygons:
        polygon.use_smooth = True
    return obj

def sphere(name, location, radius, mat, segments=24, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings)
    obj = own(bpy.context.object)
    obj.name = name
    # Apply actual vertex shaping, not an object-scale silhouette comparison.
    for vertex in obj.data.vertices:
        q = vertex.co.copy()
        vertex.co = Vector((q.x*radius[0]+location[0], q.y*radius[1]+location[1], q.z*radius[2]+location[2]))
    obj.data.materials.append(mat)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return obj

# Bake only a read-only input copy to Blender coordinates, then delete imported
# controller/actions. A/B files are never written. This is not a plain re-export:
# C reworks facial surfaces, adds a real weighted rig, merges opaque skin and
# authors sparse bone actions while retaining A's silhouette and large paws.
bpy.ops.import_scene.gltf(filepath=str(A_PATH))
scene.frame_set(0);bpy.context.view_layer.update()
needed = ["Body", "Sole_L_Front", "Sole_R_Front", "EarShell-1", "EarShell1", "EarTint-1", "EarTint1", "PearlHorn", "HornSpiral", "HatDome", "HatBand"]
reference = {}
for name in needed:
    obj = bpy.data.objects[name]
    reference[name] = ([tuple(obj.matrix_world @ v.co) for v in obj.data.vertices], [tuple(p.vertices) for p in obj.data.polygons])
bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
# Imported actions must not leak root scale/morph clips into C's own export.
for old in list(bpy.data.actions):bpy.data.actions.remove(old)
def from_A(name, source, mat):
    verts, faces = reference[source]
    return mesh(name, verts, faces, mat)
body = from_A("Body", "Body", skin)
# Weld the UV seam and poles without moving surface samples or subdividing.
bm=bmesh.new();bm.from_mesh(body.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(body.data);bm.free();body.data.update()
body_part_vertices=len(body.data.vertices)
bvh = BVHTree.FromObject(body, bpy.context.evaluated_depsgraph_get())

def surface(x, z, stand_off=.003):
    hit, normal, _, _ = bvh.ray_cast(Vector((x, -2, z)), Vector((0, 1, 0)), 4)
    if hit is None:
        raise RuntimeError(f"Face vertex leaves the actual sculpted volume: {x}, {z}")
    return hit + normal*stand_off

def patch(name, x, z, width, height, mat, transforms=None, offset=.003, rings=3):
    points = [(0, 0)]
    count = 32
    for ring in range(1, rings+1):
        for j in range(count):
            a = j/count*math.tau
            points.append((math.cos(a)*ring/rings, math.sin(a)*ring/rings))
    faces = [(0, 1+j, 1+(j+1)%count) for j in range(count)]
    for ring in range(1, rings):
        for j in range(count):
            a, b = 1+(ring-1)*count+j, 1+ring*count+j
            a1, b1 = 1+(ring-1)*count+(j+1)%count, 1+ring*count+(j+1)%count
            faces.extend([(a, b, a1), (b, b1, a1)])
    obj = mesh(name, [surface(x+u*width, z+v*height, offset) for u, v in points], faces, mat)
    if transforms:
        obj.shape_key_add(name="Basis")
        for key, transform in transforms.items():
            block = obj.shape_key_add(name=key)
            for vertex, (u, v) in zip(block.data, points):
                px, pz = transform(u, v)
                vertex.co = surface(px, pz, offset)
    return obj

def eyelid(name, x, z, w, h, forms):
    # A narrow cream rim with an open centre: less overdraw, same eye aperture.
    points=[(math.cos(j/32*math.tau),math.sin(j/32*math.tau),outer) for outer in [0,1] for j in range(32)]
    faces=[]
    for j in range(32):
        k=(j+1)%32;faces.extend([(j,32+j,k),(32+j,32+k,k)])
    def coords(u,v,outer,transform=None):
        px,pz=transform(u,v) if transform else (x+u*w,z+v*h)
        if outer:px+=u*.007;pz+=v*.008
        return surface(px,pz,.0025)
    obj=mesh(name,[coords(u,v,o) for u,v,o in points],faces,skin)
    obj.shape_key_add(name="Basis")
    for key,f in forms.items():
        block=obj.shape_key_add(name=key)
        for q,(u,v,o)in zip(block.data,points):q.co=coords(u,v,o,f)
    return obj

face_objects = []
for side in (-1, 1):
    x, z, w, h = side*.208, 1.105, .084, .096
    eye_forms = {
        "Blink": lambda u,v,x=x,z=z,w=w: (x+u*w, z+.010+v*.007-.008*(1-u*u)),
        "Surprised": lambda u,v,x=x,z=z,w=w,h=h: (x+u*w*1.10,z+v*h*1.28),
        "Curious": lambda u,v,x=x,z=z,w=w,h=h,side=side: (x+u*w,z+v*h*(1.18 if side<0 else .90)),
        "Happy": lambda u,v,x=x,z=z,w=w: (x+u*w,z+.015+v*.026+.030*(1-u*u)),
        "Mischief": lambda u,v,x=x,z=z,w=w,side=side: (x+u*w,z+v*.047-side*u*.017),
        "Sleepy": lambda u,v,x=x,z=z,w=w: (x+u*w,z-.013+v*.022),
    }
    lid_forms = dict(eye_forms)
    # Thin fitted skin rim shares the eye closure rather than floating over it.
    face_objects.append(eyelid(f"Lid_{side}",x,z,w,h,lid_forms))
    eye_name = "Eye_L" if side<0 else "Eye_R"
    face_objects.append(patch(eye_name,x,z,w,h,ink,eye_forms,.006))
    face_objects.append(patch(f"EyeSpark{side}",x-side*.019,z+.026,.016,.020,shine,offset=.009,rings=1))
    cx, cz = side*.29,z-.135
    face_objects.append(patch(f"Cheek{side}",cx,cz,.082,.025,blush,offset=.004,rings=2))
    face_objects.append(patch(f"Brow_{side}",x,z+.147,w*.73,.008,ink,{
        "Lift": lambda u,v,x=x,z=z,w=w,side=side: (x+u*w*.73,z+.175+v*.008-side*u*.009),
        "Mischief": lambda u,v,x=x,z=z,w=w,side=side: (x+u*w*.73,z+.139+v*.008+side*u*.023),
    },.006,rings=2))
mouth_z = .900
face_objects.append(patch("Mouth",0,mouth_z,.061,.016,ink,{
    "Smile": lambda u,v: (u*.092,mouth_z+v*.029-.024*(1-u*u)),
    "Open": lambda u,v: (u*.052,mouth_z+v*.066),
    "Playful": lambda u,v: (u*.075+.013,mouth_z+v*.020+.027*u),
    "Bashful": lambda u,v: (u*.045,mouth_z+v*.010+.008*math.cos(u*4)),
},.006))

paws, ears = [], []
for side, suffix in [(-1,"L"),(1,"R")]:
    paws.append(from_A("PawMesh_"+suffix,"Sole_"+suffix+"_Front",skin))
    ears.append((from_A("EarShell_"+suffix,"EarShell"+str(side),skin),suffix))
    ears.append((from_A("EarTint_"+suffix,"EarTint"+str(side),accent),suffix))
horn=from_A("PearlHorn","PearlHorn",pearl)
spiral=from_A("PearlHornSpiral","HornSpiral",accent)
hat=bpy.data.objects.new("RebootHat",None);characters.objects.link(hat)
hat_dome=from_A("HatDome","HatDome",accent);hat_dome.parent=hat
hat_band=from_A("HatBand","HatBand",pearl);hat_band.parent=hat

# Real armature and normalized vertex weights in .blend and exported skin.
armature=bpy.data.armatures.new("Baby_Control_And_Deform_Rig")
rig=bpy.data.objects.new("AruconRoot",armature);characters.objects.link(rig)
bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode="EDIT")
bone_specs={
    "Root":((0,0,.08),(0,0,.38),None),
    "BodyBone":((0,0,.38),(0,0,1.03),"Root"),
    "HeadBone":((0,0,1.03),(0,0,1.66),"BodyBone"),
    "Paw.L":((-.265,-.10,.21),(-.265,-.10,.43),"Root"),
    "Paw.R":((.265,-.10,.21),(.265,-.10,.43),"Root"),
    "Ear.L":((-.54,.02,1.27),(-.60,.02,1.48),"HeadBone"),
    "Ear.R":((.54,.02,1.27),(.60,.02,1.48),"HeadBone"),
    "HornBone":((0,-.16,1.60),(0,-.16,1.84),"HeadBone"),
}
for name,(head,tail,parent) in bone_specs.items():
    b=armature.edit_bones.new(name);b.head=head;b.tail=tail
    if parent:b.parent=armature.edit_bones[parent]
bpy.ops.object.mode_set(mode="OBJECT");rig.select_set(False)

def smoothstep(t):
    t=max(0,min(1,t));return t*t*(3-2*t)

def body_weights(co):
    head=smoothstep((co.z-.82)/.44)
    root=(1-head)*(1-smoothstep((co.z-.18)/.50))
    return {"HeadBone":head,"Root":root,"BodyBone":1-head-root}

def bind(obj, weights):
    groups={name:obj.vertex_groups.new(name=name) for name in bone_specs}
    for vertex in obj.data.vertices:
        values=weights(vertex.co);total=sum(values.values())
        for name,weight in values.items():
            if weight>1e-8:groups[name].add([vertex.index],weight/total,"REPLACE")
    modifier=obj.modifiers.new("Authored_Vertex_Weights","ARMATURE");modifier.object=rig
    if obj.parent is None:obj.parent=rig

bind(body,body_weights)
for obj in face_objects:bind(obj,body_weights)
for obj,side in zip(paws,["L","R"]):
    def paw_weights(co,side=side):
        seam=.45*smoothstep((co.z-.28)/.14)
        return {"Paw."+side:1-seam,"BodyBone":seam}
    bind(obj,paw_weights)
for obj,side in ears:bind(obj,lambda co,side=side:{"Ear."+side:.68,"HeadBone":.32})
for obj in [horn,spiral]:bind(obj,lambda co:{"HornBone":.35,"HeadBone":.65})
bind(hat_dome,lambda co:{"HeadBone":1})
bind(hat_band,lambda co:{"HeadBone":1})
hat.parent=rig


# Join only opaque parts with the same material. Preserve skin weights and mesh
# part provenance; do not put body/ears/paws into facial CPU morph buffers.
def join_parts(active, parts):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in parts:obj.select_set(True)
    bpy.context.view_layer.objects.active=active;bpy.ops.object.join()
    # Same actual material used by every joined part; one slot -> one primitive.
    active.data.materials.clear();active.data.materials.append(skin if active is body else accent)
    for poly in active.data.polygons:poly.material_index=0
    for mod in list(active.modifiers):
        if mod.type=="ARMATURE" and mod!=active.modifiers[0]:active.modifiers.remove(mod)
    return active
skin_parts=[body,*paws,*[o for o,s in ears if o.name.startswith("EarShell")]]
part_info={o.name:{"vertices":len(o.data.vertices)} for o in skin_parts}
accents=[spiral,*[o for o,s in ears if o.name.startswith("EarTint")]]
join_parts(body,skin_parts)
join_parts(spiral,accents);spiral.name="PastelAccents"

# A separate guide keeps authoring root motion in .blend. Runtime navigation
# owns travel/flight, so the guide is detached during in-place glTF export.
guide=bpy.data.objects.new("AuthoringRootMotionGuide",None);scene.collection.objects.link(guide);rig.parent=guide
actions={}
def reset_pose():
    for bone in rig.pose.bones:
        bone.rotation_mode="XYZ";bone.location=(0,0,0);bone.rotation_euler=(0,0,0);bone.scale=(1,1,1)

def action(name,seconds,pose):
    rig.animation_data_create();rig.animation_data.action=None
    frames=round(seconds*30)
    samples={(b.name,dp):[] for b in rig.pose.bones for dp in ("location","rotation_euler","scale")}
    for f in range(frames+1):
        reset_pose();pose(f/frames)
        for (bn,dp),values in samples.items():values.append(tuple(getattr(rig.pose.bones[bn],dp)))
    for (bn,dp),values in samples.items():
        rest=(1,1,1) if dp=="scale" else (0,0,0)
        if all(all(abs(a-b)<1e-8 for a,b in zip(v,rest)) for v in values):continue
        for f,v in enumerate(values):
            setattr(rig.pose.bones[bn],dp,v);rig.pose.bones[bn].keyframe_insert(data_path=dp,frame=f)
    a=rig.animation_data.action;a.name=name;a.use_fake_user=True;actions[name]=a

def idle(t):
    b=rig.pose.bones;b["BodyBone"].scale=(1+.004*math.sin(t*math.tau),1+.012*math.sin(t*math.tau),1+.004*math.sin(t*math.tau))
    b["HeadBone"].rotation_euler.z=.013*math.sin(t*math.tau)

def walk(t):
    b=rig.pose.bones;phase=t*math.tau
    b["BodyBone"].rotation_euler.z=.042*math.sin(phase)
    b["BodyBone"].rotation_euler.x=.028*math.cos(phase*2)
    b["HeadBone"].rotation_euler.z=-.028*math.sin(phase)
    for i,name in enumerate(["Paw.L","Paw.R"]):
        p=(t+i*.5)%1
        if p<.6:stride=.255-.85*p;lift=0;toe=0
        else:q=(p-.6)/.4;stride=-.255+.51*smoothstep(q);lift=.14*math.sin(math.pi*q);toe=.14*math.sin(math.pi*q)
        b[name].location=(0,lift,stride);b[name].rotation_euler.x=toe

def hop(t):
    b=rig.pose.bones;p=(min(.99999,t)*2)%1
    squash=.035*math.sin(p/.18*math.pi) if p<.18 else .050*math.sin((p-.76)/.24*math.pi) if p>=.76 else -.025
    b["BodyBone"].scale=(1+squash*.45,1-squash,1+squash*.45)
    b["HeadBone"].rotation_euler.x=-.050*math.sin(p*math.tau)
    b["Paw.L"].rotation_euler.x=.07*math.sin(p*math.tau);b["Paw.R"].rotation_euler.x=-.07*math.sin(p*math.tau)

def pet(t):
    b=rig.pose.bones;p=smoothstep(min(1,t*3))
    b["BodyBone"].scale=(1+.018*p,1-.035*p,1+.021*p)
    b["HeadBone"].rotation_euler.z=-.065*p;b["HeadBone"].rotation_euler.x=.050*p

def stop(t):
    b=rig.pose.bones;p=math.sin(t*math.pi)
    b["BodyBone"].rotation_euler.x=-.045*p
    b["BodyBone"].scale=(1+.012*p,1-.025*p,1+.012*p)
    b["HeadBone"].rotation_euler.x=.025*p

def sleeping(t):
    b=rig.pose.bones;p=.006*math.sin(t*math.tau)
    b["BodyBone"].scale=(1.065+p, .76+p, 1.045+p)
    b["HeadBone"].rotation_euler.x=.075
    b["HeadBone"].location.y=-.035

def release(t):
    pet((1-t)/3)

action("idle_reserved",3,idle);action("idle_expressive",3,idle)
action("walk",1,walk);action("baby_hop",.9,hop)
action("pet_reserved",1.2,pet);action("pet_expressive",1.2,pet)
action("baby_release",.7,release);action("baby_stop",.32,stop);action("sleep",3,sleeping)
# Guide curves are genuine editable root trajectories, not runtime rewards.
guide.animation_data_create()
for name in ["walk","baby_hop"]:
    guide.animation_data.action=None
    for f in range(31):
        t=f/30
        if name=="walk":guide.location=(0,-.85*t,0)
        else:
            q=(min(.99999,t)*2)%1;y=0
            if .18<=q<.76:u=(q-.18)/.58;y=.19*4*u*(1-u)
            guide.location=(0,0,y)
        guide.keyframe_insert("location",frame=f)
    guide.animation_data.action.name="AuthoringGuide_"+name;guide.animation_data.action.use_fake_user=True
guide.animation_data.action=None;guide.location=(0,0,0)
rig.animation_data.action=actions["idle_reserved"]
scene.frame_set(0);reset_pose()

rig["artCandidate"]="hybrid"
rig["authoredInBlender"]=bpy.app.version_string
rig["originalV8Imported"]=True
rig["sourceV8Sha256"]=A_SHA
rig["staticEarRest"]=True
rig["runtimeRootTravelOwner"]="existing mobile navigation and BabyGait"
rig["reviewApproval"]="USER_REVIEW_PENDING"

# Useful editor lighting/cameras, excluded from the game export.
studio=bpy.data.collections.new("Authoring_Studio_Not_Game_Export");scene.collection.children.link(studio)
for name,location,energy,size in [("Key",(-3,-5,6),450,5),("Fill",(4,-2,3),220,4)]:
    data=bpy.data.lights.new(name,"AREA");data.energy=energy;data.shape="DISK";data.size=size
    obj=bpy.data.objects.new(name,data);studio.objects.link(obj);obj.location=location
    obj.rotation_euler=(Vector((0,0,.9))-obj.location).to_track_quat("-Z","Y").to_euler()
cam_data=bpy.data.cameras.new("StudioCamera");camera=bpy.data.objects.new("StudioCamera",cam_data);studio.objects.link(camera)
camera.location=(0,-6,2.7);camera.rotation_euler=(Vector((0,0,.95))-camera.location).to_track_quat("-Z","Y").to_euler();cam_data.type="ORTHO";cam_data.ortho_scale=2.8;scene.camera=camera
scene.world.color=(.35,.35,.35)
scene.render.resolution_x=512;scene.render.resolution_y=512;scene.render.resolution_percentage=100
blend=Path(__file__).parent/"arucon_baby_C.blend"
bpy.ops.wm.save_as_mainfile(filepath=str(blend),compress=True)

bpy.ops.object.select_all(action="DESELECT")
rig.parent=None
for obj in characters.objects:obj.select_set(True)
bpy.context.view_layer.objects.active=rig
glb=OUT/"hybrid-baby.glb"
bpy.ops.export_scene.gltf(filepath=str(glb),export_format="GLB",use_selection=True,export_yup=True,
    export_animations=True,export_animation_mode="ACTIONS",export_force_sampling=True,export_optimize_animation_size=True,export_optimize_animation_keep_anim_armature=False,
    export_texcoords=False,export_skins=True,export_morph=True,export_morph_normal=True,export_extras=True)
rig.parent=guide
bpy.ops.wm.save_as_mainfile(filepath=str(blend),compress=True)
info={"candidate":"C_HYBRID","blenderVersion":bpy.app.version_string,"blenderBuildHash":bpy.app.build_hash.decode(),
    "source":"art/reboot-03-1/build_hybrid_baby.py","blend":"art/reboot-03-1/arucon_baby_C.blend","runtime":"mobile/assets/reboot-03-1/hybrid-baby.glb",
    "originalV8Imported":True,"sourceV8Sha256":A_SHA,"importIsReadOnly":True,"skinParts":part_info,"bodySilhouetteSource":"A unchanged surface samples, welded seam","defaultModel":"A_V8_UNCHANGED","finalAdoption":"USER_REVIEW_PENDING",
    "hornCount":1,"visiblePaws":2,"boneNames":list(bone_specs),"actions":list(actions),
    "shapeKeys":{o.name:[k.name for k in o.data.shape_keys.key_blocks] for o in face_objects if o.data.shape_keys},
    "bodyVertices":body_part_vertices,"joinedSkinVertices":len(body.data.vertices),"sha256":hashlib.sha256(glb.read_bytes()).hexdigest(),"bytes":glb.stat().st_size,
    "rootMotion":"editable guide retained in blend; game uses in-place skeletal clips and common navigation",
    "runtimeRig":"Paw.L/R bones; engine adds non-rendering Foot_L/R_Front control proxies"}
(OUT/"manifest.json").write_text(json.dumps(info,ensure_ascii=False,indent=2)+"\n")
print("BLENDER_AUTHORED_HYBRID_C",json.dumps(info,ensure_ascii=False))
