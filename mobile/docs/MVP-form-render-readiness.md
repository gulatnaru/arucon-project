# MVP form renderer readiness

The persisted `formId` now crosses the App and room boundary and is resolved by
`src/scene/formPresentation.ts`. Form identity and personality remain separate.

The approved two-dimensional reference sheet exists at
`references/current-art/approved-first-evolution-sheet.png`, and the form names
and silhouettes are approved. The runnable mobile repository currently contains
one common preview GLB. `arucon` uses it as a common preview. `mallu`, `mono`,
`piko`, and `mongle` retain their persisted and displayed identities but report
`approved_reference_runtime_asset_missing` and use the same common preview GLB.
This is a renderer fallback contract, not evidence that four rigged/animated
runtime assets are delivered or visually verified in the app.

The form names and silhouettes come from SRS FR-5/FR-16,
`docs/character-naming.md`, `docs/personality-life-design.md`, and the approved
reference sheet. Delivering the four runtime assets, their rigging, motion
comparison, and release presentation remains a separate asset acceptance and
visual review step under those documents; it is not a new product decision.

Source contract tests verify App-to-scene propagation, catalog mapping, explicit
fallback status, and the absence of personality input in the form selector.
React Native/GLView rendering and motion capture remain `NOT_RUN / BLOCKED_ENV`
on this host and are not counted as a visual PASS.
