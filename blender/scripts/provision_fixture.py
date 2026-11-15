"""Provision an explicitly reviewed, version-pinned CC-BY test asset.

Content is NOT saved in Git. Checks Git blob SHA-1, size and optional SHA-256.
This fixture is a technical test; do NOT reuse it as a finished character.
"""
from __future__ import annotations
import argparse, hashlib, json, sys
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/"blender"))
from studio.contracts import load_json, safe_relative_path, ContractError

def run(manifest_path:Path,output:Path):
    m=load_json(manifest_path)
    if m.get("schema_version")!=1 or not m.get("rights_approved"):
        raise ContractError("Fixture must have explicitly approved rights")
    u=m.get("source_url","")
    parsed=urlparse(u)
    if parsed.scheme!="https" or parsed.hostname!="raw.githubusercontent.com":
        raise ContractError("Pinned fixture URL must be raw.githubusercontent.com HTTPS")
    if m.get("source_commit") not in parsed.path or len(m.get("source_commit",""))!=40:
        raise ContractError("Pinned commit must appear in URL")
    if m.get("license")!="CC-BY-4.0" or not m.get("license_evidence_url","").startswith("https://"):
        raise ContractError("Fixture must retain verified license evidence")
    target=safe_relative_path(m["relative_path"],ROOT)
    max_size=3_000_000
    if target.is_file():
        data=target.read_bytes()
    else:
        req=Request(u,headers={"User-Agent":"animation-studio-fixture-probe/1.0"})
        with urlopen(req,timeout=45) as response:
            data=response.read(max_size+1)
    if len(data)>max_size or len(data)!=m["size_bytes"]:
        raise ContractError("Fixture exceeds approved size or differs from pinned size")
    sha1=hashlib.sha1(b"blob "+str(len(data)).encode()+b"\0"+data).hexdigest()
    sha256=hashlib.sha256(data).hexdigest()
    if sha1!=m["git_blob_sha1"]:
        raise ContractError("Git blob SHA1 mismatch, abort")
    if m.get("sha256") and sha256!=m["sha256"]:
        raise ContractError("SHA256 mismatch, abort")
    if data[:4]!=b"glTF":
        raise ContractError("Not a valid glTF binary signature")
    target.parent.mkdir(parents=True,exist_ok=True)
    if not target.is_file():
        target.write_bytes(data)
    report={k:m[k] for k in ("id","source_commit","source_url","git_blob_sha1","size_bytes","license","attribution")}
    report["sha256"]=sha256
    report["path"]=m["relative_path"]
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
    print("FIXTURE_PROVENANCE="+json.dumps(report,sort_keys=True))
    return report

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--manifest",default=str(ROOT/"blender/fixtures/rigged-figure.json"))
    p.add_argument("--output",default=str(ROOT/"diagnostics/rigged-figure-provenance.json"))
    args=p.parse_args()
    run(Path(args.manifest),Path(args.output))
