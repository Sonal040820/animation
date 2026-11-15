#!/usr/bin/env python3
"""Validate metadata without opening Blender, importing assets, or rendering."""
from __future__ import annotations
import argparse
import json
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "blender"))
from studio.contracts import load_json, validate_asset_registry, validate_production, ContractError

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--registry", default=str(ROOT / "blender/assets/registry.json"))
    parser.add_argument("--project", help="Optional explicitly authored project manifest")
    args = parser.parse_args()
    try:
        assets = validate_asset_registry(load_json(args.registry), workspace=ROOT)
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
