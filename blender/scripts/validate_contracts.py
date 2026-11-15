#!/usr/bin/env python3
"""Validate metadata without opening Blender, importing assets, or rendering."""
from __future__ import annotations
import argparse
import json
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "blender"))
from studio.contracts import load_json, validate_asset_registry, validate_production, approved_asset, ContractError

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--registry", default=str(ROOT / "blender/assets/registry.json"))
    parser.add_argument("--project", help="Optional explicitly authored project manifest")
    parser.add_argument("--verify-files", action="store_true", help="Verify local files against SHA-256")
    parser.add_argument("--asset-id", action="append", dest="asset_ids", help="Verify only the named approved assets; repeat as needed")
    args = parser.parse_args()
    try:
        registry = load_json(args.registry)
        assets = validate_asset_registry(registry, workspace=ROOT, verify_files=(args.verify_files and not args.asset_ids))
        if args.verify_files and args.asset_ids:
            for asset_id in args.asset_ids:
                approved_asset(registry, asset_id, ROOT)
        summary = {"status": "ok", "registered_assets": len(assets), "approved_assets": sum(a["rights_approved"] for a in assets)}
        if args.project:
            summary["production"] = validate_production(load_json(args.project), load_json(args.registry))
        print(json.dumps(summary, sort_keys=True))
        return 0
    except (ValueError, OSError, KeyError, TypeError) as err:
        print(json.dumps({"status": "failed", "reason": str(err)}), file=sys.stderr)
        return 1

if __name__ == "__main__":
    raise SystemExit(main())
