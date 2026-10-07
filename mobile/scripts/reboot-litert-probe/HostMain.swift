import Foundation
@main struct HostMain {
 static func main() async throws {
  let result = await RebootTextProbe.run(modelPath: CommandLine.arguments[1], cachePath: CommandLine.arguments[2], scope: "macOS host; distinct from Simulator and product adapter")
  let data = try JSONSerialization.data(withJSONObject: result, options: [.prettyPrinted,.sortedKeys])
  try data.write(to: URL(fileURLWithPath: CommandLine.arguments[3])); print(String(data:data,encoding:.utf8)!)
 }
}
