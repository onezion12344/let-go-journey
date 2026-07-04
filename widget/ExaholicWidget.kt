package com.onezion.exaholicwidget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.widget.RemoteViews
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class ExaholicWidget : AppWidgetProvider() {

    companion object {
        private const val WIDGET_URL = "https://exaholic.onezion.top/api/widget/public"
        private const val PREFS_NAME = "exaholic_widget_prefs"
        private const val KEY_USER_ID = "user_id_"
        private val executor = Executors.newSingleThreadExecutor()
        private val mainHandler = Handler(Looper.getMainLooper())
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        // Handle configure activity result: save user_id
        if (intent.action == "com.onezion.exaholicwidget.SET_USER_ID") {
            val appWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
            val userId = intent.getStringExtra("user_id") ?: ""
            if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                prefs.edit().putString(KEY_USER_ID + appWidgetId, userId).apply()
            }
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateWidgetAsync(context, appWidgetManager, appWidgetId)
        }
    }

    private fun updateWidgetAsync(context: Context, manager: AppWidgetManager, widgetId: Int) {
        // Show loading state
        val views = RemoteViews(context.packageName, R.layout.widget_layout)
        views.setTextViewText(R.id.widget_affirmation, "載入中...")
        views.setProgressBar(R.id.widget_progress, 100, 0, false)
        manager.updateAppWidget(widgetId, views)

        // Fetch data in background
        executor.execute {
            try {
                val data = fetchWidgetData(context, widgetId)
                // Update UI on main thread
                mainHandler.post {
                    updateWidgetUI(context, manager, widgetId, data)
                }
            } catch (e: Exception) {
                mainHandler.post {
                    val views = RemoteViews(context.packageName, R.layout.widget_layout)
                    views.setTextViewText(R.id.widget_affirmation, "點擊打開遊戲")
                    views.setProgressBar(R.id.widget_progress, 100, 0, false)
                    manager.updateAppWidget(widgetId, views)
                }
            }
        }
    }

    private fun fetchWidgetData(context: Context, widgetId: Int): JSONObject {
        // Read saved user_id for this widget instance
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val userId = prefs.getString(KEY_USER_ID + widgetId, "")
        val urlStr = if (userId.isNotEmpty()) {
            "$WIDGET_URL?user=$userId"
        } else {
            WIDGET_URL
        }
        val url = URL(urlStr)
        val conn = url.openConnection() as HttpURLConnection
        conn.connectTimeout = 10000
        conn.readTimeout = 10000
        conn.requestMethod = "GET"
        val text = conn.inputStream.bufferedReader().readText()
        return JSONObject(text)
    }

    private fun updateWidgetUI(
        context: Context,
        manager: AppWidgetManager,
        widgetId: Int,
        data: JSONObject
    ) {
        val views = RemoteViews(context.packageName, R.layout.widget_layout)

        val day = data.optInt("day", 1)
        val phaseName = data.optString("phase_name", "")
        val phaseIcon = data.optString("phase_icon", "")
        val progress = data.optString("progress", "0/30")
        val progressPct = data.optInt("progress_pct", 0)
        val title = data.optString("title", "")
        val affirmation = data.optString("affirmation", "")
        val badge = data.optString("badge", "")

        views.setTextViewText(R.id.widget_title, "\uD83D\uDD4A\uFE0F 放手之旅")
        views.setTextViewText(R.id.widget_day, "第 $day 天 · $progress")
        views.setTextViewText(R.id.widget_phase, "$phaseIcon $phaseName")
        views.setTextViewText(R.id.widget_affirmation, title.ifEmpty { affirmation })
        views.setTextViewText(R.id.widget_badge, badge)
        views.setProgressBar(R.id.widget_progress, 100, progressPct, false)

        // Open browser on tap
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://exaholic.onezion.top/"))
        val pending = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        views.setOnClickPendingIntent(R.id.widget_title, pending)
        views.setOnClickPendingIntent(R.id.widget_affirmation, pending)

        manager.updateAppWidget(widgetId, views)
    }
}
