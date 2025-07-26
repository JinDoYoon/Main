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

        // Setup as foreground service (persistent notification)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val chan = NotificationChannel(
                "focus_mode",
                "Focus Mode",
                NotificationManager.IMPORTANCE_LOW
            )
            (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                .createNotificationChannel(chan)
        }
        val notif = NotificationCompat.Builder(this, "focus_mode")
            .setContentTitle("Focus Mode Active")
            .setContentText("Restricted apps are blocked.")
            .setSmallIcon(R.drawable.ic_focus)
            .setOngoing(true)
            .build()
        startForeground(42, notif)

        // Inflate overlay layout
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        overlayView = LayoutInflater.from(this)
            .inflate(R.layout.overlay_layout, null)

        // Button to dismiss overlay
        overlayView?.findViewById<Button>(R.id.overlay_button)?.setOnClickListener {
            stopOverlay()
        }

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

    companion object {
        fun stopOverlay() {
            // Stop service to remove overlay
            // This requires context; typically called via ReactMethod
        }
    }
}