# Hybrid baby C — editable Blender source

User review prefers A +35's low round mochi silhouette, face and large paws. C keeps A's actual body/paw surface samples (read-only import), then reworks fitted facial surfaces and eyelid rims, adds real weights/rig and authored torso/head/toe/stop acting. It is not a plain re-export or a scaled B. A/B files and default A remain unchanged; final art, fun, size and adoption are USER_REVIEW_PENDING.

- `arucon_baby_C.blend`: editable meshes, facial Shape Keys, materials, eight-bone rig/normalized weights, idle/walk/hop/stop/pet/release/sleep actions and separate editable root travel guide.
- `build_hybrid_baby.py`: actual `bpy` production source, using approved project-local Blender5.2.0 LTS.
- `../../mobile/assets/reboot-03-1/hybrid-baby.glb`: separate runtime export.
- `../../mobile/assets/reboot-03-1/manifest.json`: actual exporter/source/hash/parts/key/action provenance.

Run from repository root:

```sh
BLENDER_USER_CONFIG="$PWD/.tools/blender/config" BLENDER_USER_SCRIPTS="$PWD/.tools/blender/scripts" \
.tools/blender/Blender.app/Contents/MacOS/Blender --background --factory-startup \
  --offline-mode --python-exit-code 1 --python art/reboot-03-1/build_hybrid_baby.py
```

C's body UV seam is welded without moving the preferred A silhouette samples. Same-material opaque body/ears/paws are joined with weights retained. Accent parts are joined separately; face morphs remain small independent meshes so whole-body geometry does not enter CPU morph buffers. Lids are fitted open-centre rims instead of filled duplicate eye caps. Catchlights/cheeks use fewer interior rings without changing their displayed contour. UVs unused by these untextured materials are omitted only in the game export, and official exporter optimization removes unkeyed constant bone channels. Editor topology/keys/weights/actions remain editable.

The existing navigation/gait owns world travel, planted endpoints and floor/shadow; C's authored bone curves own torso/head/toe acting and stop weight settling. C resets unanimated ear local-rest rotation before applying expression delta so sparse clips cannot accumulate deformation. A/B retain their previous path. In-app comparison replay is presentation-only, not rewards or autonomous-gameplay proof; live touch/rest/lifecycle are checked separately.
