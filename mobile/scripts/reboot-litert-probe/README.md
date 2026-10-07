# Separate Swift text embedding probe

This is a synthetic verification example, not Arucon's product B adapter and not a chat engine. It never opens the game DB, reads health information, or sends inference inputs to a server. The review app continues using A.

Pinned inputs: LiteRT-LM **v0.18.0 / b2f686e2ed4718fb84ec398a61dd59ca0f0aff27**, verified official XCFramework checksums, and the existing public Apache-2.0 `litert-community/embeddinggemma-2-text-270m-litert-lm` revision `9be6e8b90982095dc05c2bd162e4b954ee4dbac7`. The model SHA is checked before inference. SDK sources are downloaded without modification; the project SDK, package/lockfile and native generated tree stay unchanged.

From the repository root, with the already available Xcode tools:

```sh
python3 mobile/scripts/reboot-litert-probe/verify.py \
  --model evidence/reboot-01-2026-10-07/embeddinggemma-2-text-270m.litertlm \
  --output evidence/reboot-litert-swift-probe
```

Add `--device <already-booted-ARM64-Simulator-UDID>` to compile/sign/install/launch the separate `com.arucon.reboot.embeddingprobe` application. The official iOS archive contains an ARM64 Simulator slice; x86 Simulator/physical-device support is not inferred. No global installation or account is needed in the verified macOS15.6/Xcode26.3 environment.

Inspect `real-swift-host.json` and the probe's `Documents/real-swift-simulator.json`. A process launch alone is not an inference PASS. A successful result contains real finite, normalized 768-dimensional embeddings and matching input/model identity. `visionBackend` and `audioBackend` are explicitly `nil`; the public `EmbeddingEngine.computeEmbedding` API is used. No `Engine.createConversation` or text generation is invoked.

All SDK/cache/model copies/build artifacts remain under ignored `evidence/`. Initialization timing starts after hash validation, which warms file pages; it is not cold app startup or physical-device/GPU performance. This small Korean retrieval example does not establish B superiority or gameplay benefit. The report separately records the earlier MediaPipe failure and the current standalone SDK success.

Sources: [official embedding guide](https://developers.google.com/edge/litert-lm/embedding_models), [pinned Swift embedding options](https://github.com/google-ai-edge/LiteRT-LM/blob/b2f686e2ed4718fb84ec398a61dd59ca0f0aff27/swift/EmbeddingEngineConfig.swift), [official v0.18.0 package](https://github.com/google-ai-edge/LiteRT-LM/blob/b2f686e2ed4718fb84ec398a61dd59ca0f0aff27/Package.swift).
