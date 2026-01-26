package com.ndomog.inventory.data.local;

import android.database.Cursor;
import android.os.CancellationSignal;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.room.CoroutinesRoom;
import androidx.room.EntityDeletionOrUpdateAdapter;
import androidx.room.EntityInsertionAdapter;
import androidx.room.RoomDatabase;
import androidx.room.RoomSQLiteQuery;
import androidx.room.SharedSQLiteStatement;
import androidx.room.util.CursorUtil;
import androidx.room.util.DBUtil;
import androidx.sqlite.db.SupportSQLiteStatement;
import com.ndomog.inventory.data.models.Item;
import java.lang.Class;
import java.lang.Exception;
import java.lang.Object;
import java.lang.Override;
import java.lang.String;
import java.lang.SuppressWarnings;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.Callable;
import javax.annotation.processing.Generated;
import kotlin.Unit;
import kotlin.coroutines.Continuation;
import kotlinx.coroutines.flow.Flow;

@Generated("androidx.room.RoomProcessor")
@SuppressWarnings({"unchecked", "deprecation"})
public final class ItemDao_Impl implements ItemDao {
  private final RoomDatabase __db;

  private final EntityInsertionAdapter<Item> __insertionAdapterOfItem;

  private final EntityDeletionOrUpdateAdapter<Item> __updateAdapterOfItem;

  private final SharedSQLiteStatement __preparedStmtOfUpdateQuantity;

  private final SharedSQLiteStatement __preparedStmtOfSoftDelete;

  private final SharedSQLiteStatement __preparedStmtOfDeleteAll;

  public ItemDao_Impl(@NonNull final RoomDatabase __db) {
    this.__db = __db;
    this.__insertionAdapterOfItem = new EntityInsertionAdapter<Item>(__db) {
      @Override
      @NonNull
      protected String createQuery() {
        return "INSERT OR REPLACE INTO `items` (`id`,`name`,`category`,`categoryId`,`details`,`photoUrl`,`buyingPrice`,`sellingPrice`,`quantity`,`lowStockThreshold`,`isDeleted`,`createdBy`,`createdAt`,`updatedAt`,`deletedAt`,`deletedBy`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
      }

      @Override
      protected void bind(@NonNull final SupportSQLiteStatement statement,
          @NonNull final Item entity) {
        statement.bindString(1, entity.getId());
        statement.bindString(2, entity.getName());
        statement.bindString(3, entity.getCategory());
        if (entity.getCategoryId() == null) {
          statement.bindNull(4);
        } else {
          statement.bindString(4, entity.getCategoryId());
        }
        if (entity.getDetails() == null) {
          statement.bindNull(5);
        } else {
          statement.bindString(5, entity.getDetails());
        }
        if (entity.getPhotoUrl() == null) {
          statement.bindNull(6);
        } else {
          statement.bindString(6, entity.getPhotoUrl());
        }
        statement.bindDouble(7, entity.getBuyingPrice());
        statement.bindDouble(8, entity.getSellingPrice());
        statement.bindLong(9, entity.getQuantity());
        statement.bindLong(10, entity.getLowStockThreshold());
        final int _tmp = entity.isDeleted() ? 1 : 0;
        statement.bindLong(11, _tmp);
        if (entity.getCreatedBy() == null) {
          statement.bindNull(12);
        } else {
          statement.bindString(12, entity.getCreatedBy());
        }
        if (entity.getCreatedAt() == null) {
          statement.bindNull(13);
        } else {
          statement.bindString(13, entity.getCreatedAt());
        }
        if (entity.getUpdatedAt() == null) {
          statement.bindNull(14);
        } else {
          statement.bindString(14, entity.getUpdatedAt());
        }
        if (entity.getDeletedAt() == null) {
          statement.bindNull(15);
        } else {
          statement.bindString(15, entity.getDeletedAt());
        }
        if (entity.getDeletedBy() == null) {
          statement.bindNull(16);
        } else {
          statement.bindString(16, entity.getDeletedBy());
        }
      }
    };
    this.__updateAdapterOfItem = new EntityDeletionOrUpdateAdapter<Item>(__db) {
      @Override
      @NonNull
      protected String createQuery() {
        return "UPDATE OR ABORT `items` SET `id` = ?,`name` = ?,`category` = ?,`categoryId` = ?,`details` = ?,`photoUrl` = ?,`buyingPrice` = ?,`sellingPrice` = ?,`quantity` = ?,`lowStockThreshold` = ?,`isDeleted` = ?,`createdBy` = ?,`createdAt` = ?,`updatedAt` = ?,`deletedAt` = ?,`deletedBy` = ? WHERE `id` = ?";
      }

      @Override
      protected void bind(@NonNull final SupportSQLiteStatement statement,
          @NonNull final Item entity) {
        statement.bindString(1, entity.getId());
        statement.bindString(2, entity.getName());
        statement.bindString(3, entity.getCategory());
        if (entity.getCategoryId() == null) {
          statement.bindNull(4);
        } else {
          statement.bindString(4, entity.getCategoryId());
        }
        if (entity.getDetails() == null) {
          statement.bindNull(5);
        } else {
          statement.bindString(5, entity.getDetails());
        }
        if (entity.getPhotoUrl() == null) {
          statement.bindNull(6);
        } else {
          statement.bindString(6, entity.getPhotoUrl());
        }
        statement.bindDouble(7, entity.getBuyingPrice());
        statement.bindDouble(8, entity.getSellingPrice());
        statement.bindLong(9, entity.getQuantity());
        statement.bindLong(10, entity.getLowStockThreshold());
        final int _tmp = entity.isDeleted() ? 1 : 0;
        statement.bindLong(11, _tmp);
        if (entity.getCreatedBy() == null) {
          statement.bindNull(12);
        } else {
          statement.bindString(12, entity.getCreatedBy());
        }
        if (entity.getCreatedAt() == null) {
          statement.bindNull(13);
        } else {
          statement.bindString(13, entity.getCreatedAt());
        }
        if (entity.getUpdatedAt() == null) {
          statement.bindNull(14);
        } else {
          statement.bindString(14, entity.getUpdatedAt());
        }
        if (entity.getDeletedAt() == null) {
          statement.bindNull(15);
        } else {
          statement.bindString(15, entity.getDeletedAt());
        }
        if (entity.getDeletedBy() == null) {
          statement.bindNull(16);
        } else {
          statement.bindString(16, entity.getDeletedBy());
        }
        statement.bindString(17, entity.getId());
      }
    };
    this.__preparedStmtOfUpdateQuantity = new SharedSQLiteStatement(__db) {
      @Override
      @NonNull
      public String createQuery() {
        final String _query = "UPDATE items SET quantity = ? WHERE id = ?";
        return _query;
      }
    };
    this.__preparedStmtOfSoftDelete = new SharedSQLiteStatement(__db) {
      @Override
      @NonNull
      public String createQuery() {
        final String _query = "UPDATE items SET isDeleted = 1, deletedAt = ?, deletedBy = ? WHERE id = ?";
        return _query;
      }
    };
    this.__preparedStmtOfDeleteAll = new SharedSQLiteStatement(__db) {
      @Override
      @NonNull
      public String createQuery() {
        final String _query = "DELETE FROM items";
        return _query;
      }
    };
  }

  @Override
  public Object insertItem(final Item item, final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        __db.beginTransaction();
        try {
          __insertionAdapterOfItem.insert(item);
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @Override
  public Object insertItems(final List<Item> items, final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        __db.beginTransaction();
        try {
          __insertionAdapterOfItem.insert(items);
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @Override
  public Object updateItem(final Item item, final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        __db.beginTransaction();
        try {
          __updateAdapterOfItem.handle(item);
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @Override
  public Object updateQuantity(final String id, final int quantity,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        final SupportSQLiteStatement _stmt = __preparedStmtOfUpdateQuantity.acquire();
        int _argIndex = 1;
        _stmt.bindLong(_argIndex, quantity);
        _argIndex = 2;
        _stmt.bindString(_argIndex, id);
        try {
          __db.beginTransaction();
          try {
            _stmt.executeUpdateDelete();
            __db.setTransactionSuccessful();
            return Unit.INSTANCE;
          } finally {
            __db.endTransaction();
          }
        } finally {
          __preparedStmtOfUpdateQuantity.release(_stmt);
        }
      }
    }, $completion);
  }

  @Override
  public Object softDelete(final String id, final String deletedAt, final String deletedBy,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        final SupportSQLiteStatement _stmt = __preparedStmtOfSoftDelete.acquire();
        int _argIndex = 1;
        _stmt.bindString(_argIndex, deletedAt);
        _argIndex = 2;
        _stmt.bindString(_argIndex, deletedBy);
        _argIndex = 3;
        _stmt.bindString(_argIndex, id);
        try {
          __db.beginTransaction();
          try {
            _stmt.executeUpdateDelete();
            __db.setTransactionSuccessful();
            return Unit.INSTANCE;
          } finally {
            __db.endTransaction();
          }
        } finally {
          __preparedStmtOfSoftDelete.release(_stmt);
        }
      }
    }, $completion);
  }

  @Override
  public Object deleteAll(final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        final SupportSQLiteStatement _stmt = __preparedStmtOfDeleteAll.acquire();
        try {
          __db.beginTransaction();
          try {
            _stmt.executeUpdateDelete();
            __db.setTransactionSuccessful();
            return Unit.INSTANCE;
          } finally {
            __db.endTransaction();
          }
        } finally {
          __preparedStmtOfDeleteAll.release(_stmt);
        }
      }
    }, $completion);
  }

  @Override
  public Flow<List<Item>> getAllItems() {
    final String _sql = "SELECT * FROM items WHERE isDeleted = 0 ORDER BY createdAt DESC";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 0);
    return CoroutinesRoom.createFlow(__db, false, new String[] {"items"}, new Callable<List<Item>>() {
      @Override
      @NonNull
      public List<Item> call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfName = CursorUtil.getColumnIndexOrThrow(_cursor, "name");
          final int _cursorIndexOfCategory = CursorUtil.getColumnIndexOrThrow(_cursor, "category");
          final int _cursorIndexOfCategoryId = CursorUtil.getColumnIndexOrThrow(_cursor, "categoryId");
          final int _cursorIndexOfDetails = CursorUtil.getColumnIndexOrThrow(_cursor, "details");
          final int _cursorIndexOfPhotoUrl = CursorUtil.getColumnIndexOrThrow(_cursor, "photoUrl");
          final int _cursorIndexOfBuyingPrice = CursorUtil.getColumnIndexOrThrow(_cursor, "buyingPrice");
          final int _cursorIndexOfSellingPrice = CursorUtil.getColumnIndexOrThrow(_cursor, "sellingPrice");
          final int _cursorIndexOfQuantity = CursorUtil.getColumnIndexOrThrow(_cursor, "quantity");
          final int _cursorIndexOfLowStockThreshold = CursorUtil.getColumnIndexOrThrow(_cursor, "lowStockThreshold");
          final int _cursorIndexOfIsDeleted = CursorUtil.getColumnIndexOrThrow(_cursor, "isDeleted");
          final int _cursorIndexOfCreatedBy = CursorUtil.getColumnIndexOrThrow(_cursor, "createdBy");
          final int _cursorIndexOfCreatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "createdAt");
          final int _cursorIndexOfUpdatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "updatedAt");
          final int _cursorIndexOfDeletedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "deletedAt");
          final int _cursorIndexOfDeletedBy = CursorUtil.getColumnIndexOrThrow(_cursor, "deletedBy");
          final List<Item> _result = new ArrayList<Item>(_cursor.getCount());
          while (_cursor.moveToNext()) {
            final Item _item;
            final String _tmpId;
            _tmpId = _cursor.getString(_cursorIndexOfId);
            final String _tmpName;
            _tmpName = _cursor.getString(_cursorIndexOfName);
            final String _tmpCategory;
            _tmpCategory = _cursor.getString(_cursorIndexOfCategory);
            final String _tmpCategoryId;
            if (_cursor.isNull(_cursorIndexOfCategoryId)) {
              _tmpCategoryId = null;
            } else {
              _tmpCategoryId = _cursor.getString(_cursorIndexOfCategoryId);
            }
            final String _tmpDetails;
            if (_cursor.isNull(_cursorIndexOfDetails)) {
              _tmpDetails = null;
            } else {
              _tmpDetails = _cursor.getString(_cursorIndexOfDetails);
            }
            final String _tmpPhotoUrl;
            if (_cursor.isNull(_cursorIndexOfPhotoUrl)) {
              _tmpPhotoUrl = null;
            } else {
              _tmpPhotoUrl = _cursor.getString(_cursorIndexOfPhotoUrl);
            }
            final double _tmpBuyingPrice;
            _tmpBuyingPrice = _cursor.getDouble(_cursorIndexOfBuyingPrice);
            final double _tmpSellingPrice;
            _tmpSellingPrice = _cursor.getDouble(_cursorIndexOfSellingPrice);
            final int _tmpQuantity;
            _tmpQuantity = _cursor.getInt(_cursorIndexOfQuantity);
            final int _tmpLowStockThreshold;
            _tmpLowStockThreshold = _cursor.getInt(_cursorIndexOfLowStockThreshold);
            final boolean _tmpIsDeleted;
            final int _tmp;
            _tmp = _cursor.getInt(_cursorIndexOfIsDeleted);
            _tmpIsDeleted = _tmp != 0;
            final String _tmpCreatedBy;
            if (_cursor.isNull(_cursorIndexOfCreatedBy)) {
              _tmpCreatedBy = null;
            } else {
              _tmpCreatedBy = _cursor.getString(_cursorIndexOfCreatedBy);
            }
            final String _tmpCreatedAt;
            if (_cursor.isNull(_cursorIndexOfCreatedAt)) {
              _tmpCreatedAt = null;
            } else {
              _tmpCreatedAt = _cursor.getString(_cursorIndexOfCreatedAt);
            }
            final String _tmpUpdatedAt;
            if (_cursor.isNull(_cursorIndexOfUpdatedAt)) {
              _tmpUpdatedAt = null;
            } else {
              _tmpUpdatedAt = _cursor.getString(_cursorIndexOfUpdatedAt);
            }
            final String _tmpDeletedAt;
            if (_cursor.isNull(_cursorIndexOfDeletedAt)) {
              _tmpDeletedAt = null;
            } else {
              _tmpDeletedAt = _cursor.getString(_cursorIndexOfDeletedAt);
            }
            final String _tmpDeletedBy;
            if (_cursor.isNull(_cursorIndexOfDeletedBy)) {
              _tmpDeletedBy = null;
            } else {
              _tmpDeletedBy = _cursor.getString(_cursorIndexOfDeletedBy);
            }
            _item = new Item(_tmpId,_tmpName,_tmpCategory,_tmpCategoryId,_tmpDetails,_tmpPhotoUrl,_tmpBuyingPrice,_tmpSellingPrice,_tmpQuantity,_tmpLowStockThreshold,_tmpIsDeleted,_tmpCreatedBy,_tmpCreatedAt,_tmpUpdatedAt,_tmpDeletedAt,_tmpDeletedBy);
            _result.add(_item);
          }
          return _result;
        } finally {
          _cursor.close();
        }
      }

      @Override
      protected void finalize() {
        _statement.release();
      }
    });
  }

  @Override
  public Object getItems(final Continuation<? super List<Item>> $completion) {
    final String _sql = "SELECT * FROM items WHERE isDeleted = 0";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 0);
    final CancellationSignal _cancellationSignal = DBUtil.createCancellationSignal();
    return CoroutinesRoom.execute(__db, false, _cancellationSignal, new Callable<List<Item>>() {
      @Override
      @NonNull
      public List<Item> call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfName = CursorUtil.getColumnIndexOrThrow(_cursor, "name");
          final int _cursorIndexOfCategory = CursorUtil.getColumnIndexOrThrow(_cursor, "category");
          final int _cursorIndexOfCategoryId = CursorUtil.getColumnIndexOrThrow(_cursor, "categoryId");
          final int _cursorIndexOfDetails = CursorUtil.getColumnIndexOrThrow(_cursor, "details");
          final int _cursorIndexOfPhotoUrl = CursorUtil.getColumnIndexOrThrow(_cursor, "photoUrl");
          final int _cursorIndexOfBuyingPrice = CursorUtil.getColumnIndexOrThrow(_cursor, "buyingPrice");
          final int _cursorIndexOfSellingPrice = CursorUtil.getColumnIndexOrThrow(_cursor, "sellingPrice");
          final int _cursorIndexOfQuantity = CursorUtil.getColumnIndexOrThrow(_cursor, "quantity");
          final int _cursorIndexOfLowStockThreshold = CursorUtil.getColumnIndexOrThrow(_cursor, "lowStockThreshold");
          final int _cursorIndexOfIsDeleted = CursorUtil.getColumnIndexOrThrow(_cursor, "isDeleted");
          final int _cursorIndexOfCreatedBy = CursorUtil.getColumnIndexOrThrow(_cursor, "createdBy");
          final int _cursorIndexOfCreatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "createdAt");
          final int _cursorIndexOfUpdatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "updatedAt");
          final int _cursorIndexOfDeletedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "deletedAt");
          final int _cursorIndexOfDeletedBy = CursorUtil.getColumnIndexOrThrow(_cursor, "deletedBy");
          final List<Item> _result = new ArrayList<Item>(_cursor.getCount());
          while (_cursor.moveToNext()) {
            final Item _item;
            final String _tmpId;
            _tmpId = _cursor.getString(_cursorIndexOfId);
            final String _tmpName;
            _tmpName = _cursor.getString(_cursorIndexOfName);
            final String _tmpCategory;
            _tmpCategory = _cursor.getString(_cursorIndexOfCategory);
            final String _tmpCategoryId;
            if (_cursor.isNull(_cursorIndexOfCategoryId)) {
              _tmpCategoryId = null;
            } else {
              _tmpCategoryId = _cursor.getString(_cursorIndexOfCategoryId);
            }
            final String _tmpDetails;
            if (_cursor.isNull(_cursorIndexOfDetails)) {
              _tmpDetails = null;
            } else {
              _tmpDetails = _cursor.getString(_cursorIndexOfDetails);
            }
            final String _tmpPhotoUrl;
            if (_cursor.isNull(_cursorIndexOfPhotoUrl)) {
              _tmpPhotoUrl = null;
            } else {
              _tmpPhotoUrl = _cursor.getString(_cursorIndexOfPhotoUrl);
            }
            final double _tmpBuyingPrice;
            _tmpBuyingPrice = _cursor.getDouble(_cursorIndexOfBuyingPrice);
            final double _tmpSellingPrice;
            _tmpSellingPrice = _cursor.getDouble(_cursorIndexOfSellingPrice);
            final int _tmpQuantity;
            _tmpQuantity = _cursor.getInt(_cursorIndexOfQuantity);
            final int _tmpLowStockThreshold;
            _tmpLowStockThreshold = _cursor.getInt(_cursorIndexOfLowStockThreshold);
            final boolean _tmpIsDeleted;
            final int _tmp;
            _tmp = _cursor.getInt(_cursorIndexOfIsDeleted);
            _tmpIsDeleted = _tmp != 0;
            final String _tmpCreatedBy;
            if (_cursor.isNull(_cursorIndexOfCreatedBy)) {
              _tmpCreatedBy = null;
            } else {
              _tmpCreatedBy = _cursor.getString(_cursorIndexOfCreatedBy);
            }
            final String _tmpCreatedAt;
            if (_cursor.isNull(_cursorIndexOfCreatedAt)) {
              _tmpCreatedAt = null;
            } else {
              _tmpCreatedAt = _cursor.getString(_cursorIndexOfCreatedAt);
            }
            final String _tmpUpdatedAt;
            if (_cursor.isNull(_cursorIndexOfUpdatedAt)) {
              _tmpUpdatedAt = null;
            } else {
              _tmpUpdatedAt = _cursor.getString(_cursorIndexOfUpdatedAt);
            }
            final String _tmpDeletedAt;
            if (_cursor.isNull(_cursorIndexOfDeletedAt)) {
              _tmpDeletedAt = null;
            } else {
              _tmpDeletedAt = _cursor.getString(_cursorIndexOfDeletedAt);
            }
            final String _tmpDeletedBy;
            if (_cursor.isNull(_cursorIndexOfDeletedBy)) {
              _tmpDeletedBy = null;
            } else {
              _tmpDeletedBy = _cursor.getString(_cursorIndexOfDeletedBy);
            }
            _item = new Item(_tmpId,_tmpName,_tmpCategory,_tmpCategoryId,_tmpDetails,_tmpPhotoUrl,_tmpBuyingPrice,_tmpSellingPrice,_tmpQuantity,_tmpLowStockThreshold,_tmpIsDeleted,_tmpCreatedBy,_tmpCreatedAt,_tmpUpdatedAt,_tmpDeletedAt,_tmpDeletedBy);
            _result.add(_item);
          }
          return _result;
        } finally {
          _cursor.close();
          _statement.release();
        }
      }
    }, $completion);
  }

  @Override
  public Object getItemById(final String id, final Continuation<? super Item> $completion) {
    final String _sql = "SELECT * FROM items WHERE id = ?";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 1);
    int _argIndex = 1;
    _statement.bindString(_argIndex, id);
    final CancellationSignal _cancellationSignal = DBUtil.createCancellationSignal();
    return CoroutinesRoom.execute(__db, false, _cancellationSignal, new Callable<Item>() {
      @Override
      @Nullable
      public Item call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfName = CursorUtil.getColumnIndexOrThrow(_cursor, "name");
          final int _cursorIndexOfCategory = CursorUtil.getColumnIndexOrThrow(_cursor, "category");
          final int _cursorIndexOfCategoryId = CursorUtil.getColumnIndexOrThrow(_cursor, "categoryId");
          final int _cursorIndexOfDetails = CursorUtil.getColumnIndexOrThrow(_cursor, "details");
          final int _cursorIndexOfPhotoUrl = CursorUtil.getColumnIndexOrThrow(_cursor, "photoUrl");
          final int _cursorIndexOfBuyingPrice = CursorUtil.getColumnIndexOrThrow(_cursor, "buyingPrice");
          final int _cursorIndexOfSellingPrice = CursorUtil.getColumnIndexOrThrow(_cursor, "sellingPrice");
          final int _cursorIndexOfQuantity = CursorUtil.getColumnIndexOrThrow(_cursor, "quantity");
          final int _cursorIndexOfLowStockThreshold = CursorUtil.getColumnIndexOrThrow(_cursor, "lowStockThreshold");
          final int _cursorIndexOfIsDeleted = CursorUtil.getColumnIndexOrThrow(_cursor, "isDeleted");
          final int _cursorIndexOfCreatedBy = CursorUtil.getColumnIndexOrThrow(_cursor, "createdBy");
          final int _cursorIndexOfCreatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "createdAt");
          final int _cursorIndexOfUpdatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "updatedAt");
          final int _cursorIndexOfDeletedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "deletedAt");
          final int _cursorIndexOfDeletedBy = CursorUtil.getColumnIndexOrThrow(_cursor, "deletedBy");
          final Item _result;
          if (_cursor.moveToFirst()) {
            final String _tmpId;
            _tmpId = _cursor.getString(_cursorIndexOfId);
            final String _tmpName;
            _tmpName = _cursor.getString(_cursorIndexOfName);
            final String _tmpCategory;
            _tmpCategory = _cursor.getString(_cursorIndexOfCategory);
            final String _tmpCategoryId;
            if (_cursor.isNull(_cursorIndexOfCategoryId)) {
              _tmpCategoryId = null;
            } else {
              _tmpCategoryId = _cursor.getString(_cursorIndexOfCategoryId);
            }
            final String _tmpDetails;
            if (_cursor.isNull(_cursorIndexOfDetails)) {
              _tmpDetails = null;
            } else {
              _tmpDetails = _cursor.getString(_cursorIndexOfDetails);
            }
            final String _tmpPhotoUrl;
            if (_cursor.isNull(_cursorIndexOfPhotoUrl)) {
              _tmpPhotoUrl = null;
            } else {
              _tmpPhotoUrl = _cursor.getString(_cursorIndexOfPhotoUrl);
            }
            final double _tmpBuyingPrice;
            _tmpBuyingPrice = _cursor.getDouble(_cursorIndexOfBuyingPrice);
            final double _tmpSellingPrice;
            _tmpSellingPrice = _cursor.getDouble(_cursorIndexOfSellingPrice);
            final int _tmpQuantity;
            _tmpQuantity = _cursor.getInt(_cursorIndexOfQuantity);
            final int _tmpLowStockThreshold;
            _tmpLowStockThreshold = _cursor.getInt(_cursorIndexOfLowStockThreshold);
            final boolean _tmpIsDeleted;
            final int _tmp;
            _tmp = _cursor.getInt(_cursorIndexOfIsDeleted);
            _tmpIsDeleted = _tmp != 0;
            final String _tmpCreatedBy;
            if (_cursor.isNull(_cursorIndexOfCreatedBy)) {
              _tmpCreatedBy = null;
            } else {
              _tmpCreatedBy = _cursor.getString(_cursorIndexOfCreatedBy);
            }
            final String _tmpCreatedAt;
            if (_cursor.isNull(_cursorIndexOfCreatedAt)) {
              _tmpCreatedAt = null;
            } else {
              _tmpCreatedAt = _cursor.getString(_cursorIndexOfCreatedAt);
            }
            final String _tmpUpdatedAt;
            if (_cursor.isNull(_cursorIndexOfUpdatedAt)) {
              _tmpUpdatedAt = null;
            } else {
              _tmpUpdatedAt = _cursor.getString(_cursorIndexOfUpdatedAt);
            }
            final String _tmpDeletedAt;
            if (_cursor.isNull(_cursorIndexOfDeletedAt)) {
              _tmpDeletedAt = null;
            } else {
              _tmpDeletedAt = _cursor.getString(_cursorIndexOfDeletedAt);
            }
            final String _tmpDeletedBy;
            if (_cursor.isNull(_cursorIndexOfDeletedBy)) {
              _tmpDeletedBy = null;
            } else {
              _tmpDeletedBy = _cursor.getString(_cursorIndexOfDeletedBy);
            }
            _result = new Item(_tmpId,_tmpName,_tmpCategory,_tmpCategoryId,_tmpDetails,_tmpPhotoUrl,_tmpBuyingPrice,_tmpSellingPrice,_tmpQuantity,_tmpLowStockThreshold,_tmpIsDeleted,_tmpCreatedBy,_tmpCreatedAt,_tmpUpdatedAt,_tmpDeletedAt,_tmpDeletedBy);
          } else {
            _result = null;
          }
          return _result;
        } finally {
          _cursor.close();
          _statement.release();
        }
      }
    }, $completion);
  }

  @NonNull
  public static List<Class<?>> getRequiredConverters() {
    return Collections.emptyList();
  }
}
