package com.ndomog.inventory.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.ndomog.inventory.data.models.*

@Database(
    entities = [Item::class, Category::class, Profile::class, PendingAction::class],
    version = 2,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class NdomogDatabase : RoomDatabase() {
    abstract fun itemDao(): ItemDao
    abstract fun categoryDao(): CategoryDao
    abstract fun profileDao(): ProfileDao
    abstract fun pendingActionDao(): PendingActionDao
}
