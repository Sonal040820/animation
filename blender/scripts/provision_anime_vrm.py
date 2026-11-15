"""Provision two vetted anime VRM model foundations from immutable public GitHub.

Requires embedded CC0, everyone/commercial/violent-use Allow, SHA256,
Git blob SHA1 and exact size. No credentials, no unlicensed downloads.
Models remain in gitignored assets-local/ and are NOT committed.
"""
from __future__ import annotations
import hashlib,json,sys
from pathlib import Path
from urllib.request import Request,urlopen
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/"blender"))
sys.path.insert(0,str(ROOT/"blender/scripts"))
from studio.contracts import load_json,approved_asset,ContractError
from inspect_vrm_rights import read_meta,evaluate

CATALOG=ROOT/"blender/fixtures/anime-vrm-candidates.json"
REGISTRY=ROOT/"blender/assets/registry.json"

def main():
    cfg=load_json(CATALOG)
    registry=load_json(REGISTRY)
    report=[]
    for item in cfg["models"]:
        url=item["source_url"]
        if not url.startswith("https://raw.githubusercontent.com/theminhnguyen/wonderdeck/"+cfg["pinned_revision"]+"/"):
            raise ContractError("Unpinned anime model source")
        target=ROOT/item["path"]
        if target.is_file():
            data=target.read_bytes()
        else:
            with urlopen(Request(url,headers={"User-Agent":"blender-anime-asset-loader/1.0"}),timeout=90) as resp:
                data=resp.read(item["bytes"]+1)
        if len(data)!=item["bytes"]:
            raise ContractError("Unexpected avatar size "+item["id"])
        h=hashlib.sha256(data).hexdigest()
        if h!=item["sha256"]:
            raise ContractError("Avatar SHA-256 mismatch "+item["id"])
        blob=hashlib.sha1(b"blob "+str(len(data)).encode()+b"\0"+data).hexdigest()
        if blob!=item["git_blob_sha1"]:
            raise ContractError("Avatar source revision mismatch "+item["id"])
        rights=read_meta(data)
        if not evaluate(rights) or rights["license"]!="CC0":
            raise ContractError("Anime model disallows public combat "+item["id"])
        target.parent.mkdir(parents=True,exist_ok=True)
        if not target.is_file():
            target.write_bytes(data)
        exact=approved_asset(registry,item["id"],ROOT)
        report.append({"id":item["id"],"sha256":h,"bytes":len(data),"path":str(exact),
                       "verified_embedded_permissions":rights,"approved":True})
    dest=ROOT/"diagnostics/anime-vrm-provision.json"
    dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(json.dumps(report,indent=2)+"\n")
    print("ANIME_ASSETS_VERIFIED="+json.dumps(report,sort_keys=True))

if __name__=="__main__":
    main()
