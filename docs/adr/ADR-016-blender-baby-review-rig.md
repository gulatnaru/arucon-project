# ADR-016 — Separate Blender baby and shared grounded control

2026-10-09 · reversible engineering decision · SOL_DIRECT / SELF_REVIEW.

The user requested actual Blender authoring and an in-app comparison against positively reviewed v8. A remains the default and its GLB is unchanged. B is a new editable Blender draft; no final art or size approval is inferred.

Options considered: importing/re-exporting A would not meet the authoring request. Replacing the game motion/navigation with exported root travel would confound A/B and duplicate floor/obstacle ownership. Chosen: author a separate B body/face/Shape Keys/armature/weights/in-place actions in Blender, retaining editable root trajectories in the `.blend`, and reuse the same navigation, expression requests, size and grounding timeline for both candidates.

B's actual bone curves drive torso/head/toe motion. Non-rendering v8-style foot controls are converted into parent-local PawL/R endpoints after the mixer, so support feet follow the same floor coordinates. Ear controls add to authored rest rotations. The software material uses Three r166 standard skinning chunks after existing CPU morphs; original non-skinned A keeps the equivalent position/normal path. Shared skeleton bone textures are disposed once on replacement.

Comparison replay is isolated presentation: same room/camera/light/render settings, front/side/back, +25/+35, no domain commands/memory/rewards. Four seconds per case removes only tail holds; walk remains two seconds, hop .9 seconds, stop .32 seconds and release remains at normal speed. Live touch and lifecycle are verified separately. A/B art identifiers (`v8`/`blender`) are separate from pre-existing AI A/B backends.

SELF_REVIEW found and fixed inward B horn faces and missing B sleep presentation. Sleep/hibernation services, recovery, EXP, coin and SQLite queue are unchanged. B's sleep action lowers the body; resting morphs close the eyes, shared grounding/shadows remain, and awake morphs restore through the same adapter. Comparison tools yield to the rest recovery button; requesting rest ends controlled replay.

Assets, editor/source and native evidence are identified in `REBOOT-03-REPORT.md`. Blender MCP was unavailable; real `bpy` production ran in the approved official project-local Blender. No dependency/SDK/internal Expo patch, external upload or default-model replacement was needed. B superiority and final adoption remain USER_REVIEW_PENDING. Simulator proxy is not physical GPU performance.
