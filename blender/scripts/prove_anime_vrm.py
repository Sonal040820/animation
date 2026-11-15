"""Import two approved real anime VRM characters, verify rigs and save reusable .blend.

Technical asset foundation only, NOT the custom Kai/Ren film or fight animation.
All source model bytes are verified before this script is invoked.
"""
from __future__ import annotations
import json, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/"blender"))
from studio.contracts import load_json,approved_asset,ContractError
from studio.assets import import_registered_asset
from studio.render import configure_scene
from mathutils import Vector
import bpy

OUT=ROOT/"renders/anime-foundations"

def bounds(objects):
    corners=[o.matrix_world@Vector(p) for o in objects if o.type=="MESH" for p in o.bound_box]
    if not corners:raise ContractError("Anime actor has no mesh bounds")
    return (
      Vector((min(x.x for x in corners),min(x.y for x in corners),min(x.z for x in corners))),
      Vector((max(x.x for x in corners),max(x.y for x in corners),max(x.z for x in corners)))
    )

def show_actor(asset_id,x):
    before={o.name for o in bpy.data.objects}
    names=import_registered_asset(asset_id,workspace=ROOT,registry_path=ROOT/"blender/assets/registry.json")
    objs=[bpy.data.objects[n] for n in names if n in bpy.data.objects]
    meshes=[o for o in objs if o.type=="MESH"]
    armatures=[o for o in objs if o.type=="ARMATURE"]
    if len(armatures)<1 or len(meshes)<1:raise ContractError("No skinned humanoid imported "+asset_id)
    bones=sum(len(o.data.bones) for o in armatures)
    if bones<15:raise ContractError("Unexpectedly incomplete anime humanoid skeleton "+asset_id)
    low,hi=bounds(objs)
    h=hi.z-low.z
    if not .5<h<100:raise ContractError("Unexpected anime model dimensions")
    root=bpy.data.objects.new("ActorRoot_"+asset_id,None)
    bpy.context.scene.collection.objects.link(root)
    for o in objs:
        if o.parent is None:o.parent=root
    scale=2.15/h
    root.scale=(scale,scale,scale)
    root.location=(x-scale*(hi.x+low.x)/2, -scale*(hi.y+low.y)/2, -scale*low.z)
    return {"id":asset_id,"objects":len(objs),"mesh_count":len(meshes),
            "armature_count":len(armatures),"bone_count":bones,
            "height_before":round(h,4),"height_after":2.15,
            "blend_root_name":root.name,"material_count":sum(len(m.data.materials) for m in meshes),
            "shape_key_count":sum(len(m.data.shape_keys.key_blocks) if m.data.shape_keys else 0 for m in meshes)}

def light(name,xyz,energy,color,size):
    datablock=bpy.data.lights.new(name,"AREA")
    datablock.energy=energy
    datablock.color=color
    datablock.size=size
    ob=bpy.data.objects.new(name,datablock)
    bpy.context.scene.collection.objects.link(ob)
    ob.location=xyz

def aim(obj,target):
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat("-Z","Y").to_euler()

def camera(x,y,z,target,lens):
    cam=bpy.data.objects.get("AssetPreviewCamera")
    if cam is None:
        data=bpy.data.cameras.new("AssetPreviewCamera")
        cam=bpy.data.objects.new("AssetPreviewCamera",data)
        bpy.context.scene.collection.objects.link(cam)
    cam.location=(x,y,z)
    cam.data.lens=lens
    aim(cam,target)
    bpy.context.scene.camera=cam

def main():
    for asset_id in ("sendagaya_shino","vita"):
        approved_asset(load_json(ROOT/"blender/assets/registry.json"),asset_id,ROOT)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.preferences.addon_enable(module="bl_ext.user_default.vrm")
    bpy.ops.preferences.addon_enable(module="cycles")
    t=load_json(ROOT/"blender/config/toolchain.json")
    scene=bpy.context.scene
    configure_scene(scene,"preview",t)
    scene.render.resolution_percentage=42
    scene.cycles.samples=5
    scene.render.resolution_x,scene.render.resolution_y=1080,1920
    scene.render.image_settings.file_format="PNG"
    scene.render.film_transparent=False
    scene.view_settings.view_transform="AgX"
    world=bpy.data.worlds.new("ProofWorld")
    world.use_nodes=True
    world.node_tree.nodes["Background"].inputs["Color"].default_value=(.018,.025,.045,1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value=.55
    scene.world=world
    a=show_actor("sendagaya_shino",-1.0)
    b=show_actor("vita",1.0)
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.03))
    floor=bpy.context.object
    floor.name="TECHNICAL_PreviewFloor"
    mat=bpy.data.materials.new("DarkFloor")
    mat.diffuse_color=(.04,.052,.08,1)
    floor.data.materials.append(mat)
    light("KeySoft",(0,-3,4.5),520,(1,.94,.85),4)
    light("BlueSide",(-3,1,3.8),630,(.25,.65,1),3)
    light("RedSide",(3,1,3.8),620,(1,.38,.49),3)
    OUT.mkdir(parents=True,exist_ok=True)
    # One wide shot plus actual close framing of each asset; NO choreography.
    specs=[
      ("both",0,-6.3,3.0,(0,0,1.2),42),
      ("shino",-1,-4.2,2.0,(-1,0,1.53),67),
      ("vita",1,-4.2,2.0,(1,0,1.53),67)
    ]
    for i,(name,x,y,z,target,lens) in enumerate(specs):
        camera(x,y,z,target,lens)
        scene.frame_set(i+1)
        scene.render.filepath=str(OUT/(name+".png"))
        bpy.ops.render.render(write_still=True)
    result={"status":"pass","type":"reusable-anime-vrm-import-foundations",
            "assets":[a,b],"rendered_previews":[x[0]+".png" for x in specs],
            "frame_count":3,"animation_generated":False,
            "asset_license":"CC0, verified embedded commercial and violent-use Allow",
            "style_notice":"Uncustomized third-party anime avatar foundations; not original Kai/Ren"}
    # Store editable asset library outside git; artifacts can be downloaded for review.
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/"licensed_anime_foundations.blend"),check_existing=False)
    (OUT/"import-report.json").write_text(json.dumps(result,indent=2)+"\n")
    print("ANIME_VRM_IMPORT="+json.dumps(result,sort_keys=True))

if __name__=="__main__":
    main()
