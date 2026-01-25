package com.ndomog.inventory.presentation.notifications

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ndomog.inventory.data.local.NdomogDatabase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.*

class NotificationsViewModel(
    private val database: NdomogDatabase
) : ViewModel() {

    private val _notifications = MutableStateFlow<List<Notification>>(emptyList())
    val notifications: StateFlow<List<Notification>> = _notifications.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _unreadCount = MutableStateFlow(0)
    val unreadCount: StateFlow<Int> = _unreadCount.asStateFlow()

    init {
        loadNotifications()
    }

    private fun loadNotifications() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                // TODO: Fetch from Supabase notifications table when online
                // For now, using placeholder data to show UI works
                val mockNotifications = listOf(
                    Notification(
                        id = "1",
                        userId = "user1",
                        actionUserEmail = "admin@ndomog.com",
                        action = "added",
                        itemName = "Denso 096140-0030",
                        details = "Added 5 units to inventory",
                        isRead = false,
                        createdAt = Date(),
                        username = "Admin"
                    ),
                    Notification(
                        id = "2",
                        userId = "user1",
                        actionUserEmail = "admin@ndomog.com",
                        action = "updated",
                        itemName = "Element 3050",
                        details = "Quantity changed from 3 to 5",
                        isRead = false,
                        createdAt = Date(System.currentTimeMillis() - 1800000),
                        username = "Admin"
                    ),
                    Notification(
                        id = "3",
                        userId = "user1",
                        actionUserEmail = "admin@ndomog.com",
                        action = "removed",
                        itemName = "Valve Assembly",
                        details = "Removed 2 units from stock",
                        isRead = true,
                        createdAt = Date(System.currentTimeMillis() - 86400000),
                        username = "Admin"
                    )
                )
                _notifications.value = mockNotifications
                _unreadCount.value = mockNotifications.count { !it.isRead }
            } catch (e: Exception) {
                // Handle error
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun markAllAsRead() {
        viewModelScope.launch {
            _notifications.value = _notifications.value.map { it.copy(isRead = true) }
            _unreadCount.value = 0
            // TODO: Update in Supabase
        }
    }

    fun deleteNotification(notificationId: String) {
        viewModelScope.launch {
            val notification = _notifications.value.find { it.id == notificationId }
            _notifications.value = _notifications.value.filter { it.id != notificationId }
            if (notification != null && !notification.isRead) {
                _unreadCount.value = (_unreadCount.value - 1).coerceAtLeast(0)
            }
            // TODO: Delete from Supabase
        }
    }

    fun clearAllNotifications() {
        viewModelScope.launch {
            _notifications.value = emptyList()
            _unreadCount.value = 0
            // TODO: Delete all from Supabase
        }
    }
}
