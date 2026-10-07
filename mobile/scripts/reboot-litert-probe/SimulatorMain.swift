import Foundation
import UIKit
@main final class ProbeApp: UIResponder, UIApplicationDelegate {
 var window: UIWindow?
 func application(_ application: UIApplication, didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey:Any]?) -> Bool {
  let window = UIWindow(frame: UIScreen.main.bounds), vc = UIViewController(), text = UITextView(frame: UIScreen.main.bounds.insetBy(dx: 20, dy: 65))
  vc.view.backgroundColor = .systemBackground; text.isEditable = false; text.font = .monospacedSystemFont(ofSize: 12, weight: .regular); text.text = "Separate synthetic Swift EmbeddingEngine probe. No Arucon DB or health access."; vc.view.addSubview(text)
  window.rootViewController = vc; window.makeKeyAndVisible(); self.window = window
  Task {
   let docs = FileManager.default.urls(for:.documentDirectory,in:.userDomainMask)[0], cache = docs.appendingPathComponent("cache")
   try? FileManager.default.createDirectory(at: cache, withIntermediateDirectories:true)
   let result = await RebootTextProbe.run(modelPath: Bundle.main.path(forResource:"model",ofType:"litertlm")!, cachePath:cache.path, scope:"iOS arm64 Simulator26.3.1; standalone probe, not product B adapter")
   if let data = try? JSONSerialization.data(withJSONObject:result,options:[.prettyPrinted,.sortedKeys]) { try? data.write(to:docs.appendingPathComponent("real-swift-simulator.json")); text.text = String(data:data,encoding:.utf8) }
  }
  return true
 }
}
