package com.ndomog.inventory.presentation.activity

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ndomog.inventory.data.local.NdomogDatabase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.*

class ActivityViewModel(
    private val database: NdomogDatabase
) : ViewModel() {

    private val _activityLogs = MutableStateFlow<List<ActivityLog>>(emptyList())
    val activityLogs: StateFlow<List<ActivityLog>> = _activityLogs.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    init {
        loadActivityLogs()
    }

    private fun loadActivityLogs() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                // TODO: Fetch from Supabase activity_logs table when online
                // For now, using placeholder data to show UI works
                _activityLogs.value = listOf(
                    ActivityLog(
                        id = "1",
                        userId = "user1",
                        userEmail = "admin@ndomog.com",
                        action = "added",
                        itemName = "Denso 096140-0030",
                        details = "Added 5 units",
                        createdAt = Date(),
                        username = "Admin"
                    ),
                    ActivityLog(
                        id = "2",
                        userId = "user1",
                        userEmail = "admin@ndomog.com",
                        action = "updated",
                        itemName = "Element 3050",
                        details = "Quantity changed from 3 to 5",
                        createdAt = Date(System.currentTimeMillis() - 3600000),
                        username = "Admin"
                    ),
                    ActivityLog(
                        id = "3",
                        userId = "user1",
                        userEmail = "admin@ndomog.com",
                        action = "removed",
                        itemName = "Valve Assembly",
                        details = "Removed 2 units",
                        createdAt = Date(System.currentTimeMillis() - 7200000),
                        username = "Admin"
                    )
                )
            } catch (e: Exception) {
                // Handle error
            } finally {
                _isLoading.value = false
            }
        }
    }
}
