# Asset provenance and license gates

This folder deliberately contains **zero third-party asset bytes**. GitHub is a public repository: even when a character may be used in a rendered film, the unmodified source model might NOT be redistributable.

1. Research a specific asset through [the source catalog](../config/asset-sources.json); confirm its original provider and license on the actual asset page.
2. Review permitted commercial use, editing, redistribution and (for VRoid characters) depictions of violence. This is separate from Blender software's GPL license.
3. Download only after approval, via the provider's normal interface. Store asset bytes privately in \`assets-local/\`, not inside the Git repo.
4. Record its original source URL, license evidence, approval flags, SHA-256 and local relative path in \`registry.json\`.
5. \`studio.assets.import_registered_asset\` only imports approved verified local files; no implicit network access or license bypass.
6. Record credits if required. Models with restricted redistribution cannot be committed even when resulting MP4s may be shown publicly.

Recommended CC0 asset sources: Poly Haven, ambientCG, and individual Kenney packs. Character sources: Blender Studio or explicitly permitted VRoid and artist-authored avatars; preserve exact per-model terms. Mixamo motion usage likewise follows Adobe's terms. Blendkit permissions depend on each asset.

No copyrighted franchise characters, scraped media, paid downloads or models with unknown permission are automatically acquired by this setup.

## Verified current assets

The current registry has a licensed Khronos Rigged Figure fixture (CC BY 4.0), and the CC0 Sendagaya Shino and Vita anime VRM models. For both VRMs, the pipeline checks the actual embedded metadata: use by anyone, commercial permission, violent-use permission, and CC0 status. Source files are SHA256-pinned and downloaded to a temporary gitignored directory, not distributed through Git source.

[Full audit, render artifacts and next milestone](../ASSET_STATUS.md)
