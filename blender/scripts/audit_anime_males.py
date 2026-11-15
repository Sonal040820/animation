"""Check bitwise integrity and embedded VRM permissions of alternative male anime rigs.

Do not import or publish characters until source rights allow commercial combat.
"""
from __future__ import annotations
import hashlib,json,sys
from pathlib import Path
from urllib.request import Request,urlopen
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/"blender/scripts"))
from inspect_vrm_rights import read_meta,evaluate

def main():
    doc=json.loads((ROOT/"blender/fixtures/anime-male-candidates.json").read_text())
    records=[]
    for item in doc["models"]:
        src=item["source_url"]
        if "raw.githubusercontent.com/madjin/vrm-samples/"+doc["pinned_revision"]+"/" not in src:
            raise RuntimeError("Unpinned model source")
        with urlopen(Request(src,headers={"User-Agent":"licensed-male-vrm-audit/1.0"}),timeout=95) as resp:
            data=resp.read(item["bytes"]+1)
        if len(data)!=item["bytes"]:raise RuntimeError("File size mismatch")
        git_blob=hashlib.sha1(b"blob "+str(len(data)).encode()+b"\0"+data).hexdigest()
        if git_blob!=item["git_blob_sha1"]:raise RuntimeError("Git blob checksum mismatch")
        rights=read_meta(data)
        allowed=evaluate(rights)
        item_report={"id":item["id"],"size":len(data),
                     "sha256":hashlib.sha256(data).hexdigest(),
                     "git_blob_sha1":git_blob,
                     "metadata":rights,"approved_for_public_combat":allowed}
        records.append(item_report)
        print("MALE_VRM_AUDIT="+json.dumps(item_report,sort_keys=True),flush=True)
    path=ROOT/"diagnostics/anime-male-audit.json"
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps({"models":records},indent=2),encoding="utf-8")
    if not any(x["approved_for_public_combat"] for x in records):
        print("NO_APPROVED_MALE_VRM_ASSETS")

if __name__=="__main__":main()
