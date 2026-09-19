import CoreFoundation
import ExpoModulesCore
import Foundation
import WidgetKit

private let appGroup = "group.com.arucon.dev.widget"
private let snapshotKey = "arucon.widget.snapshot.v1"
private let maximumSafeInteger: Int64 = 9_007_199_254_740_991
private let projectionKeys: Set<String> = [
  "petId", "stateRevision", "updatedAtMs", "formId", "personalityProfileId", "displayState"
]
private let displayStates: Set<String> = ["awake", "sleeping", "hibernating", "needs_care"]

private func nonemptyString(_ value: Any?) -> String? {
  guard let string = value as? String, !string.isEmpty else { return nil }
  return string
}

private func safeInteger(_ value: Any?) -> Bool {
  guard let number = value as? NSNumber,
        CFGetTypeID(number) != CFBooleanGetTypeID() else {
    return false
  }
  let integerEncodings: Set<String> = ["c", "s", "i", "l", "q", "C", "S", "I", "L", "Q"]
  guard integerEncodings.contains(String(cString: number.objCType)) else { return false }
  return number.int64Value >= 0 && number.int64Value <= maximumSafeInteger
}

private func validSnapshot(_ data: Data) -> Bool {
  guard let object = try? JSONSerialization.jsonObject(with: data),
        let dictionary = object as? [String: Any],
        Set(dictionary.keys) == projectionKeys,
        nonemptyString(dictionary["petId"]) != nil,
        nonemptyString(dictionary["formId"]) != nil,
        nonemptyString(dictionary["personalityProfileId"]) != nil,
        let displayState = nonemptyString(dictionary["displayState"]),
        displayStates.contains(displayState),
        safeInteger(dictionary["stateRevision"]),
        safeInteger(dictionary["updatedAtMs"]) else {
    return false
  }
  return true
}

public class AruconWidgetBridgeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AruconWidgetBridge")

    AsyncFunction("replaceSnapshotJsonAsync") { (snapshotJson: String) in
      guard let data = snapshotJson.data(using: .utf8), validSnapshot(data) else {
        throw Exception(name: "InvalidWidgetSnapshot", description: "Widget snapshot violates the six-field contract")
      }
      guard let defaults = UserDefaults(suiteName: appGroup) else {
        throw Exception(name: "WidgetContainerUnavailable", description: "Widget shared container is unavailable")
      }
      defaults.set(data, forKey: snapshotKey)
    }

    AsyncFunction("readSnapshotJsonAsync") { () -> String? in
      guard let defaults = UserDefaults(suiteName: appGroup),
            let data = defaults.data(forKey: snapshotKey),
            validSnapshot(data) else {
        return nil
      }
      return String(data: data, encoding: .utf8)
    }

    AsyncFunction("requestTimelineReloadAsync") { () -> String in
      WidgetCenter.shared.reloadTimelines(ofKind: "AruconWidget")
      return "requested"
    }
  }
}
