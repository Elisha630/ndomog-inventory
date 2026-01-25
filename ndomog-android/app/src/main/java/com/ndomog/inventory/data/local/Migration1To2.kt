package com.ndomog.inventory.data.local

import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

val MIGRATION_1_2 = object : Migration(1, 2) {
    override fun migrate(database: SupportSQLiteDatabase) {
        database.execSQL("ALTER TABLE items ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0")
        database.execSQL("ALTER TABLE items ADD COLUMN deleted_at TEXT DEFAULT NULL")
        database.execSQL("ALTER TABLE items ADD COLUMN deleted_by TEXT DEFAULT NULL")
    }
}