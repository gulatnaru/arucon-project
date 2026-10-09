# ADR-018 — native visual quality comparison and bounded room curves

2026-10-10 · SOL_DIRECT / SELF_REVIEW · reversible rendering implementation.

The existing Simulator profile creates a585×1266 GL buffer inside a390×844pt/3× native1170×2532 display and scales the smaller GLView by2. Raising Three's pixel ratio alone would double-count the Expo buffer or leave the actual layer unchanged. Comparison choices vary the actual GLView surface instead, retaining the room, camera, lights, material, actor, frame cadence and software CPU morph/queue path. Automatic/hardware DPR and AA defaults remain unchanged until review.

Expo55 official GLView documentation and installed expo-gl55.0.18 native GLView source expose iOS msaaSamples and MSAA color/depth resolve. The hardcoded JS contextAttributes.antialias=false is not proof that native MSAA is disabled. Record MAX_SAMPLES, active SAMPLES/SAMPLE_BUFFERS, framebuffer completeness and GL error from each actual context. Supported2/4 sample candidates are exposed only when the current capability allows them.

The FXAA comparison imports Three0.166.1's official r166 edge-aware shader. It renders to one color/depth target of actual buffer dimensions, then a fullscreen pass, with reciprocal texel size, no mipmaps or ad-hoc blur/upscale/sharpen. Resources belong to one controller and are disposed on profile/lifecycle replacement. Output is compared with native MSAA and noAA for face softness and frame cost before adoption.

Actual v4 FXAA first-frame GL_INVALID_OPERATION1282 was traced to Three WebGLState requesting BACK when switching to its default target. Expo iOS maps default framebuffer zero to its managed nonzero view FBO (EXGLContextSetDefaultFramebuffer), whose draw buffer is COLOR_ATTACHMENT0. An owned, cached context facade maps this public drawBuffers request only in iOS FXAA; all other modes/hardware contexts retain the exact unwrapped reference. It never changes vendor source/binaries/context ownership or clears errors to hide them. v5 actual framebuffer complete/error0 verifies the boundary fix; performance is still judged separately.

On this actual Apple Software Renderer, requests2 and4 both allocate4 samples (MAX_SAMPLES9). Record the driver result rather than inventing a native2-sample tier. Native4-sample cost is measured once as a supported mode; both request screenshots/support traces are retained.

The former24-longitude sphere supplies the large rug/cushion curves. Higher resolution cannot remove these polygon chords. Refine rug96, cushion64, leaf32, facility48 only, retaining dimensions, placement, smooth analytic normals and static batching; other small props keep24. A same-build2.25 legacy-geometry profile separates tessellation from resolution. No decoration/art/ownership is added or removed.

The baby idle previously applied asymmetric Curious morph targets without an active behavior. Neutral idle now relaxes these keys; explicit curiosity/play/wink retain authored asymmetry. All A/B/C bytes/editor sources remain preserved. No personality/economy/growth changes.

Input measurement starts at the accepted floor handler and includes raycast/navigation; autonomous movement omits the timing argument. Previously only pet input was measured. This exposed a slow closest-node search tracing hundreds of long lines before comparing distance. Sorting candidate distances and tracing nearest-first preserves the same visible nearest node and stable index ties;12 captured obstacle routes are identical before/after. Policies and collision/path results are preserved, not weakened.

Fresh60-second current Release captures use the same normal floor/pet input protocol at each resolution and record accepted sample counts, CPU phases, RAF/submission and host load. Proxies are not actual GPU/display FPS/physical latency; physical devices/heat/battery remain NOT_RUN. Initial new-profile CPU-path omission and pre-optimization input failure are retained as excluded/superseded evidence, not reused as PASS.

Sources checked: [Expo55 GLView](https://docs.expo.dev/versions/v55.0.0/sdk/gl-view/), [Three r166 FXAA source](https://github.com/mrdoob/three.js/blob/r166/examples/jsm/shaders/FXAAShader.js), installed expo-gl/ios/GLView.swift and common/EXWebGLMethods.cpp. No vendor patch, dependency/SDK switch or engine migration.
