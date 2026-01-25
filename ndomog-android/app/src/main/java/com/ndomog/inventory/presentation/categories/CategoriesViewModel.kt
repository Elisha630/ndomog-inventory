package com.ndomog.inventory.presentation.categories

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ndomog.inventory.data.local.CategoryDao
import com.ndomog.inventory.data.local.ItemDao
import com.ndomog.inventory.data.models.Category
import com.ndomog.inventory.data.remote.SupabaseClient
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import timber.log.Timber

class CategoriesViewModel(
    private val categoryDao: CategoryDao,
    private val itemDao: ItemDao
) : ViewModel() {

    private val _categories = MutableStateFlow<List<Category>>(emptyList())
    val categories: StateFlow<List<Category>> = _categories.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    init {
        loadCategories()
        viewModelScope.launch {
            categoryDao.getAllCategories().collect {
                _categories.value = it
            }
        }
    }

    fun loadCategories(isOnline: Boolean = true) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                if (isOnline) {
                    val supabaseCategories = SupabaseClient.client.from("categories")
                        .select()
                        .decodeList<Category>()
                    categoryDao.insertCategories(supabaseCategories)
                }
            } catch (e: Exception) {
                _error.value = e.message ?: "Failed to load categories"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun renameCategory(oldName: String, newName: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                // Update items with the new category name
                SupabaseClient.client.from("items")
                    .update(mapOf("category" to newName.uppercase())) {
                        filter {
                            eq("category", oldName)
                        }
                    }

                // Update category in local DB (if exists)
                val existingCategory = categoryDao.getCategories().firstOrNull { it.name == oldName }
                if (existingCategory != null) {
                    val updatedCategory = existingCategory.copy(name = newName.uppercase())
                    categoryDao.insertCategory(updatedCategory)
                }
                
                loadCategories(true) // Refresh from Supabase to get latest
            } catch (e: Exception) {
                Timber.e(e, "Failed to rename category")
                _error.value = e.message ?: "Failed to rename category"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun deleteCategory(categoryName: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                // Delete all items in this category
                SupabaseClient.client.from("items")
                    .delete {
                        filter {
                            eq("category", categoryName)
                        }
                    }

                // Delete the category itself from remote
                SupabaseClient.client.from("categories")
                    .delete {
                        filter {
                            eq("name", categoryName)
                        }
                    }
                
                loadCategories(true) // Refresh from Supabase to get latest
            } catch (e: Exception) {
                Timber.e(e, "Failed to delete category")
                _error.value = e.message ?: "Failed to delete category"
            } finally {
                _isLoading.value = false
            }
        }
    }
}
