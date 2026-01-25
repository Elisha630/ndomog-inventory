package com.ndomog.inventory.di

import com.ndomog.inventory.presentation.auth.AuthViewModel
import com.ndomog.inventory.presentation.profile.ProfileViewModel
import com.ndomog.inventory.presentation.categories.CategoriesViewModel
import com.ndomog.inventory.presentation.activity.ActivityViewModel
import com.ndomog.inventory.presentation.notifications.NotificationsViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.ndomog.inventory.data.repository.AuthRepository
import com.ndomog.inventory.data.local.NdomogDatabase
import com.ndomog.inventory.data.repository.ItemRepository
import com.ndomog.inventory.data.repository.SyncRepository
import com.ndomog.inventory.presentation.dashboard.DashboardViewModel

class ViewModelFactory(
    private val authRepository: AuthRepository,
    private val database: NdomogDatabase
) : ViewModelProvider.Factory {

    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        return when {
            modelClass.isAssignableFrom(AuthViewModel::class.java) -> {
                AuthViewModel(authRepository) as T
            }
            modelClass.isAssignableFrom(DashboardViewModel::class.java) -> {
                val itemRepository = ItemRepository(database.itemDao(), database.pendingActionDao())
                val syncRepository = SyncRepository(database.itemDao(), database.pendingActionDao())
                DashboardViewModel(itemRepository, syncRepository) as T
            }
            modelClass.isAssignableFrom(ProfileViewModel::class.java) -> {
                ProfileViewModel(authRepository, database.profileDao()) as T
            }
            modelClass.isAssignableFrom(CategoriesViewModel::class.java) -> {
                CategoriesViewModel(database.categoryDao(), database.itemDao()) as T
            }
            modelClass.isAssignableFrom(ActivityViewModel::class.java) -> {
                ActivityViewModel(database) as T
            }
            modelClass.isAssignableFrom(NotificationsViewModel::class.java) -> {
                NotificationsViewModel(database) as T
            }
            else -> throw IllegalArgumentException("Unknown ViewModel class: ${modelClass.name}")
        }
    }
}
