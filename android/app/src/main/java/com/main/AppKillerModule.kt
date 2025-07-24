package com.main

import android.app.ActivityManager
import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AppKillerModule(reactContext: ReactApplicationContext)
  : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "AppKiller"

  @ReactMethod
  fun killApp(packageName: String) {
    // use reactApplicationContext (inherited) rather than an undefined reactContext
    val am = reactApplicationContext
      .getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
    am.killBackgroundProcesses(packageName)
  }
}
