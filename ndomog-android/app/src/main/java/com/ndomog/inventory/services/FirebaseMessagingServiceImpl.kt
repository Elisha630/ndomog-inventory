package com.ndomog.inventory.services

import android.app.PendingIntent
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.ndomog.inventory.MainActivity
import com.ndomog.inventory.NdomogApplication
import com.ndomog.inventory.R
import com.ndomog.inventory.data.remote.SupabaseClient
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.gotrue.auth
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import timber.log.Timber

class FirebaseMessagingServiceImpl : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Timber.d("FCM token updated")
        SupabaseClient.initialize(applicationContext)
        val user = SupabaseClient.client.auth.currentUserOrNull()
        if (user == null) {
            savePendingToken(token)
            return
        }
        registerToken(user.id, token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        val title = message.notification?.title ?: message.data["title"] ?: "Inventory Update"
        val body = message.notification?.body ?: message.data["body"] ?: "You have a new notification"
        showSystemNotification(title, body)
    }

    private fun showSystemNotification(title: String, body: String) {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, NdomogApplication.NOTIFICATION_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        NotificationManagerCompat.from(this).notify(title.hashCode(), notification)
    }

    private fun registerToken(userId: String, token: String) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                SupabaseClient.client.from("push_subscriptions").upsert(
                    listOf(mapOf("user_id" to userId, "token" to token, "platform" to "android"))
                )
                clearPendingToken()
            } catch (e: Exception) {
                Timber.e(e, "Failed to register FCM token")
                savePendingToken(token)
            }
        }
    }

    private fun savePendingToken(token: String) {
        val prefs = getSharedPreferences("ndomog_prefs", MODE_PRIVATE)
        prefs.edit().putString("pending_fcm_token", token).apply()
    }

    private fun clearPendingToken() {
        val prefs = getSharedPreferences("ndomog_prefs", MODE_PRIVATE)
        prefs.edit().remove("pending_fcm_token").apply()
    }
}
