import Foundation
import CryptoKit
import LiteRTLM
struct RebootTextProbe {
 static func run(modelPath: String, cachePath: String, scope: String) async -> [String: Any] {
  let expectedHash = "2d079ee2f6f066b1f368e8d7c819f55214eaef1d0513b312321901f30ab286fb"
  guard let bytes = try? Data(contentsOf: URL(fileURLWithPath: modelPath), options: .mappedIfSafe) else { return ["status":"AI_PROBE_BLOCKED", "error":"Missing model file"] }
  let actualHash = SHA256.hash(data:bytes).map { String(format:"%02x",$0) }.joined()
  guard actualHash == expectedHash else { return ["status":"AI_PROBE_BLOCKED","error":"Model hash mismatch; input preserved"] }
  let engine = EmbeddingEngine(config: EmbeddingEngineConfig(modelPath: modelPath, backend: .cpu(threadCount: 2), visionBackend: nil, audioBackend: nil, cacheDir: cachePath, maxInputLength: 128))
  let started = Date(), lines = ["task: search query | text: 새 모자를 쓰고 이마를 살핀 기억", "task: search result | text: 아루가 처음 모자를 쓰고 이마를 살펴봤다.", "task: search result | text: 쿠션을 오른쪽으로 옮겼다."]
  do {
   try await engine.initialize(); let load = Date().timeIntervalSince(started) * 1000, first = Date()
   var vectors = [[Float]]()
   for line in lines { vectors.append(try await engine.computeEmbedding(contents: [.text(line)], options: EmbeddingOptions(normalize: true, outputSize: 768)).embedding) }
   let firstMs = Date().timeIntervalSince(first) * 1000, warm = Date()
   let again = try await engine.computeEmbedding(contents: [.text(lines[0])], options: EmbeddingOptions(normalize: true, outputSize: 768)).embedding
   let warmMs = Date().timeIntervalSince(warm) * 1000
   guard vectors.allSatisfy({ $0.count == 768 && $0.allSatisfy({ $0.isFinite }) && abs(sqrt($0.reduce(0.0, { $0 + Double($1*$1) })) - 1) < 0.001 }), again.count == 768 else { throw NSError(domain: "ProbeVector",code:1) }
   let dot = { (a: [Float], b: [Float]) -> Double in zip(a,b).reduce(0.0, { $0 + Double($1.0*$1.1) }) }
   let result: [String:Any] = ["status":"REAL_LOCAL_VERIFIED", "scope":scope,"api":"LiteRTLM.EmbeddingEngine.computeEmbedding", "sdk":"0.18.0", "backend":"CPU two threads", "visionBackend":"nil", "audioBackend":"nil", "model":"litert-community/embeddinggemma-2-text-270m-litert-lm", "revision":"9be6e8b90982095dc05c2bd162e4b954ee4dbac7", "modelSha256":actualHash, "queries":lines, "dimensions":vectors.map({$0.count}), "cosine":[dot(vectors[0],vectors[1]),dot(vectors[0],vectors[2])], "loadMs":load,"firstThreeMs":firstMs,"warmQueryMs":warmMs,"firstFive":vectors.map({Array($0.prefix(5))}),"economicCommands":false,"externalInference":false]
   await engine.close(); return result
  } catch { await engine.close(); return ["status":"AI_PROBE_BLOCKED","scope":scope,"api":"LiteRTLM.EmbeddingEngine","sdk":"0.18.0","error":String(describing:error)] }
 }
}
