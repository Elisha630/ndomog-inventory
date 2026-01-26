package com.ndomog.inventory.data.remote

import android.content.Context
import com.ndomog.inventory.BuildConfig
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.gotrue.Auth
import io.github.jan.supabase.gotrue.FlowType
import io.github.jan.supabase.gotrue.SessionManager
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.realtime.Realtime
import io.github.jan.supabase.storage.Storage

import kotlin.time.Duration.Companion.seconds

object SupabaseClient {
    lateinit var client: io.github.jan.supabase.SupabaseClient
        private set

    fun initialize(context: Context) {
        if (!::client.isInitialized) {
            client = createSupabaseClient(
                supabaseUrl = BuildConfig.SUPABASE_URL,
                supabaseKey = BuildConfig.SUPABASE_KEY
            ) {
                install(Auth) {
                    flowType = FlowType.PKCE
                    scheme = "com.ndomog.app"
                    host = "callback"
                    // Enable session auto-refresh and persistence
                    alwaysAutoRefresh = true
                    autoLoadFromStorage = true
                    autoSaveToStorage = true
                }
                install(Postgrest)
                install(Realtime)
                install(Storage) {
                    transferTimeout = 90.seconds
                }
            }
        }
    }
}
