package com.main

import android.content.Intent
import com.facebook.react.jstasks.HeadlessJsTaskConfig
import com.facebook.react.jstasks.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap

class MyHeadlessService : HeadlessJsTaskService() {
    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
        val data: WritableMap = Arguments.createMap().apply {
            // forward any extras here:
            // intent?.getStringExtra("foo")?.let { putString("foo", it) }
        }
        return HeadlessJsTaskConfig(
            "BackgroundTask",  // JS task name
            data,
            0,    // timeout (0 = no timeout)
            true  // allowed while in foreground
        )
    }
}
