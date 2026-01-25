package com.ndomog.inventory.data.repository

import com.ndomog.inventory.data.local.ActivityLogDao
import com.ndomog.inventory.data.local.ItemDao
import com.ndomog.inventory.data.local.PendingActionDao
import com.ndomog.inventory.data.local.ProfileDao
import com.ndomog.inventory.data.models.ActionType
import com.ndomog.inventory.data.models.ActivityLog
import com.ndomog.inventory.data.models.Item
import com.ndomog.inventory.data.models.PendingAction
import com.ndomog.inventory.data.models.Profile
import com.ndomog.inventory.data.remote.SupabaseClient
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.coroutines.flow.Flow
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import timber.log.Timber
import java.util.UUID

@Serializable
data class NotificationInsert(
    val id: String,
    val user_id: String,
    val action_user_id: String,
    val action: String,
    val item_name: String,
    val details: String?,
    val is_read: Boolean = false
)

class ItemRepository(
    private val itemDao: ItemDao,
    private val pendingActionDao: PendingActionDao,
    private val activityLogDao: ActivityLogDao,
    private val profileDao: ProfileDao,
    private val authRepository: AuthRepository
) {
    private val supabase = SupabaseClient.client

    // Observe all items from local database
    fun observeItems(): Flow<List<Item>> = itemDao.getAllItems()

    // Load items - tries online first, falls back to cache
    suspend fun loadItems(isOnline: Boolean): Result<Pair<List<Item>, Boolean>> {
        return try {
            if (isOnline) {
                // Fetch from Supabase
                val items = supabase.from("items")
                    .select {
                        filter {
                            eq("is_deleted", false)
                        }
                    }
                    .decodeList<Item>()

                // Cache locally
                itemDao.insertItems(items)
                Result.success(Pair(items, false))
            } else {
                // Load from cache
                val cachedItems = itemDao.getItems()
                Result.success(Pair(cachedItems, true))
            }
        } catch (e: Exception) {
            Timber.e(e, "Error loading items, falling back to cache")
            val cachedItems = itemDao.getItems()
            Result.success(Pair(cachedItems, true))
        }
    }

    // Get single item
    suspend fun getItem(id: String): Item? = itemDao.getItemById(id)

    // Add item - queues for sync if offline
    suspend fun addItem(item: Item, isOnline: Boolean) {
        // Save locally first
        itemDao.insertItem(item)

        if (isOnline) {
            try {
                // Sync to Supabase immediately
                supabase.from("items").insert(item)
                logActivity("CREATE", item.id, item.name, "Added new item: ${item.name}")
                sendNotificationsToOtherUsers("added", item.name, "Added new item to inventory")
            } catch (e: Exception) {
                Timber.e(e, "Failed to sync item online, queuing for later")
                queueAction(ActionType.ADD_ITEM, item.id, Json.encodeToString(item))
            }
        } else {
            // Queue for sync when back online
            queueAction(ActionType.ADD_ITEM, item.id, Json.encodeToString(item))
        }
    }

    // Update item
    suspend fun updateItem(item: Item, isOnline: Boolean) {
        itemDao.updateItem(item)

        if (isOnline) {
            try {
                supabase.from("items").update(item) {
                    filter {
                        eq("id", item.id)
                    }
                }
                logActivity("UPDATE", item.id, item.name, "Updated item: ${item.name}")
                sendNotificationsToOtherUsers("updated", item.name, "Updated item details")
            } catch (e: Exception) {
                Timber.e(e, "Failed to update item online, queuing for later")
                queueAction(ActionType.UPDATE_ITEM, item.id, Json.encodeToString(item))
            }
        } else {
            queueAction(ActionType.UPDATE_ITEM, item.id, Json.encodeToString(item))
        }
    }

    // Update quantity
    suspend fun updateQuantity(id: String, quantity: Int, isOnline: Boolean) {
        val oldItem = itemDao.getItemById(id)
        val oldQuantity = oldItem?.quantity ?: 0
        itemDao.updateQuantity(id, quantity)

        if (isOnline) {
            try {
                supabase.from("items").update(mapOf("quantity" to quantity)) {
                    filter {
                        eq("id", id)
                    }
                }
                // Get item name for logging
                val item = itemDao.getItemById(id)
                val changeText = if (quantity > oldQuantity) "Added ${quantity - oldQuantity} units" else "Removed ${oldQuantity - quantity} units"
                logActivity("UPDATE_QUANTITY", id, item?.name ?: "Unknown", changeText)
                sendNotificationsToOtherUsers(
                    if (quantity > oldQuantity) "added" else "removed",
                    item?.name ?: "Unknown",
                    "Quantity changed from $oldQuantity to $quantity"
                )
            } catch (e: Exception) {
                Timber.e(e, "Failed to update quantity online, queuing for later")
                queueAction(ActionType.UPDATE_QUANTITY, id, Json.encodeToString(mapOf("quantity" to quantity)))
            }
        } else {
            queueAction(ActionType.UPDATE_QUANTITY, id, Json.encodeToString(mapOf("quantity" to quantity)))
        }
    }

    // Soft delete item
    suspend fun deleteItem(id: String, userId: String, isOnline: Boolean) {
        val now = java.time.Instant.now().toString()
        val item = itemDao.getItemById(id)
        itemDao.softDelete(id, now, userId)

        if (isOnline) {
            try {
                supabase.from("items").update(
                    mapOf(
                        "is_deleted" to true,
                        "deleted_at" to now,
                        "deleted_by" to userId
                    )
                ) {
                    filter {
                        eq("id", id)
                    }
                }
                logActivity("DELETE", id, item?.name ?: "Unknown", "Deleted item: ${item?.name ?: "Unknown"}")
                sendNotificationsToOtherUsers("deleted", item?.name ?: "Unknown", "Removed item from inventory")
            } catch (e: Exception) {
                Timber.e(e, "Failed to delete item online, queuing for later")
                queueAction(ActionType.DELETE_ITEM, id, Json.encodeToString(mapOf("deleted_at" to now, "deleted_by" to userId)))
            }
        } else {
            queueAction(ActionType.DELETE_ITEM, id, Json.encodeToString(mapOf("deleted_at" to now, "deleted_by" to userId)))
        }
    }

    private suspend fun logActivity(action: String, itemId: String, itemName: String?, details: String?) {
        try {
            val currentUser = authRepository.getCurrentUser()
            if (currentUser != null) {
                // Get username from profile cache or fetch
                var username = currentUser.email ?: "Unknown"
                try {
                    val profile = profileDao.getProfileById(currentUser.id)
                    if (profile != null && !profile.username.isNullOrEmpty()) {
                        username = profile.username
                    }
                } catch (e: Exception) {
                    Timber.e(e, "Failed to fetch username, using email")
                }

                val activityLog = ActivityLog(
                    id = UUID.randomUUID().toString(),
                    userId = currentUser.id,
                    username = username,
                    action = action,
                    entityType = "item",
                    entityId = itemId,
                    entityName = itemName ?: "Unknown",
                    timestamp = System.currentTimeMillis(),
                    details = details
                )

                // Save locally
                activityLogDao.insertActivityLog(activityLog)

                // Try to sync to Supabase
                try {
                    supabase.from("activity_logs").insert(activityLog)
                } catch (e: Exception) {
                    Timber.e(e, "Failed to sync activity log online")
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "Failed to log activity")
        }
    }

    private suspend fun sendNotificationsToOtherUsers(action: String, itemName: String, details: String) {
        try {
            val currentUser = authRepository.getCurrentUser() ?: return
            val currentUserId = currentUser.id
            
            // Get all other users from profiles table
            val allProfiles = supabase.from("profiles")
                .select()
                .decodeList<Profile>()
            
            val otherUserIds = allProfiles
                .filter { it.id != currentUserId }
                .map { it.id }
            
            if (otherUserIds.isEmpty()) {
                Timber.d("No other users to notify")
                return
            }
            
            // Create notifications for each user
            val notifications = otherUserIds.map { userId ->
                NotificationInsert(
                    id = UUID.randomUUID().toString(),
                    user_id = userId,
                    action_user_id = currentUserId,
                    action = action,
                    item_name = itemName,
                    details = details,
                    is_read = false
                )
            }
            
            // Insert all notifications
            supabase.from("notifications").insert(notifications)
            Timber.d("Sent notifications to ${notifications.size} users")
        } catch (e: Exception) {
            Timber.e(e, "Failed to send notifications to other users")
        }
    }

    private suspend fun queueAction(type: ActionType, entityId: String, data: String) {
        pendingActionDao.insertAction(
            PendingAction(
                type = type,
                entityId = entityId,
                data = data
            )
        )
    }
}
