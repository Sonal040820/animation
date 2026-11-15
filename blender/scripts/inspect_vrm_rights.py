"""Audit actual embedded VRM rights before using any downloaded avatar for combat.

Inspects GLB metadata only. No Blender import, media rendering or assumption
that an aggregate repository's CC0 statement overrides per-avatar restrictions.
"""
from __future__ import annotations
import argparse,hashlib,json,struct
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.parse import urlparse

ROOT=Path(__file__).resolve().parents[2]

def read_meta(data:bytes):
    if len(data)<20 or data[:4]!=b"glTF": raise ValueError("Not a GLB container")
    _,version,total=struct.unpack_from("<4sII",data,0)
    if version!=2 or total!=len(data):raise ValueError("Malformed GLB length or version")
    pos=12
    while pos+8<=len(data):
        length,kind=struct.unpack_from("<I4s",data,pos)
        start=pos+8;end=start+length
        if end>len(data):raise ValueError("GLB chunk exceeds file size")
        if kind==b"JSON":
            obj=json.loads(data[start:end].decode("utf-8").strip())
            ex=obj.get("extensions",{})
            if "VRM" in ex:
                m=ex["VRM"].get("meta",{})
                return {"spec":"VRM0","avatar_title":m.get("title"),"license":m.get("licenseName"),
                        "violence":m.get("violentUssageName"),"commercial":m.get("commercialUssageName"),
                        "allowed_users":m.get("allowedUserName"),"redistribution":m.get("licenseName"),
                        "source_author":m.get("author"),
                        "other_permission_url":m.get("otherPermissionUrl")}
            if "VRMC_vrm" in ex:
                m=ex["VRMC_vrm"].get("meta",{})
                return {"spec":"VRM1","avatar_title":m.get("name"),"license":m.get("licenseUrl"),
                        "violence":m.get("allowExcessivelyViolentUsage"),
                        "commercial":m.get("commercialUsage"),
                        "allowed_users":m.get("avatarPermission"),
                        "redistribution":m.get("modification"),
                        "source_author":m.get("authors"),
                        "other_permission_url":m.get("otherLicenseUrl")}
            raise ValueError("File lacks embedded VRM metadata")
        pos=end
    raise ValueError("No JSON GLB chunk")

def evaluate(m):
    if m["spec"]=="VRM0":
        return (
          m["license"]=="CC0" and m["violence"]=="Allow"
          and m["commercial"]=="Allow" and m["allowed_users"]=="Everyone"
          and not m["other_permission_url"]
        )
    if m["spec"]=="VRM1":
        # VRM1 avatarPermission and additional violent restrictions must be
        # checked, in addition to copyright source license outside metadata.
        return (
          m["violence"] is True
          and m["allowed_users"]=="everyone"
          and m["commercial"]=="corporation"
          and m["redistribution"]=="allowModificationRedistribution"
          and not m["other_permission_url"]
        )
    return False

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--catalog",default=str(ROOT/"blender/fixtures/anime-vrm-candidates.json"))
    p.add_argument("--report",default=str(ROOT/"diagnostics/anime-vrm-rights.json"))
    args=p.parse_args()
    manifest=json.loads(Path(args.catalog).read_text(encoding="utf-8"))
    rows=[]
    for item in manifest["models"]:
        url=item["source_url"];uri=urlparse(url)
        if uri.scheme!="https" or uri.hostname!="raw.githubusercontent.com" or manifest["pinned_revision"] not in uri.path:
            raise ValueError("Unpinned or unapproved model source")
        if not 0 < item["bytes"] <= 30_000_000:raise ValueError("Unexpected model size")
        with urlopen(Request(url,headers={"User-Agent":"animation-vrm-license-audit/1.0"}),timeout=60) as r:
            data=r.read(item["bytes"]+1)
        if len(data)!=item["bytes"]:raise ValueError("Model size mismatch "+item["id"])
        blob_sha=hashlib.sha1(b"blob "+str(len(data)).encode()+b"\0"+data).hexdigest()
        if blob_sha!=item["git_blob_sha1"]:raise ValueError("Model Git blob SHA mismatch "+item["id"])
        rights=read_meta(data)
        allowed=evaluate(rights)
        rows.append({"id":item["id"],"sha256":hashlib.sha256(data).hexdigest(),
            "verified_blob":blob_sha,"bytes":len(data),
            "metadata":rights,"approved_for_public_combat":allowed,
            "license_notice":"Catalog CC0 assertion not enough: metadata controls actions."})
        print("VRM_AUDIT="+json.dumps(rows[-1],sort_keys=True),flush=True)
    report=Path(args.report);report.parent.mkdir(parents=True,exist_ok=True)
    report.write_text(json.dumps({"status":"inspected","candidates":rows},indent=2)+"\n",encoding="utf-8")

if __name__=="__main__":
    main()
