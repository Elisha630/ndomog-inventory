package com.ndomog.inventory

import com.ndomog.inventory.data.local.MIGRATION_1_2 // Added import
import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import androidx.room.Room
import com.ndomog.inventory.data.local.NdomogDatabase
import com.ndomog.inventory.data.repository.AuthRepository
import timber.log.Timber

class NdomogApplication : Application() {

    companion object {
        const val NOTIFICATION_CHANNEL_ID = "ndomog_inventory_channel"
        const val NOTIFICATION_CHANNEL_NAME = "Inventory Updates"
    }

// Database instance
    val database: NdomogDatabase by lazy {
        Room.databaseBuilder(
            applicationContext,
            NdomogDatabase::class.java,
            "ndomog_inventory.db"
        ).addMigrations(MIGRATION_1_2) // Added migration
            .build()
    }

    // AuthRepository instance
    val authRepository: AuthRepository by lazy {
        AuthRepository()
    }

    override fun onCreate() {
        super.onCreate()

        // Initialize Timber for logging
        if (BuildConfig.DEBUG) {
            Timber.plant(Timber.DebugTree())
        }

        // Create notification channel
        createNotificationChannel()

        Timber.d("Ndomog Application initialized")
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                NOTIFICATION_CHANNEL_NAME,
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Notifications for inventory updates and sync status"
            }

            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }
}
