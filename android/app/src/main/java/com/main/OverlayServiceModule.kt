package com.main

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import com.facebook.react.bridge.*

class OverlayServiceModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "OverlayService"

  @ReactMethod
  fun hasPermission(callback: Callback) {
    val granted = Settings.canDrawOverlays(reactContext)
    callback.invoke(granted)
  }

  @ReactMethod
  fun requestPermission() {
    val intent = Intent(
      Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
      Uri.parse("package:" + reactContext.packageName)
    ).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    reactContext.startActivity(intent)
  }

  @ReactMethod
  fun startOverlay() {
    // add a log so we can see in Logcat
    android.util.Log.d("OverlayService", "startOverlay() called")
    val intent = Intent(reactContext, OverlayService::class.java)
    reactContext.startService(intent)
  }

  @ReactMethod
  fun stopOverlay() {
    android.util.Log.d("OverlayService", "stopOverlay() called")
    val intent = Intent(reactContext, OverlayService::class.java)
    reactContext.stopService(intent)
  }
}
