"""Pure-Python production contracts: no Blender or external dependencies."""
from __future__ import annotations
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlparse

ASSET_KINDS = {"character", "motion", "environment", "prop", "texture", "material", "audio", "reference", "vfx"}
SAFE_ID = re.compile(r"^[a-z][a-z0-9_-]{2,63}$")
SHA256 = re.compile(r"^[0-9a-fA-F]{64}$")
MEDIA_SUFFIXES = {".blend", ".glb", ".gltf", ".fbx", ".obj", ".usd", ".usdc", ".abc", ".vrm",
                  ".png", ".jpg", ".jpeg", ".webp", ".exr", ".hdr", ".wav", ".flac", ".ogg", ".mp3", ".mp4"}


class ContractError(ValueError):
    """Invalid or unsafe production manifest, not a recoverable import error."""


def load_json(path: str | Path) -> dict:
    with open(path, encoding="utf-8") as handle:
        obj = json.load(handle)
    if not isinstance(obj, dict):
        raise ContractError(f"Expected JSON object in {path}")
    return obj


def safe_relative_path(path: str, root: Path) -> Path:
    if not isinstance(path, str) or not path or "\\" in path:
        raise ContractError("Path must be a non-empty forward-slash relative path")
    relative = Path(path)
    if relative.is_absolute() or ".." in relative.parts or "." in relative.parts:
        raise ContractError("Unsafe path traversal or absolute path: " + path)
    if any(part.startswith(".") for part in relative.parts):
        raise ContractError("Hidden path components are disallowed")
    resolved = (root.resolve() / relative).resolve()
    if not resolved.is_relative_to(root.resolve()):
        raise ContractError("Path escapes approved workspace")
    return resolved


def _https(url: str) -> bool:
    if not isinstance(url, str):
        return False
    parsed = urlparse(url)
    return parsed.scheme == "https" and bool(parsed.hostname) and not parsed.username and not parsed.password


def validate_asset_registry(registry: dict, *, workspace: Path | None = None, verify_files: bool = False) -> list[dict]:
    if registry.get("schema_version") != 1 or not isinstance(registry.get("assets"), list):
        raise ContractError("Asset registry must have schema_version=1 and assets array")
    seen = set()
    for a in registry["assets"]:
        if not isinstance(a, dict) or not SAFE_ID.fullmatch(str(a.get("id", ""))):
            raise ContractError("Asset ID missing or invalid")
        if a["id"] in seen:
            raise ContractError("Duplicate asset ID: " + a["id"])
        seen.add(a["id"])
        if a.get("kind") not in ASSET_KINDS:
            raise ContractError("Unknown asset kind: " + a["id"])
        if not SHA256.fullmatch(str(a.get("sha256", ""))):
            raise ContractError("Asset requires SHA-256: " + a["id"])
        if not _https(a.get("source_url")):
            raise ContractError("Asset requires verified HTTPS source: " + a["id"])
        if not isinstance(a.get("license"), str) or len(a["license"]) < 3:
            raise ContractError("Asset license missing: " + a["id"])
        if not isinstance(a.get("rights_approved"), bool) or not isinstance(a.get("redistribution_allowed"), bool):
            raise ContractError("Rights flags must be explicitly boolean: " + a["id"])
        p = str(a.get("relative_path", ""))
        if not p.startswith("assets-local/"):
            raise ContractError("Assets must be under assets-local/")
        file = safe_relative_path(p, workspace or Path("."))
        if file.suffix.lower() not in MEDIA_SUFFIXES:
            raise ContractError("Unsupported asset extension: " + file.name)
        if verify_files:
            if not file.is_file():
                raise ContractError("Missing local approved asset: " + a["id"])
            if digest(file) != a["sha256"].lower():
                raise ContractError("SHA-256 mismatch: " + a["id"])
    return registry["assets"]


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def approved_asset(registry: dict, asset_id: str, workspace: Path) -> Path:
    validate_asset_registry(registry, workspace=workspace)
    match = next((a for a in registry["assets"] if a["id"] == asset_id), None)
    if match is None:
        raise ContractError("Unregistered asset: " + asset_id)
    if not match["rights_approved"]:
        raise ContractError("Unapproved asset: " + asset_id)
    if match.get("commercial_use_allowed") is False:
        raise ContractError("Asset explicitly forbids commercial use: " + asset_id)
    path = safe_relative_path(match["relative_path"], workspace)
    if not path.is_file() or digest(path) != match["sha256"].lower():
        raise ContractError("Missing or digest-mismatched asset: " + asset_id)
    return path


def validate_production(manifest: dict, registry: dict) -> dict:
    assets = validate_asset_registry(registry)
    if manifest.get("schema_version") != 1:
        raise ContractError("Production schema_version must be 1")
    if not SAFE_ID.fullmatch(str(manifest.get("slug", ""))):
        raise ContractError("Invalid production slug")
    fps = manifest.get("fps")
    if type(fps) is not int or fps not in (24, 25, 30, 60):
        raise ContractError("Unsupported fps")
    for axis, hi in (("width", 7680), ("height", 4320)):
        val = manifest.get(axis)
        if type(val) is not int or not (128 <= val <= hi):
            raise ContractError("Invalid dimensions: " + axis)
    ids = manifest.get("asset_ids")
    if not isinstance(ids, list) or len(ids) != len(set(ids)):
        raise ContractError("asset_ids must be unique array")
    available = {a["id"]: a for a in assets}
    for a in ids:
        if a not in available or not available[a]["rights_approved"]:
            raise ContractError("Unregistered or unapproved production asset: " + str(a))
    shots = manifest.get("shots")
    if not isinstance(shots, list) or not shots:
        raise ContractError("Production requires at least one authored shot")
    prior_end = 0
    seen_shots = set()
    for shot in shots:
        if not isinstance(shot, dict) or not SAFE_ID.fullmatch(str(shot.get("id", ""))):
            raise ContractError("Shot requires a safe unique ID")
        if shot["id"] in seen_shots:
            raise ContractError("Duplicate shot ID")
        seen_shots.add(shot["id"])
        a, b = shot.get("start_frame"), shot.get("end_frame")
        if type(a) is not int or type(b) is not int or a <= prior_end or b < a:
            raise ContractError("Shot frames must be increasing and non-overlapping")
        prior_end = b
        src = shot.get("scene_asset")
        if src not in ids or available[src]["kind"] not in {"environment", "reference", "prop"}:
            raise ContractError("Shot scene_asset must be an approved asset in production")
        if not isinstance(shot.get("camera"), str) or not shot["camera"]:
            raise ContractError("Shot requires camera name")
        if not isinstance(shot.get("audio_cue_ids"), list):
            raise ContractError("Shot requires audio_cue_ids array")
    return {"slug": manifest["slug"], "shots": len(shots), "fps": fps, "total_frames": prior_end}
