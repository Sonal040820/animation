"""Explicit import of approved, integrity-checked, local media only.

No automatic downloads; optional importers require separately installed extensions.
"""
from __future__ import annotations

from pathlib import Path
from .contracts import approved_asset, load_json, ContractError


def import_registered_asset(asset_id: str, *, workspace: Path, registry_path: Path):
    """Import only the named rights-approved asset into the currently open .blend.

    Operator behavior is intentionally isolated from asset acquisition. The caller
    explicitly saves a .blend afterward; this function never does so itself.
    """
    import bpy  # Blender's Python, unavailable under normal CPython
    registry = load_json(registry_path)
    asset_file = approved_asset(registry, asset_id, workspace)
    ext = asset_file.suffix.lower()
    filename = str(asset_file)
    before = set(obj.name for obj in bpy.data.objects)
    if ext in (".glb", ".gltf"):
        bpy.ops.import_scene.gltf(filepath=filename)
    elif ext == ".fbx":
        if not hasattr(bpy.ops.import_scene, "fbx"):
            raise ContractError("FBX importer not installed for this Blender build")
        bpy.ops.import_scene.fbx(filepath=filename)
    elif ext == ".obj":
        bpy.ops.wm.obj_import(filepath=filename)
    elif ext in (".usd", ".usdc"):
        bpy.ops.wm.usd_import(filepath=filename)
    elif ext == ".abc":
        bpy.ops.wm.alembic_import(filepath=filename)
    elif ext == ".vrm":
        if not hasattr(bpy.ops.import_scene, "vrm"):
            raise ContractError("VRM extension is optional and not installed")
        bpy.ops.import_scene.vrm(filepath=filename)
    elif ext == ".blend":
        # Load only named datablocks from the verified file. Never execute the
        # embedded Python in a downloaded .blend; Blender background mode uses
        # --disable-autoexec by default.
        with bpy.data.libraries.load(filename, link=False) as (source, dest):
            dest.collections = list(source.collections)
        for col in dest.collections:
            if col:
                bpy.context.scene.collection.children.link(col)
    else:
        raise ContractError("This asset type has no configured scene importer: " + ext)
    return sorted(set(obj.name for obj in bpy.data.objects) - before)
