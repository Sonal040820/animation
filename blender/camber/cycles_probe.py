"""Small, deterministic Blender Cycles GPU acceptance render. No external assets."""
import bpy, json, hashlib
from pathlib import Path
from mathutils import Vector

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.preferences.addon_enable(module="cycles")
prefs = bpy.context.preferences.addons["cycles"].preferences
selected = None
for backend in ("OPTIX", "CUDA"):
    try:
        prefs.compute_device_type = backend
        prefs.get_devices()
        devices = list(prefs.devices)
        gpu = [d for d in devices if d.type in {"OPTIX", "CUDA"} and d.type == backend]
        if gpu:
            for device in devices:
                device.use = device in gpu
            selected = {"backend": backend, "devices": [d.name for d in gpu]}
            break
    except Exception:
        continue
if not selected:
    raise RuntimeError("GPU_UNAVAILABLE_IN_BLENDER: neither OPTIX nor CUDA devices detected")

scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "GPU"
scene.cycles.samples = 8
scene.render.resolution_x = 320
scene.render.resolution_y = 180
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False

bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=1, location=(0,0,1))
obj=bpy.context.object
obj.name="GPU_Probe_Sphere"
material=bpy.data.materials.new("BlueProbeMaterial")
material.diffuse_color=(0.02,0.25,0.85,1)
material.use_nodes=True
bsdf=material.node_tree.nodes.get("Principled BSDF")
bsdf.inputs["Base Color"].default_value=(0.02,0.17,0.8,1)
bsdf.inputs["Metallic"].default_value=.45
bsdf.inputs["Roughness"].default_value=.25
obj.data.materials.append(material)
bpy.ops.mesh.primitive_plane_add(size=200, location=(0,0,-.02))
floor=bpy.context.object
floor.name="GPU_Probe_Floor"
light_data=bpy.data.lights.new("Softbox", "AREA")
light_data.energy=650
light=bpy.data.objects.new("Softbox", light_data)
scene.collection.objects.link(light)
light.location=(-2,-3,6)
camera_data=bpy.data.cameras.new("ProbeCamera")
camera=bpy.data.objects.new("ProbeCamera",camera_data)
scene.collection.objects.link(camera)
camera.location=(3,-6,3.1)
camera.rotation_euler=(Vector((0,0,1))-camera.location).to_track_quat("-Z","Y").to_euler()
scene.camera=camera

output=Path("gpu_probe.png").resolve()
scene.render.filepath=str(output)
bpy.ops.render.render(write_still=True)
if not output.is_file() or output.stat().st_size < 1000:
    raise RuntimeError("GPU_RENDER_FAILED: output not present or suspiciously small")
proof={"ok":True, "gpu_backend":selected["backend"], "gpu_device_names":selected["devices"],
       "blender_version":bpy.app.version_string, "output_sha256":hashlib.sha256(output.read_bytes()).hexdigest(),
       "output_bytes":output.stat().st_size, "samples":scene.cycles.samples, "resolution":"320x180"}
Path("gpu_probe_result.json").write_text(json.dumps(proof, sort_keys=True), encoding="utf-8")
print("CYCLES_GPU_RENDER_PASS "+json.dumps(proof,sort_keys=True),flush=True)
