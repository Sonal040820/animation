"""Provision only pinned CC0 male VRM files with SHA256, git blob and license checks."""
from __future__ import annotations
import hashlib,json,sys
from pathlib import Path
from urllib.request import Request,urlopen
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/"blender"))
sys.path.insert(0,str(ROOT/"blender/scripts"))
from studio.contracts import load_json,approved_asset,ContractError
from inspect_vrm_rights import read_meta,evaluate

def main():
    manifest=load_json(ROOT/"blender/fixtures/anime-male-candidates.json")
    registry=load_json(ROOT/"blender/assets/registry.json")
    records=[]
    for candidate in manifest["models"]:
        matches=[asset for asset in registry["assets"] if asset["id"]==candidate["id"]]
        if len(matches)!=1:raise ContractError("Male avatar missing from approved registry")
        asset=matches[0]
        target=ROOT/asset["relative_path"]
        if not candidate["source_url"].startswith(
                "https://raw.githubusercontent.com/madjin/vrm-samples/"+manifest["pinned_revision"]+"/"):
            raise ContractError("Avatar source is not pinned")
        if candidate["source_url"]!=asset["source_url"]:
            raise ContractError("Source URL inconsistent with registry")
        if target.is_file():data=target.read_bytes()
        else:
            with urlopen(Request(candidate["source_url"],headers={"User-Agent":"licensed-kai-ren-avatar/1.0"}),timeout=95) as resp:
                data=resp.read(candidate["bytes"]+1)
        if len(data)!=candidate["bytes"]:raise ContractError("VRM download wrong size")
        git_blob=hashlib.sha1(b"blob "+str(len(data)).encode()+b"\0"+data).hexdigest()
        if git_blob!=candidate["git_blob_sha1"]:raise ContractError("VRM pinned Git blob mismatch")
        sha=hashlib.sha256(data).hexdigest()
        if sha!=asset["sha256"]:raise ContractError("VRM SHA-256 mismatch")
        rights=read_meta(data)
        if not evaluate(rights) or rights["license"]!="CC0":
            raise ContractError("VRM not approved for public anime combat")
        target.parent.mkdir(parents=True,exist_ok=True)
        if not target.is_file():target.write_bytes(data)
        approved_asset(registry,candidate["id"],ROOT)
        records.append({"id":candidate["id"],"sha256":sha,"bytes":len(data),"permissions":"CC0/commercial/violence verified"})
    print("KAI_REN_MALE_ASSETS_APPROVED="+json.dumps(records,sort_keys=True),flush=True)

if __name__=="__main__":main()
