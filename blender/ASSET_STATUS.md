# Blender asset library: verified benchmarks

## Completed checks

- [Blender 4.5.16 + Cycles + VRM 4.10.5 environment](https://github.com/Sonal040820/animation/actions/runs/43748055755): passed.
- [Khronos Rigged Figure proof](https://github.com/Sonal040820/animation/actions/runs/43749479522): two rigged instances, 19 bones each, actual 24-frame Cycles CPU render and MP4. CC BY 4.0 © Cesium. TECHNICAL FIXTURE ONLY.
- [Anime VRM rights audit](https://github.com/Sonal040820/animation/actions/runs/43749960132): source Git blob SHA and SHA256 verified, real VRM embedded permissions confirm CC0, use by everyone, commercial use allowed, violence allowed.
- [Anime foundation Blender import](https://github.com/Sonal040820/animation/actions/runs/43750368957): two true anime-styled avatars, three inspection renders, editable 41 MB Blender project.

## Approved asset registry

| Asset id | Character / role | Imported bones | Expressions | License |
|---|---|---:|---:|---|
| khronos_rigged_figure | Generic skinned mannequin, testing only | 19 | N/A | CC BY 4.0, attribution to Cesium |
| sendagaya_shino | Existing anime VRM, rig foundation | 148 | 42 shape keys | CC0, violent/commercial use allowed |
| vita | Existing anime VRM, rig foundation | 155 | 42 shape keys | CC0, violent/commercial use allowed |

The anime avatars are existing third-party designs, NOT original male Kai or Ren. They are useful for developing rigging and styling techniques, but should not be misrepresented as final character designs.

## Reusability and storage

- Exact source URLs are pinned to immutable GitHub commits and verified via SHA256 and Git blob hash.
- Avatar bytes live in a gitignored temporary runner folder and are regenerated when needed.
- The asset Blender project is available from GitHub Actions artifacts for 30 days, NOT committed as a regular source file. The workflow regenerates it from pinned approved sources.
- No paid models, GPU service, private cloud store or external credentials have been connected.

## Next creative milestone

Create original Kai/Ren character models with distinctive faces and costumes, verify true humanoid skeleton mapping and action retargeting, choreograph one strike-block-recovery sequence with measurable contact and foot locking, then render with existing Kokoro audio. Those are creative production tasks, not merely software setup.

These tests establish actual 3D skinned imports and cloud rendering. They do not prove professional anime artwork or physics-based cinematic fight animation.
