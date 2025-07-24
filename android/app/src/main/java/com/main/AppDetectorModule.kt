package com.main

import android.content.pm.PackageManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AppDetectorModule(reactContext: ReactApplicationContext)
  : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "AppDetector"

  @ReactMethod
  fun getInstalledApps(promise: Promise) {
    try {
      val pm = reactApplicationContext.packageManager
      val apps = pm.getInstalledApplications(PackageManager.GET_META_DATA)
      val result = Arguments.createArray()

      for (appInfo in apps) {
        val map = Arguments.createMap()
        map.putString("name", pm.getApplicationLabel(appInfo).toString())
        map.putString("pkg", appInfo.packageName)
        result.pushMap(map)
      }

      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("APP_DETECT_ERROR", "Failed to list installed apps", e)
    }
  }
}
