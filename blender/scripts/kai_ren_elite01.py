"""Kai vs Ren: Eclipse Contact. Animated 3D anime previs with real VRM rigs.

All media is generated locally in a GitHub Actions runner. No secrets, GPUs,
external music or unverified assets. Foundation models CC0; not exclusive designs.
"""
from __future__ import annotations
import json,math,random,sys
from pathlib import Path
from mathutils import Vector
import bpy

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/"blender"))
from studio.combat import import_actor,contact_metrics

OUT=ROOT/"renders/kai-ren/elite-01"
OUT.mkdir(parents=True,exist_ok=True)
rng=random.Random(20261116)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.preferences.addon_enable(module="bl_ext.user_default.vrm")
bpy.ops.preferences.addon_enable(module="cycles")
scene=bpy.context.scene
scene.render.engine="CYCLES"
scene.cycles.device="CPU"
scene.cycles.samples=8
scene.cycles.use_denoising=True
scene.render.resolution_x=960
scene.render.resolution_y=540
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.render.image_settings.color_mode="RGB"
scene.render.image_settings.color_depth="8"
scene.render.film_transparent=False
scene.render.fps=24
scene.frame_start=1
scene.frame_end=48
scene.view_settings.view_transform="AgX"
try:
    scene.view_settings.look="AgX - Medium High Contrast"
except Exception:
    pass

def material(name,color,*,emission=None,strength=0,metallic=0,roughness=.5):
    m=bpy.data.materials.new(name)
    m.diffuse_color=(*color,1)
    m.use_nodes=True
    p=m.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value=(*color,1)
    p.inputs["Metallic"].default_value=metallic
    p.inputs["Roughness"].default_value=roughness
    if emission is not None:
        p.inputs["Emission Color"].default_value=(*emission,1)
        p.inputs["Emission Strength"].default_value=strength
    return m

BASALT=material("Basalt",(.022,.024,.038),roughness=.95)
ROCK=material("Jagged_Silhouette",(.009,.012,.023),roughness=.94)
RED=material("Crimson_Eclipse",(.5,.014,.025),emission=(.9,.018,.03),strength=3)
MOON_DARK=material("Eclipse_Dark_Obsidian",(.008,.003,.008))
BLUE=material("Kai_Ion_Blue",(.03,.38,1.0),emission=(.06,.37,1.0),strength=12)
BLUE_SOFT=material("Kai_Energy_Mist",(.02,.22,.7),emission=(.04,.19,.8),strength=2.8)
GOLD=material("Ren_Solar_Gold",(1,.43,.035),emission=(1,.30,.015),strength=12)
GOLD_SOFT=material("Ren_Ember_Glow",(.64,.20,.015),emission=(.7,.12,.008),strength=3)
IMPACT=material("Impact_White",(.85,.90,1),emission=(.75,.88,1),strength=22)
MOLTEN=material("Crack_Embers",(.6,.045,.009),emission=(1,.09,.006),strength=4)

def sphere(name,loc,r,mat,segments=24,rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=loc)
    o=bpy.context.object;o.name=name;o.scale=(r,r,r)
    o.data.materials.append(mat)
    return o

def ico(name,loc,scale,mat,subdivisions=0):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions,radius=1,location=loc)
    obj=bpy.context.object;obj.name=name;obj.scale=scale
    obj.data.materials.append(mat)
    return obj

def polyline(name,pts,mat,thickness=.032,closed=False):
    curve=bpy.data.curves.new(name,"CURVE")
    curve.dimensions="3D";curve.resolution_u=1;curve.bevel_depth=thickness
    curve.bevel_resolution=2
    spline=curve.splines.new("POLY")
    spline.points.add(len(pts)-1)
    for p,xyz in zip(spline.points,pts):p.co=(*xyz,1)
    spline.use_cyclic_u=closed
    ob=bpy.data.objects.new(name,curve)
    scene.collection.objects.link(ob)
    ob.data.materials.append(mat)
    return ob

def key_scale(obj,frames):
    for fr,s in frames:
        obj.scale=(s,s,s)
        obj.keyframe_insert("scale",frame=fr)

def make_light(name,loc,color,watts,size,target=(0,0,1.6)):
    d=bpy.data.lights.new(name,"AREA")
    d.energy=watts;d.color=color;d.size=size
    ob=bpy.data.objects.new(name,d)
    scene.collection.objects.link(ob)
    ob.location=loc
    ob.rotation_euler=(Vector(target)-ob.location).to_track_quat("-Z","Y").to_euler()
    return ob

# Atmospheric backdrop: physically composited eclipse silhouette without
# overbright molten wash (an issue in the previous test).
world=bpy.data.worlds.new("Midnight_Atmosphere")
world.use_nodes=True
world.node_tree.nodes["Background"].inputs["Color"].default_value=(.005,.006,.02,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value=.30
scene.world=world

sphere("Whole_Red_Moon",(0,15,6.8),2.65,RED,segments=64,rings=32)
sphere("Eclipse_Shadow",(0,14.78,6.90),2.16,MOON_DARK,segments=64,rings=32)
# A narrow broad light rim communicates moon scale while preserving silhouettes.
for r in (2.74,2.86):
    pts=[(r*math.cos(2*math.pi*i/96),14.8,6.8+r*math.sin(2*math.pi*i/96))
         for i in range(96)]
    polyline("Corona_Rim_%d"%(r*100),pts,RED,.010,True)

# Distant basalt skyline and near battle arena.
for i in range(54):
    x=-31+i*1.16
    z=rng.uniform(.45,3.0)
    y=17+rng.uniform(0,2)
    bpy.ops.mesh.primitive_cone_add(vertices=rng.choice((4,5,6)),
        radius1=rng.uniform(.40,1.3),radius2=0,depth=z,location=(x,y,z/2-.03))
    ob=bpy.context.object
    ob.name="Distant_Obsidian_Spire_%02d"%i
    ob.rotation_euler.y=rng.uniform(-.18,.18)
    ob.data.materials.append(ROCK)

bpy.ops.mesh.primitive_plane_add(size=120,location=(0,0,-.065))
ground=bpy.context.object;ground.name="Cracked_Basalt_Arena"
gm=bpy.data.materials.new("Dark_Volcanic_Fissures")
gm.use_nodes=True
ns=gm.node_tree.nodes;ls=gm.node_tree.links
shader=ns.get("Principled BSDF")
shader.inputs["Roughness"].default_value=.88
coord=ns.new("ShaderNodeTexCoord")
noise=ns.new("ShaderNodeTexNoise")
noise.inputs["Scale"].default_value=8
noise.inputs["Detail"].default_value=4
vor=ns.new("ShaderNodeTexVoronoi")
vor.feature="DISTANCE_TO_EDGE"
vor.inputs["Scale"].default_value=2.6
ls.new(coord.outputs["Generated"],vor.inputs["Vector"])
ramp=ns.new("ShaderNodeValToRGB")
ramp.color_ramp.elements[0].position=.006
ramp.color_ramp.elements[0].color=(.8,.05,.005,1)
ramp.color_ramp.elements[1].position=.043
ramp.color_ramp.elements[1].color=(.017,.020,.031,1)
ls.new(vor.outputs["Distance"],ramp.inputs["Fac"])
ls.new(ramp.outputs["Color"],shader.inputs["Base Color"])
emramp=ns.new("ShaderNodeValToRGB")
emramp.color_ramp.elements[0].position=.004
emramp.color_ramp.elements[0].color=(1,.055,.004,1)
emramp.color_ramp.elements[1].position=.017
emramp.color_ramp.elements[1].color=(0,0,0,1)
ls.new(vor.outputs["Distance"],emramp.inputs["Fac"])
ls.new(emramp.outputs["Color"],shader.inputs["Emission Color"])
shader.inputs["Emission Strength"].default_value=1.8
bump=ns.new("ShaderNodeBump");bump.inputs["Strength"].default_value=.20
bump.inputs["Distance"].default_value=.045
ls.new(noise.outputs["Fac"],bump.inputs["Height"])
ls.new(bump.outputs["Normal"],shader.inputs["Normal"])
ground.data.materials.append(gm)

for i in range(115):
    theta=rng.uniform(0,2*math.pi)
    radius=rng.uniform(3.5,27)
    x=radius*math.cos(theta)
    y=radius*math.sin(theta)+2
    if y<-.8 and radius<9:continue
    scale=(rng.uniform(.18,.85),rng.uniform(.18,.85),rng.uniform(.20,1.5))
    ico("Scattered_Basalt_%03d"%i,(x,y,max(.03,scale[2]*.12)),scale,
        BASALT if i%6 else ROCK)
for i in range(62):
    x=rng.uniform(-4.4,4.4);y=rng.uniform(-.15,3.2)
    z=rng.uniform(.3,4.0)
    obj=ico("Impact_Debris_%03d"%i,(x,y,z),
            (rng.uniform(.035,.14),rng.uniform(.025,.13),rng.uniform(.03,.15)),
            ROCK)
    for fr,dz,dx in ((1,0,0),(19,.03,0),(27,rng.uniform(.12,.50),rng.uniform(-.24,.24)),(48,-.20,rng.uniform(-.3,.3))):
        obj.location=(x+dx,y,z+dz)
        obj.keyframe_insert("location",frame=fr)

# Actual rights-verified, skinned anime avatars. Custom originals remain a later art milestone.
fighters=[import_actor(ROOT,"sendagaya_shino","Kai",1),
          import_actor(ROOT,"vita","Ren",-1)]

# Hand-bound energy streaks: IK targets drive these objects during choreography.
for fighter,core,halo in [(fighters[0],BLUE,BLUE_SOFT),(fighters[1],GOLD,GOLD_SOFT)]:
    hand=fighter.hand_target
    fside=fighter.side
    for index in range(12):
        ang=2*math.pi*index/12
        length=.20+index%4*.13
        pts=[
            (.08*math.cos(ang),.06*math.sin(ang),0),
            (.19*math.cos(ang)+(-fside*.08),.13*math.sin(ang),length*.45),
            (.34*math.cos(ang)+(-fside*.19),.17*math.sin(ang),length)
        ]
        arc=polyline(fighter.label+"_IonStreamer_%02d"%index,pts,core if index%3==0 else halo,.009+index%3*.006)
        arc.parent=hand
        # Energy gathers, peaks before contact, then disperses.
        key_scale(arc,[(1,.02),(9,.34),(17,.65),(23,1.25),(27,1.6),(32,.45),(42,.02),(48,.01)])
    orb=sphere(fighter.label+"_ChargeSphere",(0,0,0),.11,core)
    orb.parent=hand
    orb.location=(0,0,0)
    key_scale(orb,[(1,.05),(11,.42),(19,.84),(25,1.9),(29,1.2),(36,.10),(48,.01)])

# Collision at the deliberately shared target midpoint. Add an impulse on the ground
# and expanding glow rings; do not confuse this with physically simulated cloth.
flash=sphere("Frame_27_Impact_Flash",(0,-.25,1.58),.20,IMPACT,segments=32,rings=16)
key_scale(flash,[(1,.001),(24,.001),(26,.3),(27,2.2),(28,1.4),(30,.2),(33,.001),(48,.001)])
impact_light=make_light("BlueGold_ImpactBurst",(0,-.3,2.4),(0.60,.68,1),0,3)
for f,p in ((1,0),(23,0),(26,850),(27,1900),(28,800),(32,0),(48,0)):
    impact_light.data.energy=p
    impact_light.data.keyframe_insert("energy",frame=f)

for radius,mat in ((.90,BLUE),(1.12,GOLD),(.54,IMPACT)):
    pts=[(radius*math.cos(i*2*math.pi/100),radius*math.sin(i*2*math.pi/100),.028)
         for i in range(100)]
    ring=polyline("Impact_Ground_Ring_%.2f"%radius,pts,mat,.019,True)
    key_scale(ring,[(1,.001),(23,.001),(27,.45),(30,1.4),(35,2.6),(43,4),(48,4.5)])

for i in range(34):
    theta=(i/34)*2*math.pi
    r0=rng.uniform(.15,.60)
    obj=ico("Collision_Shrapnel_%02d"%i,
            (r0*math.cos(theta),r0*math.sin(theta),rng.uniform(.2,.8)),
            (.035,.05,.08),GOLD if i%2 else BLUE)
    pos=Vector(obj.location)
    end=pos+Vector((math.cos(theta)*rng.uniform(1.8,3.6),math.sin(theta)*rng.uniform(1.1,2.7),rng.uniform(.1,2)))
    for f,p in ((1,pos),(25,pos),(28,pos),(38,end),(48,end+Vector((0,0,-.48)))):
        obj.location=p;obj.keyframe_insert("location",frame=f)
    key_scale(obj,[(1,.001),(25,.001),(27,.36),(38,1.0),(48,.12)])

make_light("Kai_Blue_Rim",(-3.0,1.0,5.4),(.07,.33,1),1000,3.5)
make_light("Ren_Auburn_Rim",(3.0,1.3,5.0),(1,.32,.05),1160,3.5)
make_light("Cold_Moonlight",(0,5,11),(.62,.12,.18),700,7)
make_light("Front_Moonbounce",(0,-5,5),(.39,.44,.65),530,6)

cam_data=bpy.data.cameras.new("ARRI_40mm_Wide_Safety")
camera=bpy.data.objects.new("ARRI_40mm_Wide_Safety",cam_data)
scene.collection.objects.link(camera)
scene.camera=camera
cam_data.lens=35
cam_data.clip_end=150
cam_data.dof.use_dof=False
for fr,x,y,z,target in [
    (1,0,-13.6,3.18,(0,0,2.54)),
    (15,0,-12.5,3.15,(0,0,2.55)),
    (24,0,-11.7,3.10,(0,0,2.51)),
    (27,.055,-11.7,3.15,(0,0,2.50)),
    (29,-.046,-11.79,3.05,(0,0,2.51)),
    (36,0,-12.0,3.1,(0,0,2.56)),
    (48,0,-12.4,3.16,(0,0,2.57))]:
    camera.location=(x,y,z)
    camera.rotation_euler=(Vector(target)-camera.location).to_track_quat("-Z","Y").to_euler()
    camera.keyframe_insert("location",frame=fr)
    camera.keyframe_insert("rotation_euler",frame=fr)

# Conservative film glow. If compositor API differs between Blender releases,
# renderer remains valid without it.
try:
    scene.use_nodes=True
    comp=scene.node_tree
    comp.nodes.clear()
    src=comp.nodes.new("CompositorNodeRLayers")
    glow=comp.nodes.new("CompositorNodeGlare")
    glow.glare_type="FOG_GLOW"
    glow.quality="MEDIUM"
    glow.threshold=2.3
    glow.mix=-.85
    dst=comp.nodes.new("CompositorNodeComposite")
    comp.links.new(src.outputs["Image"],glow.inputs["Image"])
    comp.links.new(glow.outputs["Image"],dst.inputs["Image"])
except Exception as e:
    print("COMPOSITOR_FALLBACK: "+type(e).__name__)

scene.frame_set(26)
metrics=contact_metrics(fighters,26)
scene.frame_set(1)
# The primary artifact keeps its editable rig actions and procedural environment.
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/"kai_ren_elite_01.blend"),check_existing=False)

metadata={
  "shot":"Kai vs Ren — Eclipse Contact",
  "status":"rigged anime cinematic combat previsualization",
  "characters":[f.label for f in fighters],
  "source_assets":[f.asset_id for f in fighters],
  "license":"CC0, verified in VRM metadata; these are licensed base avatars, not original proprietary character designs",
  "format":{"frames":48,"fps":24,"duration_seconds":2,"resolution":"960x540","engine":"Cycles CPU","samples":8},
  "style":{"motifs":["blood-red eclipse","volcanic fissures","blue ion arcs","gold solar energy","collision shockwave"],
           "camera":"one wide continuous 35mm dolly with contact shake"},
  "animation":{"uses_real_vrm_armatures":True,"uses_bone_ik":True,"grounded_foot_ik":True,
               "impact_frame":27,"rig_contact_metric":metrics,
               "note":"hand and foot target IK, momentum timing, stylized impact; NOT a full rigid/cloth body physical simulation"},
  "privacy":"no API keys, account info, or paid cloud services",
}
(OUT/"shot.json").write_text(json.dumps(metadata,indent=2),encoding="utf-8")

for f in range(1,49):
    scene.frame_set(f)
    scene.render.filepath=str(OUT/("frame_%04d.png"%f))
    bpy.ops.render.render(write_still=True)
    if f%12==0:print("ELITE_RENDER_FRAMES="+str(f),flush=True)
print("KAI_REN_ELITE_RENDER_COMPLETED",flush=True)
