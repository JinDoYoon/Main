package com.main

import android.app.ActivityManager
import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class CurrentAppModule(reactContext: ReactApplicationContext)
  : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "CurrentApp"

  @ReactMethod
  fun getForegroundApp(promise: Promise) {
    try {
      val am = reactApplicationContext
        .getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
      // loop running processes to find the one in foreground
      val running = am.runningAppProcesses
      val fg = running.firstOrNull {
        it.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
      }?.processName ?: ""
      promise.resolve(fg)
    } catch (e: Exception) {
      promise.reject("CURRENT_APP_ERROR", "Unable to get foreground app", e)
    }
  }
}
