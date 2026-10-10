"""One four-paw review candidate, editable Blender skin/action changes from immutable C."""
from pathlib import Path
import bpy, math, json, hashlib
ROOT=Path(__file__).resolve().parents[2]
source=ROOT/'art/reboot-03-1/arucon_baby_C.blend'
source_sha=hashlib.sha256(source.read_bytes()).hexdigest()
bpy.ops.wm.open_mainfile(filepath=str(source),use_scripts=False)
rig=bpy.data.objects['AruconRoot'];body=bpy.data.objects['Body'];collection=rig.users_collection[0]
# Extract the authored front paw topology/weights from the joined cream skin.
rear=[]
for side in ['L','R']:
 group=body.vertex_groups['Paw.'+side].index
 ids={v.index for v in body.data.vertices if any(g.group==group and g.weight>=.54 for g in v.groups)}
 polygons=[p for p in body.data.polygons if all(i in ids for i in p.vertices)]
 used=sorted({i for p in polygons for i in p.vertices});assert len(used)>20
 remap={old:i for i,old in enumerate(used)}
 coords=[]
 for i in used:
  co=body.data.vertices[i].co.copy();cx=.265 if side=='R'else-.265
  co.x=cx+(co.x-cx)*.92;co.y=-.10+(co.y+.10)*.90+.44;coords.append(tuple(co))
 mesh=bpy.data.meshes.new('RearPawTopology_'+side);mesh.from_pydata(coords,[],[tuple(remap[i]for i in p.vertices)for p in polygons]);mesh.update()
 paw=bpy.data.objects.new('RearPawMesh_'+side,mesh);collection.objects.link(paw);paw.data.materials.append(body.data.materials[0]);paw.parent=rig
 for p in mesh.polygons:p.use_smooth=True
 rear.append((paw,side))
bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
for side,sign in [('L',-1),('R',1)]:
 bone=rig.data.edit_bones.new('PawBack.'+side);bone.head=(sign*.265,.34,.21);bone.tail=(sign*.265,.34,.43);bone.parent=rig.data.edit_bones['Root']
bpy.ops.object.mode_set(mode='OBJECT')
for paw,side in rear:
 own=paw.vertex_groups.new(name='PawBack.'+side);torso=paw.vertex_groups.new(name='BodyBone')
 for v in paw.data.vertices:
  seam=.40*max(0,min(1,(v.co.z-.28)/.14));own.add([v.index],1-seam,'REPLACE');torso.add([v.index],seam,'REPLACE')
 mod=paw.modifiers.new('RearPawSkin','ARMATURE');mod.object=rig
# Flexible upper hind legs keep the stationary world paw attached to the moving belly.
for side,sign in [('L',-1),('R',1)]:
 bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=10,location=(sign*.265,.34,.43))
 upper=bpy.context.object;upper.name='RearUpper_'+side;upper.scale=(.135,.14,.20)
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 for coll in list(upper.users_collection):coll.objects.unlink(upper)
 collection.objects.link(upper);upper.data.materials.append(body.data.materials[0]);upper.parent=rig
 pawgroup=upper.vertex_groups.new(name='PawBack.'+side);bodygroup=upper.vertex_groups.new(name='BodyBone')
 for v in upper.data.vertices:
  t=max(0,min(1,(v.co.z-.27)/.29));t=t*t*(3-2*t)
  pawgroup.add([v.index],1-t,'REPLACE');bodygroup.add([v.index],t,'REPLACE')
 for poly in upper.data.polygons:poly.use_smooth=True
 mod=upper.modifiers.new('ConnectedRearLeg','ARMATURE');mod.object=rig
 rear.append((upper,side))

# Real hind-foot tracks with diagonal support; nav/gait still owns world travel.
for action in list(bpy.data.actions):
 if action.name.startswith('AuthoringGuide_'):continue
 rig.animation_data.action=action
 start,end=action.frame_range
 for frame in range(int(start),int(end)+1):
  t=(frame-start)/max(1,end-start)
  for index,side in enumerate(['L','R']):
   bone=rig.pose.bones['PawBack.'+side];bone.rotation_mode='XYZ';bone.location=(0,0,0);bone.rotation_euler=(0,0,0)
   if action.name=='walk':
    phase=(t+(0.5 if index==0 else 0))%1
    if phase>=.60:
     u=(phase-.60)/.40;bone.rotation_euler.x=.12*math.sin(math.pi*u)
   elif action.name=='baby_hop':bone.rotation_euler.x=.06*math.sin(t*math.tau)
   elif action.name=='sleep':bone.location.z=-.02
   bone.keyframe_insert('rotation_euler',frame=frame);bone.keyframe_insert('location',frame=frame)
 rig.animation_data.action=None
# Merge rear skin into the same opaque draw; keep edit weights and face morph topology.
bpy.ops.object.select_all(action='DESELECT');body.select_set(True)
for paw,side in rear:paw.select_set(True)
bpy.context.view_layer.objects.active=body;bpy.ops.object.join()
body.data.materials.clear();body.data.materials.append(bpy.data.materials['Mochi_Warm_Cream'])
for p in body.data.polygons:p.material_index=0
rig['artCandidate']='reboot04_quad';rig['visiblePaws']=4;rig['reviewApproval']='USER_REVIEW_PENDING'
rig.animation_data.action=bpy.data.actions.get('idle_reserved');bpy.context.scene.frame_set(0)
for b in rig.pose.bones:b.location=(0,0,0);b.rotation_euler=(0,0,0);b.scale=(1,1,1)
blend=ROOT/'art/reboot-04/common_quad.blend';bpy.ops.wm.save_as_mainfile(filepath=str(blend),compress=True)
guide=rig.parent;rig.parent=None;bpy.ops.object.select_all(action='DESELECT')
for obj in collection.objects:obj.select_set(True)
bpy.context.view_layer.objects.active=rig
out=ROOT/'mobile/assets/reboot-04/common-quad.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_yup=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_optimize_animation_size=True,export_optimize_animation_keep_anim_armature=False,export_texcoords=False,export_skins=True,export_morph=True,export_morph_normal=True,export_extras=True)
rig.parent=guide;bpy.ops.wm.save_as_mainfile(filepath=str(blend),compress=True)
assert hashlib.sha256(source.read_bytes()).hexdigest()==source_sha
info={'blender':bpy.app.version_string,'sourceCsha':source_sha,'singleHorn':True,'paws':4,'bones':[b.name for b in rig.data.bones],'vertices':len(body.data.vertices),'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'approval':'USER_REVIEW_PENDING','scope':'one common baby for three review personalities; originals untouched'}
(ROOT/'mobile/assets/reboot-04/manifest.json').write_text(json.dumps(info,indent=2)+'\n');print(json.dumps(info))
