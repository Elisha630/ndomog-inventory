package com.ndomog.inventory.data.local

import androidx.room.*
import com.ndomog.inventory.data.models.*
import kotlinx.coroutines.flow.Flow

@Dao
interface ItemDao {
    @Query("SELECT * FROM items WHERE isDeleted = 0 ORDER BY createdAt DESC")
    fun getAllItems(): Flow<List<Item>>

    @Query("SELECT * FROM items WHERE isDeleted = 0")
    suspend fun getItems(): List<Item>

    @Query("SELECT * FROM items WHERE id = :id")
    suspend fun getItemById(id: String): Item?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertItem(item: Item)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertItems(items: List<Item>)

    @Update
    suspend fun updateItem(item: Item)

    @Query("UPDATE items SET quantity = :quantity WHERE id = :id")
    suspend fun updateQuantity(id: String, quantity: Int)

    @Query("UPDATE items SET isDeleted = 1, deletedAt = :deletedAt, deletedBy = :deletedBy WHERE id = :id")
    suspend fun softDelete(id: String, deletedAt: String, deletedBy: String)

    @Query("DELETE FROM items")
    suspend fun deleteAll()
}

@Dao
interface CategoryDao {
    @Query("SELECT * FROM categories ORDER BY name ASC")
    fun getAllCategories(): Flow<List<Category>>

    @Query("SELECT * FROM categories ORDER BY name ASC")
    suspend fun getCategories(): List<Category>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCategory(category: Category)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCategories(categories: List<Category>)

    @Query("DELETE FROM categories")
    suspend fun deleteAll()
}

@Dao
interface ProfileDao {
    @Query("SELECT * FROM profiles WHERE id = :id")
    suspend fun getProfileById(id: String): Profile?

    @Query("SELECT * FROM profiles")
    suspend fun getAllProfiles(): List<Profile>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProfile(profile: Profile)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProfiles(profiles: List<Profile>)

    @Query("DELETE FROM profiles")
    suspend fun deleteAll()
}

@Dao
interface PendingActionDao {
    @Query("SELECT * FROM pending_actions WHERE synced = 0 ORDER BY timestamp ASC")
    suspend fun getPendingActions(): List<PendingAction>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAction(action: PendingAction)

    @Query("UPDATE pending_actions SET synced = 1 WHERE id = :id")
    suspend fun markActionSynced(id: Int)

    @Query("DELETE FROM pending_actions WHERE synced = 1")
    suspend fun deleteSyncedActions()

    @Query("DELETE FROM pending_actions")
    suspend fun deleteAll()
}
