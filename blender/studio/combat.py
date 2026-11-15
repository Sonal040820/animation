"""Reusable deterministic human animation: validated VRM rigs, root momentum and limb IK.

Targets and poses are keyed in world space and bone-local space respectively.
A choreography metric records contact reach: effects never claim to be real physics.
"""
from __future__ import annotations
import math
from dataclasses import dataclass
from pathlib import Path
from mathutils import Vector, Quaternion
import bpy

from .assets import import_registered_asset
from .contracts import approved_asset, load_json, ContractError
from .rig import add_existing_ik_target, validate_humanoid_map
from .vrm_humanoid import semantic_bone_map

@dataclass
class Fighter:
    label: str
    asset_id: str
    root: object
    armature: object
    mapping: dict
    hand_target: object
    foot_targets: tuple
    side: int

def actor_bounds(objects):
    corners=[o.matrix_world@Vector(p) for o in objects if o.type=="MESH" for p in o.bound_box]
    if not corners:
        raise ContractError("Imported character lacks mesh bounds")
    lo=Vector((min(p.x for p in corners),min(p.y for p in corners),min(p.z for p in corners)))
    hi=Vector((max(p.x for p in corners),max(p.y for p in corners),max(p.z for p in corners)))
    return lo,hi

def key_object(obj, data_path, values):
    for frame,val in values:
        setattr(obj,data_path,val)
        obj.keyframe_insert(data_path=data_path, frame=frame, group=obj.name)
    if obj.animation_data and obj.animation_data.action:
        action=obj.animation_data.action
        try:
            for fcurve in action.fcurves:
                for pt in fcurve.keyframe_points:
                    pt.interpolation="BEZIER"
        except AttributeError:
            # Blender 4.5 action layers differ; default key interpolation is Bezier.
            pass

def make_target(name,world):
    target=bpy.data.objects.new(name,None)
    bpy.context.scene.collection.objects.link(target)
    target.location=world
    target.hide_render=True
    target.empty_display_size=.08
    return target

def import_actor(workspace:Path,asset_id:str,label:str,side:int):
    registry=workspace/"blender/assets/registry.json"
    source=approved_asset(load_json(registry),asset_id,workspace)
    bone_map=semantic_bone_map(source)
    names=import_registered_asset(asset_id,workspace=workspace,registry_path=registry)
    objects=[bpy.data.objects[n] for n in names if n in bpy.data.objects]
    armatures=[o for o in objects if o.type=="ARMATURE"]
    if not armatures: raise ContractError("No imported rig for "+label)
    rig=armatures[0]
    validate_humanoid_map(rig,bone_map)
    low,high=actor_bounds(objects)
    if not .5<high.z-low.z<100: raise ContractError("Invalid model scale")
    root=bpy.data.objects.new(label+"_ActorRoot",None)
    bpy.context.scene.collection.objects.link(root)
    for obj in objects:
        if obj.parent is None:
            obj.parent=root
    s=2.10/(high.z-low.z)
    root.scale=(s,s,s)
    stage_x=-side*1.90
    root.location=(stage_x-s*(high.x+low.x)/2,-s*(high.y+low.y)/2,-s*low.z)
    root.rotation_euler.z=side*.72
    bpy.context.view_layer.update()
    for frame,offset,lift,yaw in [
        (1,0,0,.72),(7,.02,-.06,.70),(13,.27,-.09,.79),
        (20,.69,.04,1.02),(26,.84,.07,1.11),
        (29,.82,.04,1.08),(34,.70,-.04,.80),
        (42,.56,0,.72),(48,.54,0,.71)]:
        root.location=(stage_x+side*offset-s*(high.x+low.x)/2,-s*(high.y+low.y)/2,-s*low.z+lift)
        root.rotation_euler.z=side*yaw
        root.keyframe_insert("location",frame=frame)
        root.keyframe_insert("rotation_euler",frame=frame)
    bpy.context.scene.frame_set(1)
    bpy.context.view_layer.update()
    # Rebuild both arms into a guard stance instead of preserving VRM T-pose.
    # World-space IK markers are derived from the actual imported chest bone.
    hand_semantic="right_hand" if side==1 else "left_hand"
    guard_semantic="left_hand" if side==1 else "right_hand"
    chest_world=rig.matrix_world@rig.pose.bones[bone_map["chest"]].head
    strike_bone=bone_map[hand_semantic]
    other_bone=bone_map[guard_semantic]
    initial_strike=rig.matrix_world@rig.pose.bones[strike_bone].tail
    initial_guard=rig.matrix_world@rig.pose.bones[other_bone].tail
    htarget=make_target(label+"_StrikeHandIK",initial_strike)
    gtarget=make_target(label+"_OffHandGuardIK",initial_guard)
    add_existing_ik_target(rig,end_bone=strike_bone,target=htarget,chain_count=3)
    add_existing_ik_target(rig,end_bone=other_bone,target=gtarget,chain_count=3)
    # Elbows are lowered and both hands pulled forward. No original A/T pose remains.
    guard_start=chest_world+Vector((-side*.19,-.44,-.02))
    offhand_start=chest_world+Vector((side*.30,-.33,-.24))
    goal=Vector((-side*.14,-.22,1.63))
    retraction=Vector((-side*.72,-.48,1.57))
    # Absolute world-space targets follow the body's lunging translation.
    for frame,p in [
        (1,guard_start),
        (8,guard_start+Vector((side*.02,-.03,-.09))),
        (14,guard_start+Vector((side*.14,-.16,-.12))),
        (20,guard_start.lerp(goal,.62)),
        (25,goal),(27,goal),
        (31,retraction),
        (38,retraction+Vector((side*.13,-.03,-.08))),
        (48,guard_start+Vector((side*.54,-.04,0)))]:
        htarget.location=p
        htarget.keyframe_insert("location",frame=frame)
    for frame,p in [
        (1,offhand_start),
        (8,offhand_start+Vector((0,-.03,.06))),
        (20,offhand_start+Vector((side*.54,-.08,.16))),
        (27,offhand_start+Vector((side*.69,-.12,.15))),
        (33,offhand_start+Vector((side*.41,-.01,-.05))),
        (48,offhand_start+Vector((side*.52,0,0)))]:
        gtarget.location=p
        gtarget.keyframe_insert("location",frame=frame)
    ftargets=[]
    for footindex,key in enumerate(("left_foot","right_foot")):
        pb=rig.pose.bones[bone_map[key]]
        base=rig.matrix_world@pb.tail
        ft=make_target(label+"_"+key+"_Plant",base)
        add_existing_ik_target(rig,end_bone=bone_map[key],target=ft,chain_count=3)
        shift=side*(.62 if footindex==0 else .45)
        for frame,p in [(1,base),(12,base),
                        (17,base+Vector((shift,0,.21))),
                        (21,base+Vector((shift,0,0))),
                        (27,base+Vector((shift,0,0))),
                        (33,base+Vector((side*.36,0,.02))),
                        (48,base+Vector((side*.42,0,0)))]:
            ft.location=p;ft.keyframe_insert("location",frame=frame)
        ftargets.append(ft)
    # Pose bone rotation adds secondary spine/head anticipation and recoil.
    for semantic,weight in (("spine",.65),("chest",1),("head",.30),("neck",.20)):
        pb=rig.pose.bones[bone_map[semantic]]
        pb.rotation_mode="QUATERNION"
        for frame,yaw,pitch in [
            (1,0,0),(9,-.12,-.09),(15,-.20,-.11),
            (23,.30,.15),(27,.22,.07),(32,-.29,-.11),(40,-.08,0),(48,0,0)]:
            pb.rotation_quaternion=(Quaternion((0,0,1),side*yaw*weight)
                                    @ Quaternion((1,0,0),pitch*weight))
            pb.keyframe_insert("rotation_quaternion",frame=frame)
    return Fighter(label,asset_id,root,rig,bone_map,htarget,tuple(ftargets),side)

def contact_metrics(fighters,frame=26):
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    hands=[]
    for actor in fighters:
        bname=actor.mapping["right_hand" if actor.side==1 else "left_hand"]
        hands.append(actor.armature.matrix_world@actor.armature.pose.bones[bname].tail)
    return {
        "frame":frame,
        "hand_distance_m":round((hands[0]-hands[1]).length,4),
        "hand_heights_m":[round(h.z,3) for h in hands],
        "ik_targets_m":[list(round(v,3) for v in f.hand_target.location) for f in fighters],
        "rigged_bone_counts":[len(f.armature.data.bones) for f in fighters]
    }
