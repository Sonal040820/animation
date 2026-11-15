"""Kai–Ren: procedural cinematic combat previsualization (CPU, reusable components).

No external character sources, API keys or private data. Blender 4.5.16.
Render a short, inspectable first shot on free GitHub Actions runners.
This is an original stylized 3D previs, not the final anime artwork.
"""
from __future__ import annotations
import bpy
import math
import random
from mathutils import Vector
from pathlib import Path

random.seed(17)
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/"renders/kai-ren/shot-01"
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
scene.render.engine="CYCLES"
scene.cycles.device="CPU"
scene.cycles.samples=6
scene.cycles.use_denoising=True
scene.render.resolution_x=640
scene.render.resolution_y=360
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.render.image_settings.color_mode="RGB"
scene.render.filepath=str(OUT/"frame_")
scene.render.film_transparent=False
scene.render.image_settings.color_depth="8"
scene.frame_start=1
scene.frame_end=24
scene.render.fps=24
scene.view_settings.view_transform="AgX"

def mat(name,rgba,metallic=0,roughness=.45,emission=None,power=0):
    m=bpy.data.materials.new(name)
    m.diffuse_color=tuple(rgba)
    m.use_nodes=True
    p=m.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value=tuple(rgba)
    p.inputs["Metallic"].default_value=metallic
    p.inputs["Roughness"].default_value=roughness
    if emission is not None:
        p.inputs["Emission Color"].default_value=(*emission,1)
        p.inputs["Emission Strength"].default_value=power
    return m

BLACK=mat("Basalt",(0.016,.015,.021,1),roughness=.95)
ARMOR=mat("Steel_Deep_Blue",(.023,.047,.13,1),metallic=.45)
ARMOR_GOLD=mat("Obsidian_Gold",(.13,.043,.021,1),metallic=.5)
SKIN=mat("Skin_Warm",(.7,.44,.27,1))
HAIR_WHITE=mat("White_Hair",(.77,.89,1,1),metallic=.1)
HAIR_GOLD=mat("Gold_Hair",(.89,.49,.13,1),metallic=.1)
CAPE_BLUE=mat("Cape_Blue",(.012,.025,.075,1),metallic=.1)
CAPE_RED=mat("Cape_Burgundy",(.14,.017,.025,1))
BLUE=mat("Energy_Cerulean",(.01,.23,.85,1),emission=(.05,.45,1),power=8)
GOLD=mat("Energy_Gold",(.95,.32,.015,1),emission=(1,.25,.015),power=9)
LAVA=mat("Magma_Fissures",(.14,.009,.008,1),emission=(1,.025,.006),power=4)
MOON=mat("Eclipse_Moon",(.35,.01,.025,1),emission=(.7,.015,.02),power=1.8)
DARKROCK=mat("Far_Basalt",(.018,.012,.024,1))
DUST=mat("Dust_Silhouette",(.095,.065,.075,1))

def cube(name,loc,scale,material,parent=None,rot=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o=bpy.context.object;o.name=name
    o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if rot:o.rotation_euler=rot
    o.data.materials.append(material)
    if parent:o.parent=parent
    return o

def sphere(name,loc,scale,material,parent=None,segments=20,rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=loc)
    o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(material)
    if parent:o.parent=parent
    return o

def cone(name,loc,radius,depth,material,parent=None,vertices=8,rotation=None):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=radius,radius2=0,depth=depth,location=loc)
    o=bpy.context.object;o.name=name;o.data.materials.append(material)
    if rotation:o.rotation_euler=rotation
    if parent:o.parent=parent
    return o

def segment(name,a,b,width,material,parent=None):
    av=Vector(a);bv=Vector(b)
    center=(av+bv)/2
    direction=bv-av
    bpy.ops.mesh.primitive_cone_add(vertices=10,radius1=width*.82,radius2=width,depth=direction.length,location=center)
    o=bpy.context.object;o.name=name
    o.rotation_euler=direction.to_track_quat("Z","Y").to_euler()
    o.data.materials.append(material)
    if parent:o.parent=parent
    return o

def empty(name,loc):
    o=bpy.data.objects.new(name,None)
    scene.collection.objects.link(o);o.location=loc
    return o

def fighter(name,x,side,armor,hair,cape,energy):
    root=empty(name+"_ROOT",(x,0,0))
    # Characters are generated from reusable articulated stylized volumes.
    cube(name+"_Torso",(0,0,1.55),(.70,.4,.96),armor,root)
    cube(name+"_ChestPlate",(0,-.23,1.70),(.79,.12,.35),armor,root)
    sphere(name+"_Head",(0,-.01,2.40),(.30,.28,.34),SKIN,root)
    cube(name+"_EyesShadow",(0,-.275,2.47),(.49,.048,.075),BLACK,root)
    for i in range(7):
        theta=2*math.pi*i/7
        cone(name+"_HairSpike_"+str(i),(.20*math.cos(theta),.19*math.sin(theta),2.75),.16,.58,hair,root,rotation=(.16*math.cos(theta),.22*math.sin(theta),-.1))
    cube(name+"_Belt",(0,0,1.06),(.76,.42,.14),BLACK,root)
    for sg in (-1,1):
        cube(name+"_Leg_"+str(sg),(.19*sg,0,.64),(.29,.32,.84),armor,root)
        cube(name+"_Boot_"+str(sg),(.20*sg,-.09,.17),(.31,.51,.30),BLACK,root)
    # Offset shoulder/forearm rigs for a readable standoff pose.
    for sg in (-1,1):
        sh=(sg*.52,0,1.93)
        el=(sg*.83,-.05,1.52)
        wrist=(sg*.99,-.22,1.30)
        segment(name+"_ArmUpper_"+str(sg),sh,el,.16,armor,root)
        segment(name+"_ArmLower_"+str(sg),el,wrist,.13,armor,root)
        sphere(name+"_Fist_"+str(sg),wrist,(.15,.16,.16),SKIN,root)
        sphere(name+"_Shoulder_"+str(sg),sh,(.23,.22,.22),armor,root)
    cape_ob=cube(name+"_Cape",(0,.32,1.27),(.75,.07,1.22),cape,root,rot=(math.radians(9*side),0,0))
    cape_ob["role"]="reusable-cloth-standin"
    # One articulated attack-arm control per fighter, animated independently.
    shoulder=empty(name+"_StrikeArmControl",(.49*side,-.1,1.94))
    shoulder.parent=root
    segment(name+"_StrikeUpper",(0,0,0),(.42*side,-.43,-.12),.15,armor,shoulder)
    segment(name+"_StrikeLower",(.42*side,-.43,-.12),(.74*side,-.61,-.05),.12,armor,shoulder)
    sphere(name+"_StrikeFist",(.74*side,-.61,-.05),(.17,.17,.17),SKIN,shoulder)
    for frame,rot in ((1,-.28*side),(8,-.10*side),(13,.52*side),(19,.61*side),(24,.25*side)):
        shoulder.rotation_euler=(rot,0,rot*.4);shoulder.keyframe_insert("rotation_euler",frame=frame)
    for frame,dx in ((1,0),(8,.11*side),(13,.37*side),(19,.44*side),(24,.35*side)):
        root.location.x=x+dx;root.keyframe_insert("location",frame=frame)
    # Energy cores mounted at hand; separate for later procedural VFX replacement.
    orb=sphere(name+"_EnergyCore",(.74*side,-.62,0),(.16,.16,.16),energy,shoulder)
    for fr,s in ((1,.55),(8,1.1),(13,1.9),(19,2.2),(24,1.5)):
        orb.scale=(.16*s,.16*s,.16*s);orb.keyframe_insert("scale",frame=fr)
    return root

kai=fighter("Kai",-1.75,1,ARMOR,HAIR_WHITE,CAPE_BLUE,BLUE)
ren=fighter("Ren",1.75,-1,ARMOR_GOLD,HAIR_GOLD,CAPE_RED,GOLD)

# Rock floor with shader-generated lava fissures.
bpy.ops.mesh.primitive_plane_add(size=100,location=(0,0,-.035))
ground=bpy.context.object;ground.name="Volcanic_Battlefield"
ground_mat=bpy.data.materials.new("Fissured_Lava_Procedural")
ground_mat.use_nodes=True
nodes=ground_mat.node_tree.nodes;links=ground_mat.node_tree.links
p=nodes.get("Principled BSDF")
tex=nodes.new("ShaderNodeTexNoise");tex.inputs["Scale"].default_value=8;tex.inputs["Detail"].default_value=4
vor=nodes.new("ShaderNodeTexVoronoi");vor.feature="DISTANCE_TO_EDGE";vor.inputs["Scale"].default_value=3.8
ramp=nodes.new("ShaderNodeValToRGB")
ramp.color_ramp.elements[0].position=.02
ramp.color_ramp.elements[0].color=(.85,.045,.008,1)
ramp.color_ramp.elements[1].position=.09
ramp.color_ramp.elements[1].color=(.017,.013,.019,1)
links.new(vor.outputs["Distance"],ramp.inputs["Fac"])
links.new(ramp.outputs["Color"],p.inputs["Base Color"])
links.new(ramp.outputs["Color"],p.inputs["Emission Color"])
p.inputs["Emission Strength"].default_value=1.4
ground.data.materials.append(ground_mat)

# Ancient jagged rocks and flying fragments.
for i in range(65):
    theta=random.uniform(0,2*math.pi)
    radius=random.uniform(4,26)
    z=random.uniform(.15,1.4)
    x=radius*math.cos(theta);y=radius*math.sin(theta)+2
    if y < -2 and radius < 10: continue
    cone("Basalt_Pillar_%02d"%i,(x,y,z/2),random.uniform(.2,.65),z,DARKROCK,vertices=random.choice((4,5,6)),
         rotation=(random.uniform(-.25,.25),random.uniform(-.22,.22),0))
for i in range(32):
    x=random.uniform(-4.3,4.3);y=random.uniform(-2,3);z=random.uniform(1,5)
    stone=cube("Suspended_Debris_%02d"%i,(x,y,z),(.06,.10,.12),DUST,
               rot=(random.random()*3,random.random()*3,random.random()*3))
    for frame,delta in ((1,0),(24,random.uniform(.05,.45))):
        stone.location.z=z+delta;stone.keyframe_insert("location",frame=frame)

# Red eclipse in the actual 3D environment (placed behind fighters).
moon=sphere("Eclipse_Red_Moon",(0,18,10), (4.4,.1,4.4),MOON,segments=64,rings=32)
sphere("Eclipse_Dark_Center",(0,17.82,10.04),(3.40,.13,3.40),BLACK,segments=64,rings=32)

def beam(name,material,offset):
    # Curved GPU-independent glow filaments; energy arc strengths animate.
    curve=bpy.data.curves.new(name,"CURVE");curve.dimensions="3D"
    curve.bevel_depth=.028;curve.bevel_resolution=2
    poly=curve.splines.new("POLY");poly.points.add(13)
    for idx,p in enumerate(poly.points):
        t=idx/13*math.pi*1.5
        p.co=(offset+math.cos(t)*(1.3+t*.1),-.35,1.45+math.sin(t)*.7,1)
    ob=bpy.data.objects.new(name,curve);scene.collection.objects.link(ob)
    ob.data.materials.append(material)
    for frame,v in ((1,.05),(8,.5),(13,1.4),(19,1.5),(24,.9)):
        ob.scale=(v,v,v);ob.keyframe_insert("scale",frame=frame)
    return ob

for n in range(4):
    beam("Blue_Arc_%02d"%n,BLUE,-1.8)
    beam("Golden_Arc_%02d"%n,GOLD,1.8)

def area(name,loc,power,color,size):
    d=bpy.data.lights.new(name,"AREA");d.energy=power;d.color=color;d.shape="DISK";d.size=size
    obj=bpy.data.objects.new(name,d);scene.collection.objects.link(obj);obj.location=loc
    obj.rotation_euler=(Vector((0,0,1.5))-obj.location).to_track_quat("-Z","Y").to_euler()
area("Blue_Practical",(-3,-3,5),950,(.06,.37,1),5)
area("Gold_Practical",(3,-3,5),1150,(1,.28,.055),5)
area("Crimson_Rim",(0,5,9),1700,(.94,.035,.055),8)

world=bpy.data.worlds.new("ColdNight");world.use_nodes=True
world.node_tree.nodes["Background"].inputs["Color"].default_value=(.003,.006,.014,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value=.25
scene.world=world

camd=bpy.data.cameras.new("Hero_Wide_40mm")
cam=bpy.data.objects.new("Hero_Wide_40mm",camd)
scene.collection.objects.link(cam)
cam.location=(0,-11.8,4.2)
cam.rotation_euler=(Vector((0,0,2.0))-cam.location).to_track_quat("-Z","Y").to_euler()
camd.lens=40
scene.camera=cam

# Mid-shot flash and collision escalation with restrained fixed master composition.
for frame in range(1,25):
    scene.frame_set(frame)
    scene.render.filepath=str(OUT/("frame_%04d.png"%frame))
    bpy.ops.render.render(write_still=True)

scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/"kai_ren_shot_01.blend"),check_existing=False)
import json
(OUT/"shot.json").write_text(json.dumps({
    "title":"Kai vs Ren — Crimson Eclipse",
    "status":"animated original procedural previsualization",
    "shot":"01",
    "fps":24,"frames":24,"duration_seconds":1.0,
    "camera":"40mm static wide",
    "characters":["Kai (procedural stand-in)","Ren (procedural stand-in)"],
    "look":"red eclipse, basalt lava fissures, blue versus amber supernatural combat",
    "render":"Blender Cycles CPU on GitHub hosted runner",
    "next_milestones":"customize character models, choreograph full duel, increase sampling, integrate audio"
},indent=2),encoding="utf-8")
print("KAI_REN_FIRST_SHOT_RENDERED 24 frames",flush=True)
