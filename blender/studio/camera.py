"""Reusable camera framing tools. Applied only to an existing camera by caller."""
from __future__ import annotations
from .contracts import ContractError


def set_camera_lens(camera, lens_mm: float, *, sensor_fit: str = "AUTO"):
    if camera is None or getattr(camera, "type", None) != "CAMERA":
        raise ContractError("Expected existing camera object")
    if not isinstance(lens_mm, (float, int)) or not 10 <= lens_mm <= 400:
        raise ContractError("Lens must be between 10 and 400 mm")
    camera.data.type = "PERSP"
    camera.data.lens = float(lens_mm)
    camera.data.sensor_fit = sensor_fit


def keyframe_camera(camera, frame: int, *, location=None, rotation_euler=None, lens_mm=None):
    """Keyframe an approved 3D camera path; no object is generated."""
    if camera is None or camera.type != "CAMERA" or frame < 1:
        raise ContractError("Expected camera and positive frame")
    if location is not None:
        if len(location) != 3:
            raise ContractError("Camera location must be xyz")
        camera.location = location
        camera.keyframe_insert(data_path="location", frame=frame)
    if rotation_euler is not None:
        if len(rotation_euler) != 3:
            raise ContractError("Camera rotation must be xyz radians")
        camera.rotation_euler = rotation_euler
        camera.keyframe_insert(data_path="rotation_euler", frame=frame)
    if lens_mm is not None:
        set_camera_lens(camera, lens_mm)
        camera.data.keyframe_insert(data_path="lens", frame=frame)
