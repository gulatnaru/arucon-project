"""Separate two-paw baby from immutable A-v8-derived C; no hidden rear topology.
Existing quad/A/B/C are never saved. Reauthor two-paw support/toe/body actions.
"""
from pathlib import Path
import bpy, math, json, hashlib
ROOT=Path(__file__).resolve().parents[2]
source=ROOT/'art/reboot-03-1/arucon_baby_C.blend'
quad=ROOT/'art/reboot-04/common_quad.blend'
old={str(f):hashlib.sha256(f.read_bytes()).hexdigest() for f in [source,quad,ROOT/'mobile/assets/reboot-04/common-quad.glb',ROOT/'mobile/assets/reboot-02/baby-gait.glb']}
bpy.ops.wm.open_mainfile(filepath=str(source),use_scripts=False)
rig=bpy.data.objects['AruconRoot'];body=bpy.data.objects['Body'];collection=rig.users_collection[0]
assert set(b.name for b in rig.data.bones)=={'Root','BodyBone','HeadBone','Ear.L','Ear.R','HornBone','Paw.L','Paw.R'}
assert not any('Back' in g.name or 'Rear' in g.name for g in body.vertex_groups)
collection.name='REBOOT04_TwoPaw_Baby'
rig.animation_data.action=None
for a in list(bpy.data.actions):
 if not a.name.startswith('AuthoringGuide_'):bpy.data.actions.remove(a)

def smooth(t):
 t=max(0,min(1,t));return t*t*(3-2*t)
def reset():
 for b in rig.pose.bones:b.rotation_mode='XYZ';b.location=(0,0,0);b.rotation_euler=(0,0,0);b.scale=(1,1,1)
def action(name,seconds,pose):
 rig.animation_data.action=None;frames=round(seconds*30)
 samples={(b.name,p):[]for b in rig.pose.bones for p in ('location','rotation_euler','scale')}
 for f in range(frames+1):
  reset();pose(f/frames)
  for (bn,p),v in samples.items():v.append(tuple(getattr(rig.pose.bones[bn],p)))
 for (bn,p),values in samples.items():
  base=(1,1,1)if p=='scale'else(0,0,0)
  if all(all(abs(a-b)<1e-8 for a,b in zip(v,base))for v in values):continue
  for f,v in enumerate(values):setattr(rig.pose.bones[bn],p,v);rig.pose.bones[bn].keyframe_insert(data_path=p,frame=f)
 a=rig.animation_data.action;a.name=name;a.use_fake_user=True

def idle(t):
 b=rig.pose.bones;p=math.sin(t*math.tau)
 b['BodyBone'].scale=(1+.004*p,1+.010*p,1+.004*p);b['HeadBone'].rotation_euler.z=.011*p

def walk(t):
 b=rig.pose.bones;p=math.sin(t*math.tau)
 # Attached blob leans into the supporting side, with only two opposing toe tracks.
 b['BodyBone'].rotation_euler.z=.052*p;b['BodyBone'].rotation_euler.x=.022*math.cos(t*math.tau*2)
 b['HeadBone'].rotation_euler.z=-.020*p
 for i,n in enumerate(['Paw.L','Paw.R']):
  phase=(t+i*.5)%1
  if phase<.60:stride=.255-.85*phase;lift=0;toe=0
  else:q=(phase-.60)/.40;stride=-.255+.51*smooth(q);lift=.14*math.sin(math.pi*q);toe=.13*math.sin(math.pi*q)
  b[n].location=(0,lift,stride);b[n].rotation_euler.x=toe

def hop(t):
 b=rig.pose.bones;p=(min(.99999,t)*2)%1
 squash=.035*math.sin(p/.18*math.pi)if p<.18 else .060*math.sin((p-.76)/.24*math.pi)if p>=.76 else-.025
 b['BodyBone'].scale=(1+squash*.45,1-squash,1+squash*.45)
 b['HeadBone'].rotation_euler.x=-.040*math.sin(p*math.tau)
 for n in ['Paw.L','Paw.R']:b[n].rotation_euler.x=.05*math.sin(p*math.tau)

def stop(t):
 b=rig.pose.bones;p=math.sin(t*math.pi)
 b['BodyBone'].rotation_euler.x=-.036*p;b['BodyBone'].scale=(1+.015*p,1-.035*p,1+.015*p)
 b['HeadBone'].rotation_euler.x=.022*p

def pet(t):
 b=rig.pose.bones;p=smooth(min(1,t*3));b['BodyBone'].scale=(1+.018*p,1-.035*p,1+.021*p)
 b['HeadBone'].rotation_euler.z=-.05*p;b['HeadBone'].rotation_euler.x=.04*p

def release(t):pet((1-smooth(t))/3)
def sleep(t):
 b=rig.pose.bones;p=.006*math.sin(t*math.tau);b['BodyBone'].scale=(1.065+p,.76+p,1.045+p)
 b['HeadBone'].rotation_euler.x=.075;b['HeadBone'].location.y=-.035
for n,seconds,fn in [('idle_reserved',3,idle),('idle_expressive',3,idle),('walk',1,walk),('baby_hop',.9,hop),('baby_stop',.36,stop),('pet_reserved',1.2,pet),('pet_expressive',1.2,pet),('baby_release',.9,release),('sleep',3,sleep)]:action(n,seconds,fn)
reset();rig['artCandidate']='reboot04_baby_two';rig['visiblePaws']=2;rig['supportLayout']='two';rig['reviewApproval']='USER_REVIEW_PENDING'
rig.animation_data.action=bpy.data.actions['idle_reserved'];bpy.context.scene.frame_set(0)
blend=ROOT/'art/reboot-04/baby_two_paws.blend';bpy.ops.wm.save_as_mainfile(filepath=str(blend),compress=True)
guide=rig.parent;rig.parent=None;bpy.ops.object.select_all(action='DESELECT')
for obj in collection.objects:obj.select_set(True)
bpy.context.view_layer.objects.active=rig
out=ROOT/'mobile/assets/reboot-04/baby-two-paws.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_yup=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_optimize_animation_size=True,export_optimize_animation_keep_anim_armature=False,export_texcoords=False,export_skins=True,export_morph=True,export_morph_normal=True,export_extras=True)
rig.parent=guide;bpy.ops.wm.save_as_mainfile(filepath=str(blend),compress=True)
for f,h in old.items():assert hashlib.sha256(Path(f).read_bytes()).hexdigest()==h
info={'blender':bpy.app.version_string,'sourceCsha':old[str(source)],'v8DesignSource':'reboot-02/baby-gait.glb through immutable Hybrid C','singleHorn':True,'paws':2,'rearGeometryBonesTracks':'ABSENT','bones':[b.name for b in rig.data.bones],'vertices':len(body.data.vertices),'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'approval':'FOOT_COUNT_DIRECTION_USER_APPROVED;FINAL_ART_USER_REVIEW_PENDING','scope':'baby only; shared three personalities; grown/evolved four-paw direction and timing deferred'}
(ROOT/'mobile/assets/reboot-04/baby-two-manifest.json').write_text(json.dumps(info,indent=2)+'\n');print(json.dumps(info))
