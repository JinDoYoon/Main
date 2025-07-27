package com.main

import android.app.Notification
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.app.NotificationCompat
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.jstasks.HeadlessJsTaskConfig
import com.facebook.react.bridge.Arguments

class MyHeadlessService : HeadlessJsTaskService() {
    companion object {
        private const val TAG = "MyHeadlessService"
        private const val NOTIF_ID = 42
        private const val CHANNEL_ID = "websocket-service"
    }

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "Service onCreate")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.i(TAG, "onStartCommand received, starting foreground notification")

        // Build a minimal notification so Android O+ won't kill us
        val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("MyApp Background")
            .setContentText("WebSocket service running")
            .setSmallIcon(android.R.drawable.ic_menu_info_details)
            .setOngoing(true)
            .build()

        startForeground(NOTIF_ID, notification)

        return super.onStartCommand(intent, flags, startId)
    }

    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
        Log.i(TAG, "getTaskConfig → scheduling JS task")
        val data = Arguments.createMap()
        return HeadlessJsTaskConfig(
            "BackgroundTask",
            data,
            0,    // no timeout
            true  // allowed in foreground
        )
    }
}
