"""Metadata-only unit tests. No scene assets, images or video are generated."""
import json
import sys
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "blender"))
from studio.contracts import (
    ContractError, approved_asset, digest, load_json,
    safe_relative_path, validate_asset_registry, validate_production
)


class ContractTests(unittest.TestCase):
    def test_registry_contains_only_reviewed_fixture_metadata(self):
        registry = load_json(ROOT / "blender/assets/registry.json")
        assets = validate_asset_registry(registry, workspace=ROOT)
        self.assertEqual({a["id"] for a in assets}, {"khronos_rigged_figure", "sendagaya_shino", "vita", "vroid_hair_sample_male", "vroid_sakurada_fumiriya"})
        self.assertEqual(next(a for a in assets if a["id"] == "khronos_rigged_figure")["sha256"], "d6be85417d3e256861ee733eea6916093a7af7c79c16366181fd8abcaeb38cf5")
        self.assertTrue(all(a["rights_approved"] for a in assets))
        self.assertTrue(all(a["commercial_use_allowed"] and a["violence_allowed"] for a in assets))
        self.assertEqual({a["license"] for a in assets if a["id"].startswith("vroid_")}, {"CC0-1.0"})

    def test_schema_documents_parse(self):
        for name in ("asset", "shot", "production"):
            doc = load_json(ROOT / ("blender/schemas/" + name + ".schema.json"))
            self.assertEqual(doc["type"], "object")
            self.assertIn("$schema", doc)

    def test_toolchain_version(self):
        config = load_json(ROOT / "blender/config/toolchain.json")
        self.assertEqual(config["blender"]["version"], "4.5.16")
        self.assertTrue(config["blender"]["url"].startswith("https://download.blender.org/release/"))

    def test_reject_absolute_or_traversal(self):
        for candidate in ("/tmp/evil.blend", "../escape.blend", "assets-local/../../escape.blend",
                          r"assets-local\win-path.blend", "assets-local/.secret/file.blend"):
            with self.subTest(path=candidate), self.assertRaises(ContractError):
                safe_relative_path(candidate, ROOT)

    def test_reject_duplicate_asset_ids(self):
        a = self.asset()
        with self.assertRaisesRegex(ContractError, "Duplicate"):
            validate_asset_registry({"schema_version": 1, "assets": [a, a]}, workspace=ROOT)

    def test_invalid_sha_fails(self):
        a = self.asset()
        a["sha256"] = "123"
        with self.assertRaisesRegex(ContractError, "SHA-256"):
            validate_asset_registry({"schema_version": 1, "assets": [a]}, workspace=ROOT)

    def test_unapproved_asset_refused_even_if_metadata_valid(self):
        reg = {"schema_version": 1, "assets": [self.asset()]}
        validate_asset_registry(reg, workspace=ROOT)
        with self.assertRaisesRegex(ContractError, "Unapproved"):
            approved_asset(reg, "test_asset", ROOT)

    def test_production_requires_authored_shot(self):
        with self.assertRaisesRegex(ContractError, "at least one"):
            validate_production({"schema_version": 1, "slug": "example",
                "width": 1080, "height": 1920, "fps": 24, "asset_ids": [], "shots": []},
                {"schema_version": 1, "assets": []})

    def test_asset_digest_only_on_explicit_request(self):
        with TemporaryDirectory() as temp:
            p = Path(temp) / "sample.bin"
            p.write_bytes(b"contract-test-only")
            self.assertEqual(len(digest(p)), 64)

    @staticmethod
    def asset():
        return {"id": "test_asset", "kind": "character",
                "relative_path": "assets-local/actor.glb",
                "sha256": "f" * 64, "source_url": "https://example.com/actor.glb",
                "license": "CC0-1.0", "rights_approved": False,
                "redistribution_allowed": False}


if __name__ == "__main__":
    unittest.main()
