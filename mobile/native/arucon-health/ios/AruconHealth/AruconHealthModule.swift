import ExpoModulesCore

/**
 Build-linked boundary only. This module intentionally imports no HealthKit API,
 asks for no permission, and performs no health query.
 */
public class AruconHealthModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AruconHealth")

    AsyncFunction("getContractAsync") { () -> [String: Any] in
      return [
        "contractVersion": 1,
        "readMode": "disabled",
        "platform": "ios"
      ]
    }

    AsyncFunction("inspectAvailabilityAsync") { (_: String) -> [String: String] in
      return ["status": "unavailable", "reason": "native_read_disabled"]
    }

    AsyncFunction("getReadPermissionAsync") { (_: String) -> String in
      return "not_requested"
    }
  }
}
