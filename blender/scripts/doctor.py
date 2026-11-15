"""Headless Blender capability probe. NEVER renders or saves a scene.

Usage: blender -b --factory-startup --disable-autoexec --python-exit-code 1
             --python blender/scripts/doctor.py -- --output /tmp/blender-diagnostics.json
"""
from __future__ import annotations
import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "blender"))
from studio.contracts import load_json, validate_asset_registry
import bpy


def operator_available(operator) -> bool:
    try:
        operator.get_rna_type()
        return True
    except Exception:
        return False


def main():
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--output")
    arguments = parser.parse_args(args)
    toolchain = load_json(ROOT / "blender/config/toolchain.json")
    expected = toolchain["blender"]["version"]
    version = ".".join(map(str, bpy.app.version))
    if version != expected:
        raise RuntimeError(f"Blender version mismatch: expected {expected}, found {version}")
    assets = validate_asset_registry(load_json(ROOT / "blender/assets/registry.json"), workspace=ROOT)
    # Cycles is supplied as a registered add-on, so the static enum does NOT list it.
    # Test by enabling the bundled add-on and assigning the actual engine ID.
    bpy.ops.preferences.addon_enable(module="cycles")
    bpy.context.scene.render.engine = "CYCLES"
    engines = [bpy.context.scene.render.engine]
    importers = {
        "gltf": operator_available(bpy.ops.import_scene.gltf),
        "fbx": operator_available(bpy.ops.import_scene.fbx),
        "obj": operator_available(bpy.ops.wm.obj_import),
        "usd": operator_available(bpy.ops.wm.usd_import),
        "alembic": operator_available(bpy.ops.wm.alembic_import)
    }
    if "CYCLES" not in engines:
        raise RuntimeError("Cycles render engine missing")
    if not importers["gltf"] or not importers["obj"]:
        raise RuntimeError("Built-in glTF / OBJ importer unavailable")
    diagnostic = {
        "status": "pass",
        "blender_version": version,
        "blender_binary": bpy.app.binary_path,
        "background": bool(bpy.app.background),
        "gpu_required": False,
        "engines": engines,
        "importers": importers,
        "asset_count": len(assets),
        "optional_extensions": {"rigify": "not-required", "vrm": "not-required"},
        "rendered_frames": 0,
        "generated_scenes": 0
    }
    print("BLENDER_DIAGNOSTICS=" + json.dumps(diagnostic, sort_keys=True))
    if arguments.output:
        output = Path(arguments.output).resolve()
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(diagnostic, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
