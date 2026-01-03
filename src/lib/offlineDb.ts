import Dexie, { type Table } from 'dexie';

export interface OfflineItem {
  id: string;
  name: string;
  category: string;
  category_id: string | null;
  details: string | null;
  photo_url: string | null;
  buying_price: number;
  selling_price: number;
  quantity: number;
  low_stock_threshold: number;
  is_deleted: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OfflineCategory {
  id: string;
  name: string;
  created_at: string;
  created_by: string | null;
}

export interface OfflineProfile {
  id: string;
  email: string;
  username: string | null;
  avatar_url: string | null;
}

export interface PendingAction {
  id?: number;
  type: 'add_item' | 'update_item' | 'delete_item' | 'update_quantity' | 'add_category';
  entity_id: string;
  data: Record<string, unknown>;
  timestamp: number;
  synced: boolean;
}

class OfflineDatabase extends Dexie {
  items!: Table<OfflineItem, string>;
  categories!: Table<OfflineCategory, string>;
  profiles!: Table<OfflineProfile, string>;
  pendingActions!: Table<PendingAction, number>;

  constructor() {
    super('ndomog-offline');
    
    this.version(1).stores({
      items: 'id, name, category, category_id, updated_at, is_deleted',
      categories: 'id, name',
      profiles: 'id, email',
      pendingActions: '++id, type, entity_id, timestamp, synced'
    });
  }
}

export const offlineDb = new OfflineDatabase();

// Helper functions for offline operations
export const saveItemsLocally = async (items: OfflineItem[]) => {
  await offlineDb.items.bulkPut(items);
};

export const loadItemsLocally = async (): Promise<OfflineItem[]> => {
  return await offlineDb.items.where('is_deleted').equals(0).toArray();
};

export const saveCategoriesLocally = async (categories: OfflineCategory[]) => {
  await offlineDb.categories.bulkPut(categories);
};

export const loadCategoriesLocally = async (): Promise<OfflineCategory[]> => {
  return await offlineDb.categories.toArray();
};

export const saveProfilesLocally = async (profiles: OfflineProfile[]) => {
  await offlineDb.profiles.bulkPut(profiles);
};

export const loadProfilesLocally = async (): Promise<OfflineProfile[]> => {
  return await offlineDb.profiles.toArray();
};

export const queueOfflineAction = async (action: Omit<PendingAction, 'id' | 'synced'>) => {
  await offlineDb.pendingActions.add({
    ...action,
    synced: false
  });
};

export const getPendingActions = async (): Promise<PendingAction[]> => {
  return await offlineDb.pendingActions.where('synced').equals(0).toArray();
};

export const markActionSynced = async (id: number) => {
  await offlineDb.pendingActions.update(id, { synced: true });
};

export const clearSyncedActions = async () => {
  await offlineDb.pendingActions.where('synced').equals(1).delete();
};
