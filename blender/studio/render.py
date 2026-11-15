"""Explicit Blender render setup. Only called by the authorized shot renderer."""
from __future__ import annotations
from pathlib import Path
from .contracts import ContractError, load_json


def configure_scene(scene, profile: str, toolchain: dict):
    """Configure scene for file output; never renders or creates geometry."""
    profiles = toolchain["render_profiles"]
    if profile not in profiles:
        raise ContractError("Unknown render profile")
    cfg = profiles[profile]
    if cfg["engine"] == "CYCLES":
        import bpy
        bpy.ops.preferences.addon_enable(module="cycles")
    scene.render.engine = cfg["engine"]
    scene.cycles.device = "CPU"
    scene.cycles.samples = int(cfg["samples"])
    scene.render.resolution_x = int(toolchain["delivery"]["width"])
    scene.render.resolution_y = int(toolchain["delivery"]["height"])
    scene.render.resolution_percentage = int(cfg["resolution_percentage"])
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    return {"engine": scene.render.engine, "samples": scene.cycles.samples, "profile": profile}


def output_dir(project_dir: Path, shot_id: str) -> Path:
    if not shot_id or not shot_id.replace("_", "").replace("-", "").isalnum():
        raise ContractError("Invalid shot id")
    path = project_dir / "renders" / shot_id
    path.mkdir(parents=True, exist_ok=True)
    return path
