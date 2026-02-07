package com.ndomog.inventory.presentation.notifications

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ndomog.inventory.data.models.Profile
import com.ndomog.inventory.data.remote.SupabaseClient
import com.ndomog.inventory.data.repository.AuthRepository
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.time.Instant
import java.util.Date

class NotificationsViewModel(
    private val authRepository: AuthRepository
) : ViewModel() {
    private val supabase = SupabaseClient.client

    private val _notifications = MutableStateFlow<List<Notification>>(emptyList())
    val notifications: StateFlow<List<Notification>> = _notifications.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _unreadCount = MutableStateFlow(0)
    val unreadCount: StateFlow<Int> = _unreadCount.asStateFlow()

    init {
        observeNotifications()
    }

    private fun observeNotifications() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val currentUser = authRepository.getCurrentUser()
                if (currentUser == null) {
                    _notifications.value = emptyList()
                    _unreadCount.value = 0
                    _isLoading.value = false
                    return@launch
                }

                var firstLoad = true
                while (isActive) {
                    val profiles = fetchProfiles()
                    val profileById = profiles.associateBy { it.id }
                    val rows = supabase.from("notifications")
                        .select {
                            filter {
                                eq("user_id", currentUser.id)
                            }
                        }
                        .decodeList<NotificationRow>()

                    val items = rows
                        .sortedByDescending { it.createdAt ?: "" }
                        .map { row ->
                            val profile = row.actionUserId?.let { profileById[it] }
                            val email = row.actionUserEmail
                                ?: profile?.email
                                ?: "unknown@local"
                            Notification(
                                id = row.id,
                                userId = row.userId,
                                actionUserEmail = email,
                                action = row.action,
                                itemName = row.itemName,
                                details = row.details,
                                isRead = row.isRead,
                                createdAt = parseDate(row.createdAt),
                                username = profile?.username,
                                avatarUrl = profile?.avatarUrl
                            )
                        }

                    _notifications.value = items
                    _unreadCount.value = items.count { !it.isRead }
                    if (firstLoad) {
                        _isLoading.value = false
                        firstLoad = false
                    }

                    delay(10_000)
                }
            } catch (e: Exception) {
                // Handle error
                _isLoading.value = false
            }
        }
    }

    fun markAllAsRead() {
        viewModelScope.launch {
            val currentUser = authRepository.getCurrentUser() ?: return@launch
            supabase.from("notifications").update(
                mapOf("is_read" to true)
            ) {
                filter {
                    eq("user_id", currentUser.id)
                    eq("is_read", false)
                }
            }
            _notifications.value = _notifications.value.map { it.copy(isRead = true) }
            _unreadCount.value = 0
        }
    }

    fun deleteNotification(notificationId: String) {
        viewModelScope.launch {
            supabase.from("notifications").delete {
                filter {
                    eq("id", notificationId)
                }
            }
            val notification = _notifications.value.find { it.id == notificationId }
            _notifications.value = _notifications.value.filter { it.id != notificationId }
            if (notification != null && !notification.isRead) {
                _unreadCount.value = (_unreadCount.value - 1).coerceAtLeast(0)
            }
        }
    }

    fun clearAllNotifications() {
        viewModelScope.launch {
            val currentUser = authRepository.getCurrentUser() ?: return@launch
            supabase.from("notifications").delete {
                filter {
                    eq("user_id", currentUser.id)
                }
            }
            _notifications.value = emptyList()
            _unreadCount.value = 0
        }
    }

    private suspend fun fetchProfiles(): List<Profile> {
        return try {
            supabase.from("profiles")
                .select()
                .decodeList<Profile>()
        } catch (e: Exception) {
            emptyList()
        }
    }

    private fun parseDate(value: String?): Date {
        if (value.isNullOrBlank()) return Date()
        return runCatching { Date.from(Instant.parse(value)) }.getOrElse { Date() }
    }
}

@Serializable
data class NotificationRow(
    val id: String,
    @SerialName("user_id")
    val userId: String? = null,
    @SerialName("action_user_id")
    val actionUserId: String? = null,
    @SerialName("action_user_email")
    val actionUserEmail: String? = null,
    val action: String,
    @SerialName("item_name")
    val itemName: String,
    val details: String? = null,
    @SerialName("is_read")
    val isRead: Boolean = false,
    @SerialName("created_at")
    val createdAt: String? = null
)
