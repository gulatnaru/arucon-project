import ExpoModulesCore
import Foundation
import CryptoKit
#if canImport(MediaPipeTasksRetrieval)
import MediaPipeTasksRetrieval
#endif

/** Separate serial worker; no main-thread inference, SQLite or sensor calls. */
public class AruconEmbeddingModule: Module {
  private let worker = DispatchQueue(label: "com.arucon.reboot.embedding", qos: .utility)
  private let cancellationLock = NSLock()
  private var canceled = Set<String>()
  private var loadMs: Double = 0
  private var lastInferenceMs: Double = 0
  private let expectedHash = "2d079ee2f6f066b1f368e8d7c819f55214eaef1d0513b312321901f30ab286fb"
  #if canImport(MediaPipeTasksRetrieval)
  private var model: UniversalEmbedder?
  #endif

  private func failure(_ message: String) -> NSError {
    NSError(domain: "ARUCON_LOCAL_EMBEDDING", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
  }
  private func isCanceled(_ id: String) -> Bool {
    cancellationLock.lock(); defer { cancellationLock.unlock() }; return canceled.contains(id)
  }
  public func definition() -> ModuleDefinition {
    Name("AruconEmbedding")
    Function("cancel") { (id: String) in
      self.cancellationLock.lock(); self.canceled.insert(id)
      if self.canceled.count > 128 { self.canceled = [id] }
      self.cancellationLock.unlock()
    }
    AsyncFunction("loadAsync") { () -> [String: Any] in
      #if canImport(MediaPipeTasksRetrieval)
      if self.model == nil {
        let start = DispatchTime.now().uptimeNanoseconds
        let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let path = documents.appendingPathComponent("reboot_embeddinggemma2.litertlm")
        guard FileManager.default.fileExists(atPath: path.path) else { throw self.failure("AI_ADAPTER_BLOCKED: pinned local model file is not installed") }
        let data = try Data(contentsOf: path, options: .mappedIfSafe)
        let hash = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
        guard hash == self.expectedHash else { throw self.failure("AI_ADAPTER_BLOCKED: model checksum mismatch") }
        let options = UniversalEmbedderOptions()
        options.baseOptions.modelAssetPath = path.path
        options.baseOptions.delegate = .CPU
        options.textDelegate = .CPU
        options.l2Normalize = true
        options.maxInputLength = 128
        options.cacheDirectory = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].path
        self.model = try UniversalEmbedder(options: options)
        self.loadMs = Double(DispatchTime.now().uptimeNanoseconds - start) / 1_000_000
      }
      return ["status": "REAL_NATIVE_MODEL_LOADED", "model": "litert-community/embeddinggemma-2-text-270m-litert-lm",
              "revision": "9be6e8b90982095dc05c2bd162e4b954ee4dbac7", "sha256": self.expectedHash,
              "sdk": "MediaPipeTasksRetrieval1.1.0", "backend": "CPU", "loadMs": self.loadMs,
              "lastInferenceMs": self.lastInferenceMs, "scope": "loaded, inference must be verified separately"]
      #else
      throw self.failure("AI_ADAPTER_BLOCKED: MediaPipeTasksRetrieval is not linked")
      #endif
    }.runOnQueue(worker)
    AsyncFunction("embedAsync") { (texts: [String], requestId: String) -> [[Double]] in
      guard !texts.isEmpty && texts.count <= 65 && texts.allSatisfy({ !$0.isEmpty && $0.utf8.count <= 2048 }) else { throw self.failure("Invalid bounded synthetic text batch") }
      #if canImport(MediaPipeTasksRetrieval)
      guard let model = self.model else { throw self.failure("AI_ADAPTER_BLOCKED: model is not loaded") }
      let start = DispatchTime.now().uptimeNanoseconds
      var vectors = [[Double]]()
      for text in texts {
        if self.isCanceled(requestId) { throw self.failure("Request canceled") }
        let result = try model.embed(text: text)
        guard let values = result.embeddings.first?.floatEmbedding else { throw self.failure("No float embedding returned") }
        let v = values.map { $0.doubleValue }
        let norm = sqrt(v.reduce(0) { $0 + $1 * $1 })
        guard v.count == 768 && v.allSatisfy({ $0.isFinite }) && norm > 0.00001 else { throw self.failure("Invalid embedding dimensions or norm") }
        vectors.append(v.map { $0 / norm })
      }
      if self.isCanceled(requestId) { throw self.failure("Request canceled") }
      self.lastInferenceMs = Double(DispatchTime.now().uptimeNanoseconds - start) / 1_000_000
      self.cancellationLock.lock(); self.canceled.remove(requestId); self.cancellationLock.unlock()
      return vectors
      #else
      throw self.failure("AI_ADAPTER_BLOCKED: MediaPipeTasksRetrieval is not linked")
      #endif
    }.runOnQueue(worker)
  }
}
