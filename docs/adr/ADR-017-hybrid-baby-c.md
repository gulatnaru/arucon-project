# ADR-017 — Hybrid C: preferred A design and Blender rig, lower work

2026-10-09 · SOL_DIRECT / SELF_REVIEW · reversible engineering choice.

User review prefers A +35's low round mochi body, face and exposed large paws and rejects B's taller impression/small paws. C is a separate draft; no A/B file or default A is replaced. Final art/fun/size/adoption remains USER_REVIEW_PENDING.

Options: merely flattening B would not preserve A's designed contour. Import/re-export alone would not improve authoring. Chosen: read-only A GLB surface reference, preserve A body/paw samples, weld only duplicate seam/pole vertices, then author new fitted face/eyelid Shape Keys, normalized skin/rig, weight shift/stop acting and game export in Blender. A/B editor/source/runtime artifacts are hash-checked for immutability.

C joins same-material opaque body/ears/paws with vertex groups retained, and joins compatible pastel accents. The body never enters CPU face-morph buffers. Open-centre eyelid rims avoid filled duplicate caps; face contours retain 32 boundary segments while unnecessary interior rings are reduced. Unused game UVs and unkeyed constant bone channels are omitted using official exporter settings. This retains editable editor topology/weights/keys/actions. Geometry/morph/clip measurements and actual game quality are evaluated separately.

A/B keep their previous rig path. C explicitly resets sparse unanimated ear rotations to local rest before its shared expression delta, preventing accumulation. The existing floor/gait owns supporting paw positions; C's authored torso/head/toe/stop curves supply local weight acting. `baby_stop` samples the same .32 second landing interval; domain clocks/EXP/stamina/sleep/recovery are unchanged. Sparse channels remain in the `.blend`; runtime skin/morph/normal data is validated.

Same Release A/B/C +25/+35 comparison uses the same room/camera/light/render settings and normal-speed presentation timeline. Read-only replay produces no rewards or experience memories. Actual pet/floor/hand/rest/reduced/lifecycle tests remain separate. Fresh 60 second recording-OFF captures include actual loaded model/size/conditions; cached results from earlier selections cannot serve as a new result. Simulator proxies are not physical GPU/latency measurements.
