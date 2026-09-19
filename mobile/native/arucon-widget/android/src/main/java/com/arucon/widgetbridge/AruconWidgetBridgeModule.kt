package com.arucon.widgetbridge

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject

private const val SNAPSHOT_PREFERENCES = "arucon.widget.snapshot.v1"
private const val SNAPSHOT_KEY = "arucon.widget.snapshot.v1"
private const val PROVIDER_CLASS = "com.arucon.widget.AruconWidgetProvider"
private const val MAXIMUM_SAFE_INTEGER = 9_007_199_254_740_991L
private val PROJECTION_KEYS = setOf(
  "petId", "stateRevision", "updatedAtMs", "formId", "personalityProfileId", "displayState"
)
private val DISPLAY_STATES = setOf("awake", "sleeping", "hibernating", "needs_care")

private fun validSnapshot(raw: String): Boolean = runCatching {
  val json = JSONObject(raw)
  val keys = mutableSetOf<String>()
  val iterator = json.keys()
  while (iterator.hasNext()) keys.add(iterator.next())
  require(keys == PROJECTION_KEYS)
  listOf("petId", "formId", "personalityProfileId").forEach { key ->
    require(json.get(key) is String && json.getString(key).isNotEmpty())
  }
  val displayState = json.get("displayState")
  require(displayState is String && displayState in DISPLAY_STATES)
  listOf("stateRevision", "updatedAtMs").forEach { key ->
    val value = json.get(key)
    require(value is Byte || value is Short || value is Int || value is Long)
    require((value as Number).toLong() in 0..MAXIMUM_SAFE_INTEGER)
  }
}.isSuccess

class AruconWidgetBridgeModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("AruconWidgetBridge")

    AsyncFunction("replaceSnapshotJsonAsync") { snapshotJson: String ->
      if (!validSnapshot(snapshotJson)) throw CodedException("Widget snapshot violates the six-field contract")
      context.getSharedPreferences(SNAPSHOT_PREFERENCES, Context.MODE_PRIVATE)
        .edit()
        .putString(SNAPSHOT_KEY, snapshotJson)
        .apply()
    }

    AsyncFunction<String?>("readSnapshotJsonAsync") {
      val raw = context.getSharedPreferences(SNAPSHOT_PREFERENCES, Context.MODE_PRIVATE)
        .getString(SNAPSHOT_KEY, null)
        ?: return@AsyncFunction null
      return@AsyncFunction if (validSnapshot(raw)) raw else null
    }

    AsyncFunction<String>("requestTimelineReloadAsync") {
      val manager = AppWidgetManager.getInstance(context)
      val provider = ComponentName(context.packageName, PROVIDER_CLASS)
      val widgetIds = manager.getAppWidgetIds(provider)
      if (widgetIds.isEmpty()) return@AsyncFunction "deferred"
      val update = Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE)
        .setComponent(provider)
        .putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, widgetIds)
      context.sendBroadcast(update)
      return@AsyncFunction "requested"
    }
  }
}
