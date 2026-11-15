"""Explicit/manual conversion of an approved local asset into an editable Blender file.

Infrastructure script only. Setup workflows DO NOT call it and do not generate
characters, scenes or meshes. Required asset must already be approved locally.
"""
from __future__ import annotations
import argparse
import json
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "blender"))
from studio.assets import import_registered_asset
from studio.contracts import ContractError
import bpy


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--asset-id", required=True)
    parser.add_argument("--output", required=True, help="Explicit destination .blend within renders/imported/")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])

    destination = Path(args.output).resolve()
    allowed = (ROOT / "renders/imported").resolve()
    if destination.suffix.lower() != ".blend" or not destination.is_relative_to(allowed):
        raise ContractError("Destination must be a .blend inside renders/imported")
    if destination.exists():
        raise ContractError("Refusing to overwrite an existing converted asset")
    destination.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    # VRM extension is optional; when installed by the verified installer,
    # explicitly enable before importing .vrm. Import function still checks.
    try:
        bpy.ops.preferences.addon_enable(module="bl_ext.user_default.vrm")
    except Exception:
        pass
    objects = import_registered_asset(
        args.asset_id, workspace=ROOT, registry_path=ROOT / "blender/assets/registry.json")
    if not objects:
        raise ContractError("No scene objects found in approved input")
    bpy.ops.wm.save_as_mainfile(filepath=str(destination), check_existing=False)
    print(json.dumps({"converted_asset": args.asset_id, "objects": objects,
                      "output": str(destination)}, sort_keys=True))


if __name__ == "__main__":
    main()
