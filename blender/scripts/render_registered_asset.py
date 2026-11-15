"""Manual-only rendering of an existing, rights-approved .blend file.

This command NEVER runs as part of the environment setup workflow.
It imports nothing over the network and creates no geometry or characters.
"""
from __future__ import annotations
import argparse
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "blender"))
from studio.contracts import approved_asset, load_json, ContractError
from studio.render import configure_scene
import bpy


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--asset-id", required=True)
    parser.add_argument("--profile", choices=("preview", "final"), default="preview")
    parser.add_argument("--start", type=int, required=True)
    parser.add_argument("--end", type=int, required=True)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])

    if not 1 <= args.start <= args.end or (args.end - args.start) >= 240:
        raise ContractError("Frame range is limited to 1..240 frames per dispatch")
    scene_path = approved_asset(load_json(ROOT / "blender/assets/registry.json"), args.asset_id, ROOT)
    if scene_path.suffix.lower() != ".blend":
        raise ContractError("This renderer accepts only approved .blend source assets")
    output = Path(args.output_dir).resolve()
    safe_root = (ROOT / "renders").resolve()
    if not output.is_relative_to(safe_root):
        raise ContractError("Render outputs must be inside renders/")
    output.mkdir(parents=True, exist_ok=True)

    # --disable-autoexec on the CLI prevents script auto-execution in .blend.
    bpy.ops.wm.open_mainfile(filepath=str(scene_path), load_ui=False)
    scene = bpy.context.scene
    if scene.camera is None:
        raise ContractError("Authored scene has no active camera")
    profile = configure_scene(scene, args.profile, load_json(ROOT / "blender/config/toolchain.json"))
    print("Render approved source:", args.asset_id, profile, args.start, args.end)
    for frame in range(args.start, args.end + 1):
        scene.frame_set(frame)
        scene.render.filepath = str(output / f"frame_{frame:05d}.png")
        bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    main()
