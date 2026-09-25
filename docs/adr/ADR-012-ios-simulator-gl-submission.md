# ADR-012: iOS Simulator software GL submission and room layout ordering

- Status: Accepted for the observed local Simulator software renderer
- Date: 2026-09-26
- Scope: Expo GL room rendering on the observed Apple Software Renderer
- Product decisions changed: none

## Context

The SDK 55 iOS Simulator build loaded the room and the 15-clip GLB, but submitting a
new Expo GL batch on every RAF kept the serial `host.exp.gl` queue busy. The baseline
process used about one CPU core, UI input initially stalled, and the first completed
frame containing the GLB appeared only after a long delay. Native samples in
`mobile/evidence/ios-5da0048/renderer-baseline-sample.txt` and
`renderer-cadence-sample.txt` place the GL thread in software `glDrawElements` work.
The latter sample no longer shows the JS `getProgramInfoLog` wait, which separates the
remaining native draw throughput limit from the earlier JS stall.

The observed context identifies itself as:

```text
renderer: Apple Software Renderer
vendor: Apple Inc.
version: OpenGL ES 3.0 APPLE-23.0.2
```

The same run exposed an independent layout ordering race. `GLView` could create its
controller from the initial `1 x 1` React state after `onLayout` had already fired but
before that state was visible to the captured callback. The camera then kept a square
aspect, compressing the room horizontally and removing projected hit areas.

## Decision

Apply a reversible submission fallback only when both of these are true:

1. the platform is iOS;
2. renderer, vendor, and version match the observed Apple Software Renderer signature.

That fallback submits continuous frames no more often than every 333 ms. Simulation,
the animation mixer, navigation, touch spring, cue timers, and projection source state
continue to advance on every RAF with the existing `dt`. The first frame, a newly
attached GLB, resize, presentation change, input, and foreground resume mark a dirty
frame that bypasses the cadence once. Projected hit overlays on this throttled path are
published from the same tick as the submitted frame. The normal zero-interval path
retains its existing 80 ms projection publication cadence.

Store the latest layout in a ref before scheduling React state. Context creation reads
that ref, the existing live controller is resized directly from `onLayout`, and a state
effect reapplies the size after commit. This makes layout/context ordering converge on
the same dimensions without changing camera constants or hit geometry.

Android, iOS hardware renderer identities, and unknown identities retain the prior
per-RAF submission behavior. Build mode does not change the fallback because the same
Apple Software Renderer stall was reproduced from a Metro-independent release bundle.
This ADR does not select a physical-device release frame rate.

## Evidence and limits

- The 1 Hz diagnostic run reduced the observed Simulator process from about 100% CPU
  to 18.3%, displayed the GLB, accepted detail and room input, and preserved the local
  meal, sleep, and SQLite flows. The 1 Hz value was diagnostic and is not the selected
  fallback.
- The selected 333 ms fallback is a software-renderer comparison setting. It does not
  establish smooth walking, touch elasticity, FPS acceptance, or final visual quality.
- `EXT_color_buffer_float` and `pixelStorei` warnings were observed, but the product GLB
  uses no glTF extensions or textures and did render. They are not classified as the
  cause of the delayed first GLB frame.
- A Metro-independent release bundle installed and launched on the Simulator, then
  reproduced about 99.7% CPU and the stalled first-room behavior before the fallback
  was made build-mode independent. The first corrected build then exposed a separate
  SDK 55 boundary: `File.bytes()` requested write permission for the read-only bundled
  GLB. The scene now keeps the direct byte path, copies only iOS bundle assets into the
  writable cache through the SDK's source-read/destination-write `copy` API, and reads
  bytes there. Hashed assets reuse their cache entry; a hashless asset uses a unique
  temporary name and is deleted after reading so stale bytes cannot be reused. Android
  keeps the direct byte path.
- The final release build exited 0. With Metro absent on port 8081, the installed release
  app cold-launched and displayed the GLB in `30-release-final-room.png`. The source GLB
  and cached copy have the same SHA-256
  `6971e18721e03784a22033d5f73bcd90474862117f1cb7d694dc326d254e984f`.
  A second launch displayed the GLB again, while the cache inode, modification time, and
  size remained unchanged. This confirms reuse rather than a second copy.
- The final release storage snapshot reports food 1, coin 10, EXP 8,812,500, meals 1,
  registry 1, and SQLite integrity OK. A single 46.4% CPU process snapshot was observed;
  it is neither an FPS measurement nor a performance benchmark.
- Release input could not be repeated because the Mac UI was locked. Earlier debug
  runs observed detail, room movement and retarget, touch lifecycle, meal, and sleep
  behavior on the same 333 ms software-renderer path. This does not replace release
  input evidence.
- Physical iOS debug and release builds are NOT_RUN for this decision. No
  physical-device performance PASS follows from the Simulator fallback.
- Expo GL exposes no asynchronous frame-completion callback here. Cadence reduces queue
  pressure but does not prove a hard in-flight frame bound.

Actual screen and motion evidence remains subject to FR-10.1/16 visual review. Static
tests and a visible GLB frame do not approve motion quality.

## Rollback

Remove the renderer-identity cadence selection and `FrameSubmissionGate`, restore the
previous projection publication point, and remove the layout ref only if the event-order
race is replaced by another tested lifecycle contract. No product data or SQLite
migration is involved.
