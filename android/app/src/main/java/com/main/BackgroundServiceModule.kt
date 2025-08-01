package com.main

import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import android.provider.Settings
import com.facebook.react.bridge.Promise

@ReactMethod
fun canDrawOverlays(promise: Promise) {
  val allowed = Settings.canDrawOverlays(reactContext)
  promise.resolve(allowed)
}

class BackgroundServiceModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "BackgroundService"

  @ReactMethod
  fun start() {
    val intent = Intent(reactContext, MyHeadlessService::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      reactContext.startForegroundService(intent)
    } else {
      reactContext.startService(intent)
    }
  }

  @ReactMethod
  fun stop() {
    val intent = Intent(reactContext, MyHeadlessService::class.java)
    reactContext.stopService(intent)
  }
}
