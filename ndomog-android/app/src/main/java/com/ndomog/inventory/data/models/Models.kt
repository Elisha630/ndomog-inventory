package com.ndomog.inventory.data.models

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
@Entity(tableName = "items")
data class Item(
    @PrimaryKey
    val id: String = "",
    val name: String,
    val category: String,
    @SerialName("category_id")
    val categoryId: String? = null,
    val details: String? = null,
    @SerialName("photo_url")
    val photoUrl: String? = null,
    @SerialName("buying_price")
    val buyingPrice: Double = 0.0,
    @SerialName("selling_price")
    val sellingPrice: Double = 0.0,
    val quantity: Int = 0,
    @SerialName("low_stock_threshold")
    val lowStockThreshold: Int = 5,
    @SerialName("is_deleted")
    val isDeleted: Boolean = false,
    @SerialName("created_by")
    val createdBy: String? = null,
    @SerialName("created_at")
    val createdAt: String? = null,
    @SerialName("updated_at")
    val updatedAt: String? = null,
    @SerialName("deleted_at")
    val deletedAt: String? = null,
    @SerialName("deleted_by")
    val deletedBy: String? = null
)

@Serializable
@Entity(tableName = "categories")
data class Category(
    @PrimaryKey
    val id: String = "",
    val name: String,
    @SerialName("created_by")
    val createdBy: String? = null,
    @SerialName("created_at")
    val createdAt: String? = null
)

@Serializable
@Entity(tableName = "profiles")
data class Profile(
    @PrimaryKey
    val id: String,
    val email: String,
    val username: String? = null,
    @SerialName("avatar_url")
    val avatarUrl: String? = null
)

@Entity(tableName = "pending_actions")
data class PendingAction(
    @PrimaryKey(autoGenerate = true)
    val id: Int = 0,
    val type: ActionType,
    val entityId: String,
    val data: String, // JSON string of the data
    val timestamp: Long = System.currentTimeMillis(),
    val synced: Boolean = false
)

@Serializable
@Entity(
    tableName = "activity_logs",
    indices = [
        Index(value = ["user_id"]),
        Index(value = ["timestamp"])
    ]
)
data class ActivityLog(
    @PrimaryKey
    val id: String = "",
    @ColumnInfo(name = "user_id")
    @SerialName("user_id")
    val userId: String,
    val username: String,
    val action: String, // CREATE, UPDATE, DELETE, UPDATE_QUANTITY
    @ColumnInfo(name = "entity_type")
    @SerialName("entity_type")
    val entityType: String = "item", // item, category, etc
    @ColumnInfo(name = "entity_id")
    @SerialName("entity_id")
    val entityId: String,
    @ColumnInfo(name = "entity_name")
    @SerialName("entity_name")
    val entityName: String,
    val timestamp: Long = System.currentTimeMillis(),
    val details: String? = null // Optional additional details
)

enum class ActionType {
    ADD_ITEM,
    UPDATE_ITEM,
    DELETE_ITEM,
    UPDATE_QUANTITY,
    ADD_CATEGORY
}

@Serializable
data class ItemPhoto(
    val id: String = "",
    @SerialName("item_id")
    val itemId: String,
    val url: String,
    val position: Int = 0,
    @SerialName("created_at")
    val createdAt: String? = null
)

@Serializable
data class ItemPhotoInsert(
    @SerialName("item_id")
    val itemId: String,
    val url: String,
    val position: Int
)

data class SyncResult(
    val success: Boolean,
    val itemsSynced: Int = 0,
    val actionsSynced: Int = 0,
    val errors: List<String> = emptyList()
)
