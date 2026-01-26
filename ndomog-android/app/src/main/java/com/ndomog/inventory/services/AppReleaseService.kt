package com.ndomog.inventory.services

import com.ndomog.inventory.data.remote.SupabaseClient
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import timber.log.Timber

/**
 * Service for checking and managing app updates
 */
class AppReleaseService(private val coroutineScope: CoroutineScope) {
    private val supabase = SupabaseClient.client

    // Current app version - should match versionCode in build.gradle
    companion object {
        const val CURRENT_VERSION = "1.0.0"
        const val CURRENT_VERSION_CODE = 1
    }

    /**
     * Check if a new version is available
     * 
     * @param onUpdateAvailable Called when a new version is found
     * @param onError Called if an error occurs
     */
    fun checkForUpdates(
        onUpdateAvailable: (AppRelease) -> Unit,
        onError: (String) -> Unit
    ) {
        coroutineScope.launch {
            try {
                // Query the latest release from database
                val releases = supabase.from("app_releases")
                    .select()
                    .decodeList<AppRelease>()

                if (releases.isEmpty()) {
                    onError("No releases found")
                    return@launch
                }

                val latestRelease = releases.maxByOrNull { it.versionCode } ?: return@launch

                // Check if newer version exists
                if (isVersionNewer(latestRelease.versionCode, CURRENT_VERSION_CODE)) {
                    onUpdateAvailable(latestRelease)
                }
            } catch (e: Exception) {
                Timber.e(e, "Failed to check for updates")
                onError(e.message ?: "Failed to check for updates")
            }
        }
    }

    /**
     * Get all available releases
     */
    suspend fun getAllReleases(): Result<List<AppRelease>> {
        return try {
            val releases = supabase.from("app_releases")
                .select()
                .decodeList<AppRelease>()
                .sortedByDescending { it.versionCode }
            Result.success(releases)
        } catch (e: Exception) {
            Timber.e(e, "Failed to fetch releases")
            Result.failure(e)
        }
    }

    /**
     * Compare version codes to determine if newer version exists
     */
    private fun isVersionNewer(latestVersionCode: Int, currentVersionCode: Int): Boolean {
        return latestVersionCode > currentVersionCode
    }

    /**
     * Parse semantic version string (e.g., "1.2.3") to version code
     * Used for string-based comparisons if needed
     */
    private fun parseVersionString(version: String): Int? {
        return try {
            val parts = version.split(".")
            if (parts.size >= 3) {
                val major = parts[0].toInt()
                val minor = parts[1].toInt()
                val patch = parts[2].toInt()
                (major * 10000) + (minor * 100) + patch
            } else {
                null
            }
        } catch (e: Exception) {
            null
        }
    }
}

/**
 * Data class for app releases from database
 */
@Serializable
data class AppRelease(
    val id: String = "",
    val version: String,
    @SerialName("version_code")
    val versionCode: Int,
    @SerialName("release_notes")
    val releaseNotes: String? = null,
    @SerialName("download_url")
    val downloadUrl: String? = null,
    @SerialName("is_critical")
    val isCritical: Boolean = false,
    @SerialName("release_date")
    val releaseDate: String? = null,
    @SerialName("created_at")
    val createdAt: String? = null,
    @SerialName("updated_at")
    val updatedAt: String? = null
)
