"""REAL 3D INTEGRATION PROOF (not production artwork).

Requires only a reviewed, SHA-256-verified CC BY humanoid test asset already
provisioned to assets-local/. Imports its armature + meshes TWICE, creates a
temporary studio environment and animates the roots in Blender, rendering a
24-frame low-quality preview. NEVER modifies the real Kai/Ren project.
"""
from __future__ import annotations
import json, math, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "blender"))
from studio.assets import import_registered_asset
from studio.contracts import load_json, approved_asset, ContractError
from studio.render import configure_scene
from studio.camera import set_camera_lens
import bpy
from mathutils import Vector

FIXTURE_ID = "khronos_rigged_figure"
OUT = ROOT / "renders/technical-rig-proof"


def bbox_world(objects):
    verts = []
    for o in objects:
        if o.type != "MESH":
            continue
        verts.extend(o.matrix_world @ Vector(c) for c in o.bound_box)
    if not verts:
        raise ContractError("Imported character has no geometry")
    return (
        Vector((min(v.x for v in verts), min(v.y for v in verts), min(v.z for v in verts))),
        Vector((max(v.x for v in verts), max(v.y for v in verts), max(v.z for v in verts))),
    )


def make_material(name, base, glow=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (base[0],base[1],base[2],1)
    mat.use_nodes = True
    principled = mat.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = (*base,1)
    principled.inputs["Roughness"].default_value = .45
    if glow:
        principled.inputs["Emission Color"].default_value = (*base,1)
        principled.inputs["Emission Strength"].default_value = glow
    return mat


def make_light(name, color, energy, location, size=3):
    data = bpy.data.lights.new(name, "AREA")
    data.energy, data.color, data.shape, data.size = energy, color, "DISK", size
    light = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(light)
    light.location = location
    return light


def look_at(obj, point):
    direction = Vector(point) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def fixture_actor(name, palette, x_at_start, x_at_end):
    existing = set(bpy.data.objects.keys())
    names = import_registered_asset(
        FIXTURE_ID, workspace=ROOT, registry_path=ROOT / "blender/assets/registry.json"
    )
    objects = [bpy.data.objects[n] for n in names if n in bpy.data.objects]
    armatures = [o for o in objects if o.type == "ARMATURE"]
    meshes = [o for o in objects if o.type == "MESH"]
    if not armatures or not meshes:
        raise ContractError("Rigged fixture imported without armature or mesh")
    bones = sum(len(a.data.bones) for a in armatures)
    if bones < 2:
        raise ContractError("Invalid skinned rig: expected multiple bones")
    lower, upper = bbox_world(objects)
    height = upper.z - lower.z
    if not .05 <= height <= 1000:
        raise ContractError("Implausible rig dimensions")
    group = bpy.data.objects.new("ActorRig_" + name, None)
    bpy.context.scene.collection.objects.link(group)
    for obj in objects:
        if obj.parent is None:
            obj.parent = group
        if obj.type == "MESH":
            for slot in obj.material_slots:
                # Copy materials to avoid changing the other import's rig
                if slot.material and slot.material.node_tree:
                    slot.material = slot.material.copy()
                    slot.material.diffuse_color = (*palette,1)
                    bsdf = slot.material.node_tree.nodes.get("Principled BSDF")
                    if bsdf:
                        bsdf.inputs["Base Color"].default_value = (*palette,1)
    scale = 2.1/height
    group.scale = (scale,scale,scale)
    x_center = (upper.x+lower.x)/2
    y_center = (upper.y+lower.y)/2
    group.location = (x_at_start - scale*x_center, -scale*y_center, -scale*lower.z)
    group.keyframe_insert(data_path="location", frame=1)
    group.location.x = x_at_end - scale*x_center
    group.keyframe_insert(data_path="location", frame=24)
    # Do not traverse bpy Action.fcurves: Blender 4.5 layered actions use channel bags.
    # We keep the source rig's embedded skeletal actions; the actor root
    # animation is only a positional/IK integration smoke test.
    return {"name": name, "objects": len(objects), "meshes": len(meshes),
            "armatures": len(armatures), "bones": bones,
            "source_actions": [a.name for a in bpy.data.actions],
            "original_height": round(height,4), "normalized_height": 2.1}


def scene_setup():
    scene = bpy.context.scene
    bpy.ops.preferences.addon_enable(module="cycles")
    toolchain = load_json(ROOT / "blender/config/toolchain.json")
    details = configure_scene(scene, "preview", toolchain)
    scene.render.resolution_percentage = 35
    scene.cycles.samples = 4
    scene.render.resolution_x = 1080
    scene.render.resolution_y = 1920
    scene.frame_start, scene.frame_end = 1, 24
    scene.render.fps = 24
    scene.view_settings.view_transform = "AgX"
    world = bpy.data.worlds.new("TechnicalValidationWorld")
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (.015,.02,.035,1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = .45
    return details


def stage():
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0,0,-.03))
    floor = bpy.context.object
    floor.name = "TECHNICAL_TestFloor"
    floor.data.materials.append(make_material("DarkStudio",(.019,.025,.05)))
    make_light("KeyNeutral", (1,.9,.82), 480, (0,-2,4), size=4)
    make_light("RimCyan", (.3,.75,1), 640, (-3,1,3), size=3)
    make_light("RimMagenta", (1,.35,.55), 540, (3,1,3), size=3)
    camdata = bpy.data.cameras.new("TechnicalPortraitCamera")
    cam = bpy.data.objects.new("TechnicalPortraitCamera",camdata)
    bpy.context.scene.collection.objects.link(cam)
    cam.location = (0,-8.4,3.1)
    look_at(cam,(0,0,1.25))
    set_camera_lens(cam,43)
    camdata.lens = 43
    bpy.context.scene.camera = cam


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    approved_asset(load_json(ROOT/"blender/assets/registry.json"),FIXTURE_ID,ROOT)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    profile = scene_setup()
    actors=[
        fixture_actor("A",(.12,.59,.9),-1.3,-.84),
        fixture_actor("B",(.96,.21,.38),1.3,.84)
    ]
    stage()
    scene = bpy.context.scene
    # Rendering is intentionally a brief *technical* proof and is authorized
    # by this isolated workflow. No copyrighted anime actor is generated.
    for frame in range(1,25):
        scene.frame_set(frame)
        scene.render.filepath = str(OUT/f"frame_{frame:04d}.png")
        bpy.ops.render.render(write_still=True)
    outcome={"status":"pass","kind":"technical-rig-and-camera-proof","source":FIXTURE_ID,
             "license":"CC-BY-4.0","actors":actors,"frames":24,"fps":24,
             "frame_resolution":[scene.render.resolution_x,scene.render.resolution_y,
                                 scene.render.resolution_percentage],
             "render_engine":scene.render.engine,"samples":scene.cycles.samples,
             "render_profile":profile,"not_final_anime_characters":True}
    (OUT/"proof.json").write_text(json.dumps(outcome,indent=2)+"\n",encoding="utf-8")
    print("RIG_PROOF="+json.dumps(outcome,sort_keys=True))


if __name__=="__main__":
    main()
