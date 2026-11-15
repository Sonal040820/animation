"""Synthetic binary glTF parser tests: no models or media are generated."""
import json,struct,sys,unittest
from pathlib import Path
from tempfile import TemporaryDirectory

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/"blender"))
from studio.rig import HUMANOID_CHANNELS
from studio.vrm_humanoid import ALIASES,semantic_bone_map,glb_json
from studio.contracts import ContractError

class VRMMapTests(unittest.TestCase):
    def make(self,loc,missing=None):
        bones={}
        nodes=[]
        for source in ALIASES:
            if source==missing:continue
            bones[source]={"bone":source,"node":len(nodes)}
            nodes.append({"name":source+"_"+"studio"})
        obj={"asset":{"version":"2.0"},"nodes":nodes,
             "extensions":{"VRM":{"humanoid":{"humanBones":list(bones.values())}}}}
        text=json.dumps(obj,separators=(",",":")).encode()
        text+=b" "*((-len(text))%4)
        b=b"glTF"+struct.pack("<II",2,12+8+len(text))+struct.pack("<I4s",len(text),b"JSON")+text
        p=Path(loc)/"synthetic.glb";p.write_bytes(b);return p

    def test_full_humanoid_map(self):
        with TemporaryDirectory() as temp:
            mapping=semantic_bone_map(self.make(temp))
            self.assertEqual(set(mapping),set(HUMANOID_CHANNELS))
            self.assertEqual(len(set(mapping.values())),len(HUMANOID_CHANNELS))

    def test_missing_required_channel_rejected(self):
        with TemporaryDirectory() as temp:
            with self.assertRaisesRegex(ContractError,"mandatory"):
                semantic_bone_map(self.make(temp,missing="leftHand"))

    def test_bad_header_rejected(self):
        with TemporaryDirectory() as temp:
            p=Path(temp)/"bad.glb";p.write_bytes(b"not gltf")
            with self.assertRaises(ContractError):
                glb_json(p)

if __name__=="__main__":
    unittest.main()
