# Candidate B — actual Blender source

Candidate A (`mobile/assets/reboot-02/baby-gait.glb`) remains unchanged and is the default. User feedback that v8 improved appearance/expression/motion is preserved. Candidate B is a separate baby draft, not an approved replacement.

`build_baby.py` actually ran in project-local official Blender **5.2.0 LTS**, build **fbe6228777e7**. It imports no A geometry. It creates editable sculpted body topology, body-surface fitted face patches, facial Shape Keys, two connected front paws, one pearl horn, an eight-bone armature, normalized weights and sampled bone actions. No Blender MCP was available; production used the real `bpy` API.

Files:

- `arucon_baby_B.blend`: editable geometry, keys, material nodes, armature, weights, actions, separate authoring root-motion guide and studio camera.
- `../../mobile/assets/reboot-03/blender-baby.glb`: in-place game export.
- `../../mobile/assets/reboot-03/manifest.json`: actual exporter version/hash, keys, bones, clips and asset SHA256.

Reproduce from the repository root using the approved project-local installation:

```sh
BLENDER_USER_CONFIG="$PWD/.tools/blender/config" BLENDER_USER_SCRIPTS="$PWD/.tools/blender/scripts" \
.tools/blender/Blender.app/Contents/MacOS/Blender --background --factory-startup \
  --offline-mode --python-exit-code 1 --python art/reboot-03/build_baby.py
```

Open the `.blend` in Blender to edit topology/weights/keys. `AruconRoot` is the armature. Its actions include idle, walk, hop, pet and release. Facial keys are driven by the shared game expression adapter; they remain editable in Blender. `AuthoringRootMotionGuide` holds real travel/flight curves separately from exported in-place actions. The existing game navigation/gait owns root travel and grounded paw endpoints; authored torso, head and toe curves remain active. Three sanitizes `Paw.L/R` and `Ear.L/R` to `PawL/R` and `EarL/R`; the runtime adapter preserves bone rest transforms and maps non-rendering legacy controls to these bones.

A/B comparison uses the same room/camera/light/size/render profile. Controlled replay is **presentation-only**, not evidence of autonomous behavior, DB writes or rewards. The live direct-input path is checked separately. No final art, cuteness, size or superiority decision is made by these tools. See `REBOOT-03-REPORT.md` for actual native evidence and timing limitations.
