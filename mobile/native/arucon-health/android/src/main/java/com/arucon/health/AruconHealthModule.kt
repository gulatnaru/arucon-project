package com.arucon.health

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Build-linked boundary only. There is deliberately no Health Connect client,
 * permission launcher, record read, or background worker in this module.
 */
class AruconHealthModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AruconHealth")

    AsyncFunction("getContractAsync") {
      mapOf(
        "contractVersion" to 1,
        "readMode" to "disabled",
        "platform" to "android"
      )
    }

    AsyncFunction("inspectAvailabilityAsync") { _: String ->
      mapOf("status" to "unavailable", "reason" to "native_read_disabled")
    }

    AsyncFunction("getReadPermissionAsync") { _: String ->
      "not_requested"
    }
  }
}
