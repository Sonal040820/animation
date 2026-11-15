"""Extract a semantic humanoid bone map directly from a licensed VRM file.

Pure Python; no Blender required. The node names from a GLB are checked against
the actual imported Blender armature before procedural IK/retargeting use.
Supports VRM0 and VRM1 humanoid structure; no arbitrary guessed bone aliases.
"""
from __future__ import annotations
import json,struct
from pathlib import Path
from .contracts import ContractError
from .rig import HUMANOID_CHANNELS

ALIASES={
  "hips":"hips","spine":"spine","chest":"chest","neck":"neck","head":"head",
  "leftUpperArm":"left_upper_arm","leftLowerArm":"left_lower_arm","leftHand":"left_hand",
  "rightUpperArm":"right_upper_arm","rightLowerArm":"right_lower_arm","rightHand":"right_hand",
  "leftUpperLeg":"left_upper_leg","leftLowerLeg":"left_lower_leg","leftFoot":"left_foot",
  "rightUpperLeg":"right_upper_leg","rightLowerLeg":"right_lower_leg","rightFoot":"right_foot"
}

def glb_json(file:Path)->dict:
    b=file.read_bytes()
    if len(b)<20 or b[:4]!=b"glTF":
        raise ContractError("VRM must be a binary glTF container")
    magic,version,length=struct.unpack_from("<4sII",b,0)
    if version!=2 or length!=len(b):
        raise ContractError("Invalid GLB v2 header")
    pos=12
    while pos+8<=len(b):
        count,typ=struct.unpack_from("<I4s",b,pos)
        start=pos+8;end=start+count
        if end>len(b):raise ContractError("Invalid GLB chunk size")
        if typ==b"JSON":
            return json.loads(b[start:end].decode("utf8").strip())
        pos=end
    raise ContractError("Missing GLB JSON chunk")

def semantic_bone_map(file:Path)->dict[str,str]:
    glb=glb_json(file)
    ext=glb.get("extensions",{})
    names=glb.get("nodes",[])
    if "VRM" in ext:
        raw=ext["VRM"].get("humanoid",{}).get("humanBones",[])
        raw={x["bone"]:x["node"] for x in raw if "bone" in x and "node" in x}
    elif "VRMC_vrm" in ext:
        raw={k:v["node"] for k,v in ext["VRMC_vrm"].get("humanoid",{}).get("humanBones",{}).items() if "node" in v}
    else:
        raise ContractError("File lacks VRM humanoid extension")
    mapping={}
    for source,dest in ALIASES.items():
        if source not in raw: continue
        index=raw[source]
        if type(index) is not int or index<0 or index>=len(names):
            raise ContractError("Invalid VRM bone node index")
        name=names[index].get("name")
        if not name or not isinstance(name,str):
            raise ContractError("Humanoid bone is unnamed: "+source)
        mapping[dest]=name
    missing=set(HUMANOID_CHANNELS)-set(mapping)
    if missing:
        raise ContractError("VRM lacks mandatory humanoid bone semantics: "+", ".join(sorted(missing)))
    if len(set(mapping.values()))!=len(mapping):
        raise ContractError("Source VRM humanoid mapping reuses bone nodes")
    return mapping
