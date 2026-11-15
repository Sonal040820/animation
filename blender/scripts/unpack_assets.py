"""Safely unpack a manually authorized private ZIP into assets-local/.

No URL requests here; archive comes from a GitHub secret-configured provider.
Reject symlinks, absolute/traversal paths, unbounded decompression and file
overwrites. Each individual asset is subsequently SHA-256 verified against the
rights-approved registry before Blender import.
"""
from __future__ import annotations
import argparse
from pathlib import Path
from zipfile import ZipFile
import sys

REPO = Path(__file__).resolve().parents[2]
MAX_ARCHIVE_BYTES = 4 * 1024 ** 3
MAX_FILES = 3000


def unpack(archive: Path, root: Path) -> int:
    root = root.resolve()
    count = 0
    expanded = 0
    with ZipFile(archive) as z:
        infos = z.infolist()
        if len(infos) > MAX_FILES:
            raise ValueError("Too many entries in asset archive")
        targets = []
        for item in infos:
            p = Path(item.filename)
            if p.is_absolute() or ".." in p.parts or not p.parts or p.parts[0] != "assets-local":
                raise ValueError("Unsafe or unexpected ZIP path: " + item.filename)
            if item.filename.startswith("/") or "\\" in item.filename:
                raise ValueError("Invalid ZIP path separator")
            mode = (item.external_attr >> 16) & 0o170000
            if mode == 0o120000:
                raise ValueError("Symlinks are prohibited in asset ZIP")
            dest = (root / p).resolve()
            if not dest.is_relative_to(root / "assets-local"):
                raise ValueError("Asset ZIP escapes private folder")
            expanded += item.file_size
            if expanded > MAX_ARCHIVE_BYTES:
                raise ValueError("Asset ZIP exceeds safe decompression limit")
            if dest.is_file():
                raise ValueError("Refusing to overwrite existing asset: " + str(p))
            targets.append((item, dest))
        for item, dest in targets:
            if item.is_dir():
                dest.mkdir(parents=True, exist_ok=True)
            else:
                dest.parent.mkdir(parents=True, exist_ok=True)
                with z.open(item) as src, dest.open("xb") as dst:
                    while True:
                        block = src.read(1024 * 1024)
                        if not block:
                            break
                        dst.write(block)
                count += 1
    return count


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--zip", required=True)
    p.add_argument("--workspace", default=str(REPO))
    args = p.parse_args()
    print("Files unpacked:", unpack(Path(args.zip), Path(args.workspace)))
