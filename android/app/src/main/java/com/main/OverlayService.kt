package com.main

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.util.Log
import android.view.LayoutInflater
import android.view.WindowManager
import android.widget.Button
import androidx.core.app.NotificationCompat

class OverlayService : Service() {
    private lateinit var windowManager: WindowManager
    private var overlayView: android.view.View? = null

    override fun onCreate() {
        super.onCreate()
        Log.d("OverlayService", "onCreate: adding overlay view")

        // 1) Notification channel for a true foreground service
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val chan = NotificationChannel(
                "focus_mode",
                "Focus Mode",
                NotificationManager.IMPORTANCE_LOW
            )
            (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                .createNotificationChannel(chan)
        }

        // 2) Build a low‑importance ongoing notification
        val notif = NotificationCompat.Builder(this, "focus_mode")
            .setContentTitle("Focus Mode Active")
            .setContentText("Restricted apps are blocked.")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            // note: no need for setOngoing – startForeground makes it ongoing
            .build()

        startForeground(42, notif)

        // 3) Inflate your overlay layout
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        overlayView = LayoutInflater.from(this)
            .inflate(R.layout.overlay_layout, null)

        // 4) Wire up the “Return” button to stop the service
        overlayView
          ?.findViewById<Button>(R.id.overlay_button)
          ?.setOnClickListener {
              stopForeground(true)
              stopSelf()
          }

        // 5) Add the view on top of everything
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
            WindowManager.LayoutParams.FLAG_FULLSCREEN or
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        )
        windowManager.addView(overlayView, params)
    }

    override fun onDestroy() {
        Log.d("OverlayService", "onDestroy: removing overlay view")
        overlayView?.let { windowManager.removeView(it) }
        stopForeground(true)
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
