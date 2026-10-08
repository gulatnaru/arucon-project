"""Create candidate B in Blender. No import/re-export of candidate A.

Run with the approved project-local Blender --background --factory-startup
--offline-mode --python-exit-code 1 --python art/reboot-03/build_baby.py.
The editable file retains modeling topology, shape keys, weights and actions.
The game uses in-place skeletal clips; its existing navigation owns root travel.
"""
from pathlib import Path
import bpy
import math
import json
import hashlib
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "mobile/assets/reboot-03"
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.render.fps = 30
scene.frame_start, scene.frame_end = 0, 90
characters = bpy.data.collections.new("B_Authored_Character")
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
ink = material("Soft_Charcoal_Face", "#343040", .95)
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

body = sphere("Body", (0, 0, 0), (1, 1, 1), skin, 48, 32)
for vertex in body.data.vertices:
    q = vertex.co.copy()
    waist = 1 - .055*q.z + .025*(1-q.z*q.z)
    vertex.co = Vector((q.x*.70*waist, q.y*.64*(1+.04*(1-q.z*q.z)) - .025*(1-q.z*q.z)*max(0, -q.y), .90 + q.z*.825))
bpy.context.view_layer.objects.active = body
body.select_set(True)
subdivision = body.modifiers.new("Sculpted_Surface_Subdivision", "SUBSURF")
subdivision.levels = 1
bpy.ops.object.modifier_apply(modifier=subdivision.name)
body.select_set(False)
bvh = BVHTree.FromObject(body, bpy.context.evaluated_depsgraph_get())

def surface(x, z, stand_off=.003):
    hit, normal, _, _ = bvh.ray_cast(Vector((x, -2, z)), Vector((0, 1, 0)), 4)
    if hit is None:
        raise RuntimeError(f"Face vertex leaves the actual sculpted volume: {x}, {z}")
    return hit + normal*stand_off

def patch(name, x, z, width, height, mat, transforms=None, offset=.003):
    points = [(0, 0)]
    count, rings = 32, 4
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

face_objects = []
for side in (-1, 1):
    x, z, w, h = side*.208, 1.105, .084, .096
    eye_forms = {
        "Blink": lambda u,v,x=x,z=z,w=w: (x+u*w, z+.010+v*.007-.008*(1-u*u)),
        "Surprised": lambda u,v,x=x,z=z,w=w,h=h: (x+u*w*1.10,z+v*h*1.28),
        "Curious": lambda u,v,x=x,z=z,w=w,h=h,side=side: (x+u*w,z+v*h*(1.13 if side<0 else .96)),
        "Happy": lambda u,v,x=x,z=z,w=w: (x+u*w,z+.015+v*.026+.030*(1-u*u)),
        "Mischief": lambda u,v,x=x,z=z,w=w,side=side: (x+u*w,z+v*.047-side*u*.017),
        "Sleepy": lambda u,v,x=x,z=z,w=w: (x+u*w,z-.013+v*.022),
    }
    lid_forms = dict(eye_forms)
    # Thin fitted skin rim shares the eye closure rather than floating over it.
    face_objects.append(patch(f"Lid_{side}", x,z,w+.009,h+.009,skin,lid_forms,.0015))
    eye_name = "Eye_L" if side<0 else "Eye_R"
    face_objects.append(patch(eye_name,x,z,w,h,ink,eye_forms,.004))
    face_objects.append(patch(f"EyeSpark{side}",x-side*.019,z+.026,.016,.020,shine,offset=.007))
    cx, cz = side*.29,z-.135
    face_objects.append(patch(f"Cheek{side}",cx,cz,.080,.025,blush,{
        "Surprised": lambda u,v,cx=cx,cz=cz: (cx+u*.088,cz+v*.030),
        "Smile": lambda u,v,cx=cx,cz=cz: (cx+u*.078,cz+.010+v*.024),
        "Bashful": lambda u,v,cx=cx,cz=cz: (cx+u*.090,cz+v*.028),
    },.0025))
    face_objects.append(patch(f"Brow_{side}",x,z+.143,w*.72,.008,ink,{
        "Lift": lambda u,v,x=x,z=z,w=w,side=side: (x+u*w*.72,z+.171+v*.008-side*u*.009),
        "Mischief": lambda u,v,x=x,z=z,w=w,side=side: (x+u*w*.72,z+.139+v*.008+side*u*.023),
    },.003))
mouth_z = .923
face_objects.append(patch("Mouth",0,mouth_z,.061,.016,ink,{
    "Smile": lambda u,v: (u*.087,mouth_z+v*.025-.024*(1-u*u)),
    "Open": lambda u,v: (u*.052,mouth_z+v*.066),
    "Playful": lambda u,v: (u*.075+.013,mouth_z+v*.020+.027*u),
    "Bashful": lambda u,v: (u*.045,mouth_z+v*.010+.008*math.cos(u*4)),
},.004))

paws, ears = [], []
for side, suffix in [(-1,"L"),(1,"R")]:
    paw = sphere("PawMesh_"+suffix,(side*.265,-.10,.21),(.185,.235,.21),skin)
    for vertex in paw.data.vertices:
        if vertex.co.z < .012:
            vertex.co.z = .012
    paws.append(paw)
    ear = sphere("EarShell_"+suffix,(side*.565,0,1.405),(.14,.10,.19),skin,20,12)
    tint = sphere("EarTint_"+suffix,(side*.583,-.083,1.412),(.059,.027,.096),accent,16,10)
    ears.extend([(ear,suffix),(tint,suffix)])

# One short rounded horn, with a subtle pearl spiral; no second horn geometry.
verts, faces = [], []
profile = [(0,.10),(.032,.099),(.080,.078),(.140,.048),(.198,.019),(.230,.002)]
for dz, radius in profile:
    for j in range(24):
        angle=j/24*math.tau
        verts.append((math.cos(angle)*radius, -.12+math.sin(angle)*radius-.035*(dz/.23)**2, 1.61+dz))
for i in range(len(profile)-1):
    for j in range(24):
        a=i*24+j;b=(i+1)*24+j;a1=i*24+(j+1)%24;b1=(i+1)*24+(j+1)%24
        faces.extend([(a,a1,b),(a1,b1,b)])
faces.extend([tuple(reversed(range(24))),tuple((len(profile)-1)*24+j for j in range(24))])
horn = mesh("PearlHorn",verts,faces,pearl)
bpy.ops.curve.primitive_bezier_curve_add()
spiral = own(bpy.context.object)
spiral.name="PearlHornSpiral"
curve=spiral.data;curve.splines.clear();spline=curve.splines.new("POLY");spline.points.add(59)
for i, point in enumerate(spline.points):
    t=i/59;angle=t*math.tau*2.2;radius=.095*(1-t)+.004
    point.co=(math.cos(angle)*radius,-.12+math.sin(angle)*radius-.035*t*t,1.615+t*.228,1)
curve.bevel_depth=.007;curve.bevel_resolution=1;curve.resolution_u=1
spiral.data.materials.append(accent)
bpy.context.view_layer.objects.active=spiral;spiral.select_set(True)
bpy.ops.object.convert(target="MESH");spiral=bpy.context.object;spiral.select_set(False)

hat = bpy.data.objects.new("RebootHat",None);characters.objects.link(hat)
hat_dome=sphere("HatDome",(-.28,.23,1.63),(.235,.225,.07),accent)
hat_dome.parent=hat

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
    "Ear.L":((-.54,0,1.36),(-.60,0,1.55),"HeadBone"),
    "Ear.R":((.54,0,1.36),(.60,0,1.55),"HeadBone"),
    "HornBone":((0,-.12,1.61),(0,-.15,1.84),"HeadBone"),
}
for name,(head,tail,parent) in bone_specs.items():
    b=armature.edit_bones.new(name);b.head=head;b.tail=tail
    if parent:b.parent=armature.edit_bones[parent]
bpy.ops.object.mode_set(mode="OBJECT");rig.select_set(False)

def smoothstep(t):
    t=max(0,min(1,t));return t*t*(3-2*t)

def body_weights(co):
    head=smoothstep((co.z-.86)/.44)
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
hat.parent=rig

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
    for f in range(frames+1):
        reset_pose();pose(f/frames)
        for bone in rig.pose.bones:
            for data_path in ("location","rotation_euler","scale"):
                bone.keyframe_insert(data_path=data_path,frame=f)
    a=rig.animation_data.action;a.name=name;a.use_fake_user=True;actions[name]=a

def idle(t):
    b=rig.pose.bones;b["BodyBone"].scale=(1+.004*math.sin(t*math.tau),1+.012*math.sin(t*math.tau),1+.004*math.sin(t*math.tau))
    b["HeadBone"].rotation_euler.z=.013*math.sin(t*math.tau)

def walk(t):
    b=rig.pose.bones;phase=t*math.tau
    b["BodyBone"].rotation_euler.z=.034*math.sin(phase)
    b["BodyBone"].rotation_euler.x=.022*math.cos(phase*2)
    b["HeadBone"].rotation_euler.z=-.016*math.sin(phase)
    for i,name in enumerate(["Paw.L","Paw.R"]):
        p=(t+i*.5)%1
        if p<.6:stride=.255-.85*p;lift=0;toe=0
        else:q=(p-.6)/.4;stride=-.255+.51*smoothstep(q);lift=.14*math.sin(math.pi*q);toe=.14*math.sin(math.pi*q)
        b[name].location=(0,lift,stride);b[name].rotation_euler.x=toe

def hop(t):
    b=rig.pose.bones;p=(min(.99999,t)*2)%1
    squash=.065*math.sin(p/.18*math.pi) if p<.18 else .085*math.sin((p-.76)/.24*math.pi) if p>=.76 else -.025
    b["BodyBone"].scale=(1+squash*.45,1-squash,1+squash*.45)
    b["HeadBone"].rotation_euler.x=-.035*math.sin(p*math.tau)
    b["Paw.L"].rotation_euler.x=.07*math.sin(p*math.tau);b["Paw.R"].rotation_euler.x=-.07*math.sin(p*math.tau)

def pet(t):
    b=rig.pose.bones;p=smoothstep(min(1,t*3))
    b["BodyBone"].scale=(1+.018*p,1-.035*p,1+.021*p)
    b["HeadBone"].rotation_euler.z=-.055*p;b["HeadBone"].rotation_euler.x=.040*p

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
action("baby_release",.7,release);action("sleep",3,sleeping)
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

rig["artCandidate"]="blender"
rig["authoredInBlender"]=bpy.app.version_string
rig["originalV8Imported"]=False
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
blend=Path(__file__).parent/"arucon_baby_B.blend"
bpy.ops.wm.save_as_mainfile(filepath=str(blend),compress=True)

bpy.ops.object.select_all(action="DESELECT")
rig.parent=None
for obj in characters.objects:obj.select_set(True)
bpy.context.view_layer.objects.active=rig
glb=OUT/"blender-baby.glb"
bpy.ops.export_scene.gltf(filepath=str(glb),export_format="GLB",use_selection=True,export_yup=True,
    export_animations=True,export_animation_mode="ACTIONS",export_force_sampling=True,
    export_skins=True,export_morph=True,export_morph_normal=True,export_extras=True)
rig.parent=guide
bpy.ops.wm.save_as_mainfile(filepath=str(blend),compress=True)
info={"candidate":"B_BLENDER","blenderVersion":bpy.app.version_string,"blenderBuildHash":bpy.app.build_hash.decode(),
    "source":"art/reboot-03/build_baby.py","blend":"art/reboot-03/arucon_baby_B.blend","runtime":"mobile/assets/reboot-03/blender-baby.glb",
    "originalV8Imported":False,"defaultModel":"A_V8_UNCHANGED","finalAdoption":"USER_REVIEW_PENDING",
    "hornCount":1,"visiblePaws":2,"boneNames":list(bone_specs),"actions":list(actions),
    "shapeKeys":{o.name:[k.name for k in o.data.shape_keys.key_blocks] for o in face_objects if o.data.shape_keys},
    "bodyVertices":len(body.data.vertices),"sha256":hashlib.sha256(glb.read_bytes()).hexdigest(),"bytes":glb.stat().st_size,
    "rootMotion":"editable guide retained in blend; game uses in-place skeletal clips and common navigation",
    "runtimeRig":"Paw.L/R bones; engine adds non-rendering Foot_L/R_Front control proxies"}
(OUT/"manifest.json").write_text(json.dumps(info,ensure_ascii=False,indent=2)+"\n")
print("BLENDER_AUTHORED_CANDIDATE",json.dumps(info,ensure_ascii=False))
