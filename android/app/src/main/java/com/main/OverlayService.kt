package com.main

import android.app.Service
import android.content.Intent
import android.graphics.PixelFormat
import android.os.IBinder
import com.main.R
import android.view.LayoutInflater
import android.view.WindowManager
import android.widget.Button
import android.widget.FrameLayout
import android.widget.TextView
import android.util.Log

class OverlayService : Service() {
  private lateinit var windowManager: WindowManager
  private var overlayView: FrameLayout? = null

  override fun onCreate() {
    Log.d("OverlayService", "onCreate: overlay view being added")
    super.onCreate()
    windowManager = getSystemService(WINDOW_SERVICE) as WindowManager

    // Inflate a simple overlay layout
    val inflater = LayoutInflater.from(this)
    val view = inflater.inflate(R.layout.overlay_layout, null) as FrameLayout

    // Wire up the “Return Home” button to dismiss the overlay
    val btn = view.findViewById<Button>(R.id.overlay_button)
    btn.setOnClickListener {
      stopSelf()
    }

    // Add it full‑screen, above all other windows
    val params = WindowManager.LayoutParams(
      WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.MATCH_PARENT,
      // Note: TYPE_APPLICATION_OVERLAY requires API 26+
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
      WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
      WindowManager.LayoutParams.FLAG_LAYOUT_INSET_DECOR,
      PixelFormat.TRANSLUCENT
    )

    windowManager.addView(view, params)
    overlayView = view
  }

  override fun onDestroy() {
    Log.d("OverlayService", "onDestroy: overlay view being removed")
    super.onDestroy()
    // Clean up
    overlayView?.let { windowManager.removeView(it) }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  companion object {
    const val ACTION_SHOW = "com.main.OVERLAY_SHOW"
    const val ACTION_HIDE = "com.main.OVERLAY_HIDE"
  }
}
