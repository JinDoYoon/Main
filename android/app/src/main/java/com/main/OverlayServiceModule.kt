package com.main

import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class OverlayServiceModule(private val reactContext: ReactApplicationContext)
  : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "OverlayService"

  @ReactMethod
  fun startOverlay() {
    val intent = Intent(reactContext, OverlayService::class.java)
    intent.action = OverlayService.ACTION_SHOW
    reactContext.startService(intent)
  }

  @ReactMethod
  fun stopOverlay() {
    val intent = Intent(reactContext, OverlayService::class.java)
    intent.action = OverlayService.ACTION_HIDE
    reactContext.stopService(intent)
  }
}
