"""Rig inspection and safe Blender operators for already provided humanoid assets.

No rig or actor is created implicitly. Motion retargeting is intentionally
explicit: arbitrary rigs do not share axes/rest poses or proportions.
"""
from __future__ import annotations

from .contracts import ContractError

HUMANOID_CHANNELS = (
    "hips", "spine", "chest", "neck", "head",
    "left_upper_arm", "left_lower_arm", "left_hand",
    "right_upper_arm", "right_lower_arm", "right_hand",
    "left_upper_leg", "left_lower_leg", "left_foot",
    "right_upper_leg", "right_lower_leg", "right_foot",
)


def validate_humanoid_map(armature, mapping: dict) -> dict:
    """Validate user-provided humanoid labels against actual armature bones.

    This is not retargeting: retargeting further requires a validated rest-pose
    alignment, root-motion convention, and scale calibration.
    """
    if armature is None or getattr(armature, "type", None) != "ARMATURE":
        raise ContractError("A real Blender ARMATURE object is required")
    if not isinstance(mapping, dict):
        raise ContractError("A humanoid mapping object is required")
    missing = set(HUMANOID_CHANNELS) - set(mapping)
    if missing:
        raise ContractError("Missing humanoid channels: " + ", ".join(sorted(missing)))
    names = {bone.name for bone in armature.data.bones}
    extra = [label + "=" + str(mapping[label]) for label in HUMANOID_CHANNELS if mapping[label] not in names]
    if extra:
        raise ContractError("Mapped bone not present: " + ", ".join(extra))
    if len({mapping[label] for label in HUMANOID_CHANNELS}) != len(HUMANOID_CHANNELS):
        raise ContractError("Two anatomical channels share the same bone")
    return {"armature": armature.name, "mapped_channels": len(HUMANOID_CHANNELS), "total_bones": len(names)}


def add_existing_ik_target(armature, *, end_bone: str, target, chain_count: int = 2):
    """Add IK to a selected pose bone for an existing target object.

    Caller owns space conversion, pole placement, stretch limits, IK/FK
    switching and preservation of the source rig's conventions.
    """
    if armature.type != "ARMATURE" or target is None:
        raise ContractError("IK requires an armature and an existing target")
    if end_bone not in armature.pose.bones:
        raise ContractError("Unknown end bone: " + end_bone)
    if type(chain_count) is not int or not 1 <= chain_count <= 6:
        raise ContractError("IK chain_count must be between 1 and 6")
    bone = armature.pose.bones[end_bone]
    constraint = bone.constraints.new("IK")
    constraint.name = "StudioIK_" + end_bone
    constraint.target = target
    constraint.chain_count = chain_count
    constraint.use_stretch = False
    return constraint
