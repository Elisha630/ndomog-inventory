package com.ndomog.inventory.presentation.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ndomog.inventory.data.repository.AuthRepository
import com.ndomog.inventory.data.local.ProfileDao
import com.ndomog.inventory.data.models.Profile
import com.ndomog.inventory.data.remote.SupabaseClient
import com.ndomog.inventory.services.AppRelease
import com.ndomog.inventory.services.AppReleaseService
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.storage.storage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import timber.log.Timber

@Serializable
data class UserRole(
    val id: String = "",
    val user_id: String,
    val role: String
)

class ProfileViewModel(
    private val authRepository: AuthRepository,
    private val profileDao: ProfileDao
) : ViewModel() {

    private val avatarBucket = "avatars"
    private val usernameRegex = Regex("^[a-z0-9_-]{3,20}$")

    private fun normalizeUsername(input: String): String {
        return input.trim().removePrefix("@").lowercase()
    }

    private val _userEmail = MutableStateFlow<String?>(null)
    val userEmail: StateFlow<String?> = _userEmail.asStateFlow()

    private val _username = MutableStateFlow<String?>(null)
    val username: StateFlow<String?> = _username.asStateFlow()

    private val _avatarUrl = MutableStateFlow<String?>(null)
    val avatarUrl: StateFlow<String?> = _avatarUrl.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()
    
    private val _successMessage = MutableStateFlow<String?>(null)
    val successMessage: StateFlow<String?> = _successMessage.asStateFlow()
    
    private val _isAdmin = MutableStateFlow(false)
    val isAdmin: StateFlow<Boolean> = _isAdmin.asStateFlow()
    
    private val _isLoggedOut = MutableStateFlow(false)
    val isLoggedOut: StateFlow<Boolean> = _isLoggedOut.asStateFlow()

    private val _updateAvailable = MutableStateFlow(false)
    val updateAvailable: StateFlow<Boolean> = _updateAvailable.asStateFlow()

    private val _latestRelease = MutableStateFlow<AppRelease?>(null)
    val latestRelease: StateFlow<AppRelease?> = _latestRelease.asStateFlow()

    private val _updateError = MutableStateFlow<String?>(null)
    val updateError: StateFlow<String?> = _updateError.asStateFlow()

    private val appReleaseService = AppReleaseService(viewModelScope)

    init {
        loadUserProfile()
    }

    private fun formatRemoteError(e: Exception, fallback: String): String {
        val raw = e.message ?: fallback
        if (raw.contains("row-level security", ignoreCase = true)) {
            return "Permission denied. Check Supabase RLS policies for this table/bucket."
        }
        if (raw.contains("Unauthorized", ignoreCase = true) || raw.contains("JWT", ignoreCase = true)) {
            return "Authentication error. Please log in again."
        }
        if (raw.contains("bucket", ignoreCase = true) && raw.contains("not found", ignoreCase = true)) {
            return "Storage bucket not found. Ensure the 'avatars' bucket exists."
        }
        if (raw.contains("Headers:", ignoreCase = true)) {
            return raw.substringBefore("Headers:").trim()
        }
        return raw.lineSequence().firstOrNull()?.trim().orEmpty().ifEmpty { fallback }
    }

    private fun loadUserProfile() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                val currentUser = authRepository.getCurrentUser()
                val email = currentUser?.email ?: authRepository.getEmailFromSession()
                _userEmail.value = email
                currentUser?.id?.let { userId ->
                    // Try to load from local DB first
                    var profile = profileDao.getProfileById(userId)
                    if (profile != null) {
                        _username.value = profile.username
                        _avatarUrl.value = profile.avatarUrl
                    }

                    // Then fetch from remote (Supabase)
                    try {
                        val profiles = SupabaseClient.client.from("profiles").select {
                            filter {
                                eq("id", userId)
                            }
                        }.decodeList<Profile>()
                        
                        if (profiles.isNotEmpty()) {
                            val remoteProfile = profiles[0]
                            // Update values from remote
                            _username.value = remoteProfile.username
                            _avatarUrl.value = remoteProfile.avatarUrl
                            _userEmail.value = remoteProfile.email.ifEmpty { _userEmail.value }
                            // Cache the latest
                            profileDao.insertProfile(remoteProfile)
                        } else {
                            // Profile may not exist yet - ensure it exists with upsert
                            ensureProfileExists(userId, email ?: "")
                        }
                        
                        // Check if user is admin
                        checkAdminStatus(userId)
                    } catch (e: Exception) {
                        Timber.e(e, "Failed to load remote profile")
                        // Continue with locally cached profile if remote fetch fails
                    }
                }
            } catch (e: Exception) {
                Timber.e(e, "Failed to load profile")
                _error.value = e.message ?: "Failed to load profile"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    private suspend fun ensureProfileExists(userId: String, email: String) {
        try {
            val profile = Profile(
                id = userId,
                email = email,
                username = _username.value,
                avatarUrl = _avatarUrl.value
            )
            SupabaseClient.client.from("profiles").upsert(profile)
            // Reload profile after upsert
            val profiles = SupabaseClient.client.from("profiles").select {
                filter { eq("id", userId) }
            }.decodeList<Profile>()
            if (profiles.isNotEmpty()) {
                val p = profiles[0]
                _username.value = p.username
                _avatarUrl.value = p.avatarUrl
                profileDao.insertProfile(p)
            }
        } catch (e: Exception) {
            Timber.e(e, "Failed to ensure profile exists")
        }
    }

    private suspend fun checkAdminStatus(userId: String) {
        try {
            // Check user_roles table for admin role using proper deserialization
            val roles = SupabaseClient.client.from("user_roles").select {
                filter {
                    eq("user_id", userId)
                }
            }.decodeList<UserRole>()
            
            _isAdmin.value = roles.any { it.role == "admin" }
            Timber.d("Admin status for user $userId: ${_isAdmin.value}, roles found: ${roles.size}")
        } catch (e: Exception) {
            Timber.e(e, "Failed to check admin status: ${e.message}")
            _isAdmin.value = false
        }
    }

    fun updateUsername(newUsername: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                val normalized = normalizeUsername(newUsername)
                if (normalized.isBlank()) {
                    _error.value = "Username cannot be empty"
                    return@launch
                }
                if (!usernameRegex.matches(normalized)) {
                    _error.value = "Use 3-20 chars: a-z, 0-9, _ or -"
                    return@launch
                }
                val currentUser = authRepository.getCurrentUser()
                val userId = currentUser?.id ?: return@launch
                val email = _userEmail.value ?: currentUser.email ?: ""
                val updateResult = authRepository.updateProfileUsername(userId, normalized, email)
                if (updateResult.isSuccess) {
                    val updated = updateResult.getOrNull()
                    if (updated != null) {
                        _username.value = normalized
                        profileDao.insertProfile(updated)
                    }
                    _successMessage.value = "Username updated successfully"
                } else {
                    _error.value = updateResult.exceptionOrNull()?.message ?: "Username was not saved. Check database permissions."
                }
            } catch (e: Exception) {
                Timber.e(e, "Failed to update username")
                _error.value = formatRemoteError(e, "Failed to update username")
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun updateAvatarBytes(bytes: ByteArray, extension: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                val currentUser = authRepository.getCurrentUser()
                currentUser?.id?.let { userId ->
                    val safeExt = extension.ifBlank { "jpg" }
                    val path = "users/$userId/avatar.$safeExt"

                    SupabaseClient.client.storage
                        .from(avatarBucket)
                        .upload(path, bytes, upsert = true)

                    val publicUrl = SupabaseClient.client.storage
                        .from(avatarBucket)
                        .authenticatedUrl(path)

                    SupabaseClient.client.from("profiles")
                        .update(mapOf("avatar_url" to publicUrl)) {
                            filter {
                                eq("id", userId)
                            }
                        }

                    _avatarUrl.value = publicUrl
                    profileDao.insertProfile(
                        Profile(
                            id = userId,
                            email = _userEmail.value ?: "",
                            username = _username.value,
                            avatarUrl = publicUrl
                        )
                    )
                    _successMessage.value = "Avatar updated successfully"
                }
            } catch (e: Exception) {
                Timber.e(e, "Failed to update avatar")
                _error.value = formatRemoteError(e, "Failed to update avatar")
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun removeAvatar() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                val currentUser = authRepository.getCurrentUser()
                currentUser?.id?.let { userId ->
                    // Best-effort delete of old avatar if url matches our bucket
                    val currentUrl = _avatarUrl.value
                    if (!currentUrl.isNullOrBlank()) {
                        val marker = "/storage/v1/object/public/$avatarBucket/"
                        val idx = currentUrl.indexOf(marker)
                        if (idx >= 0) {
                            val path = currentUrl.substring(idx + marker.length)
                            SupabaseClient.client.storage.from(avatarBucket).delete(path)
                        }
                    }

                    SupabaseClient.client.from("profiles")
                        .update(mapOf("avatar_url" to "")) {
                            filter { eq("id", userId) }
                        }
                    _avatarUrl.value = ""
                    profileDao.insertProfile(Profile(id = userId, email = _userEmail.value ?: "", username = _username.value, avatarUrl = ""))
                    _successMessage.value = "Avatar removed"
                }
            } catch (e: Exception) {
                Timber.e(e, "Failed to remove avatar")
                _error.value = formatRemoteError(e, "Failed to remove avatar")
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun updatePassword(oldPassword: String, newPassword: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            _successMessage.value = null
            try {
                // First, verify old password by attempting to re-authenticate
                val currentUser = authRepository.getCurrentUser()
                val email = currentUser?.email ?: return@launch

                // Try to sign in with old password to verify
                val verifyResult = authRepository.signIn(email, oldPassword)

                if (verifyResult.isSuccess) {
                    // Old password is correct, send password reset email
                    // Supabase Kotlin SDK doesn't support direct password change
                    val resetResult = authRepository.sendPasswordResetEmail(email)

                    if (resetResult.isSuccess) {
                        _successMessage.value = "Password reset email sent. Please check your inbox."
                    } else {
                        _error.value = resetResult.exceptionOrNull()?.message ?: "Failed to send reset email"
                    }
                } else {
                    _error.value = "Current password is incorrect"
                }
            } catch (e: Exception) {
                Timber.e(e, "Failed to update password")
                _error.value = e.message ?: "Failed to update password"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val result = authRepository.signOut()
                if (result.isSuccess) {
                    _isLoggedOut.value = true
                } else {
                    _error.value = result.exceptionOrNull()?.message ?: "Failed to log out"
                }
            } catch (e: Exception) {
                Timber.e(e, "Failed to log out")
                _error.value = e.message ?: "Failed to log out"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun checkForUpdates() {
        _error.value = null
        _updateError.value = null
        appReleaseService.checkForUpdates(
            onUpdateAvailable = { release ->
                _updateAvailable.value = true
                _latestRelease.value = release
                _updateError.value = null
                _successMessage.value = "New version ${release.version} available!"
            },
            onUpToDate = {
                _updateAvailable.value = false
                _updateError.value = null
            },
            onError = { errorMessage ->
                _updateAvailable.value = false
                _updateError.value = errorMessage
            }
        )
    }
    
    fun clearUpdateError() {
        _updateError.value = null
    }
    
    fun clearMessages() {
        _error.value = null
        _successMessage.value = null
    }
}
