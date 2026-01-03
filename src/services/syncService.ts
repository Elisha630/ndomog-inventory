import { supabase } from "@/integrations/supabase/client";
import {
  offlineDb,
  saveItemsLocally,
  loadItemsLocally,
  saveCategoriesLocally,
  loadCategoriesLocally,
  saveProfilesLocally,
  loadProfilesLocally,
  getPendingActions,
  markActionSynced,
  clearSyncedActions,
  type OfflineItem,
  type OfflineCategory,
  type OfflineProfile,
} from "@/lib/offlineDb";

export interface SyncResult {
  success: boolean;
  itemsSynced: number;
  actionsSynced: number;
  errors: string[];
}

// Fetch items from Supabase and cache locally
export const fetchAndCacheItems = async (): Promise<OfflineItem[]> => {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching items:", error);
    throw error;
  }

  const items = (data || []).map((item) => ({
    ...item,
    category_id: item.category_id || null,
    is_deleted: item.is_deleted || false,
  })) as OfflineItem[];

  await saveItemsLocally(items);
  return items;
};

// Fetch categories from Supabase and cache locally
export const fetchAndCacheCategories = async (): Promise<OfflineCategory[]> => {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching categories:", error);
    throw error;
  }

  const categories = (data || []) as OfflineCategory[];
  await saveCategoriesLocally(categories);
  return categories;
};

// Fetch profiles from Supabase and cache locally
export const fetchAndCacheProfiles = async (): Promise<OfflineProfile[]> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, username, avatar_url");

  if (error) {
    console.error("Error fetching profiles:", error);
    throw error;
  }

  const profiles = (data || []) as OfflineProfile[];
  await saveProfilesLocally(profiles);
  return profiles;
};

// Load items - tries online first, falls back to offline
export const loadItems = async (isOnline: boolean): Promise<{ items: OfflineItem[]; fromCache: boolean }> => {
  if (isOnline) {
    try {
      const items = await fetchAndCacheItems();
      return { items, fromCache: false };
    } catch (error) {
      console.log("Failed to fetch online, falling back to cache:", error);
      const items = await loadItemsLocally();
      return { items, fromCache: true };
    }
  } else {
    const items = await loadItemsLocally();
    return { items, fromCache: true };
  }
};

// Load categories - tries online first, falls back to offline
export const loadCategories = async (isOnline: boolean): Promise<{ categories: OfflineCategory[]; fromCache: boolean }> => {
  if (isOnline) {
    try {
      const categories = await fetchAndCacheCategories();
      return { categories, fromCache: false };
    } catch (error) {
      console.log("Failed to fetch online, falling back to cache:", error);
      const categories = await loadCategoriesLocally();
      return { categories, fromCache: true };
    }
  } else {
    const categories = await loadCategoriesLocally();
    return { categories, fromCache: true };
  }
};

// Load profiles - tries online first, falls back to offline
export const loadProfiles = async (isOnline: boolean): Promise<{ profiles: OfflineProfile[]; fromCache: boolean }> => {
  if (isOnline) {
    try {
      const profiles = await fetchAndCacheProfiles();
      return { profiles, fromCache: false };
    } catch (error) {
      console.log("Failed to fetch online, falling back to cache:", error);
      const profiles = await loadProfilesLocally();
      return { profiles, fromCache: true };
    }
  } else {
    const profiles = await loadProfilesLocally();
    return { profiles, fromCache: true };
  }
};

// Sync pending offline actions to Supabase
export const syncPendingActions = async (): Promise<SyncResult> => {
  const result: SyncResult = {
    success: true,
    itemsSynced: 0,
    actionsSynced: 0,
    errors: [],
  };

  try {
    const pendingActions = await getPendingActions();

    if (pendingActions.length === 0) {
      return result;
    }

    console.log(`Syncing ${pendingActions.length} pending actions...`);

    for (const action of pendingActions) {
      try {
        switch (action.type) {
          case "add_item": {
            const itemData = action.data as {
              name: string;
              category: string;
              quantity: number;
              buying_price: number;
              selling_price: number;
              low_stock_threshold: number;
              details?: string | null;
              photo_url?: string | null;
              category_id?: string | null;
              created_by?: string | null;
            };
            const { error } = await supabase.from("items").insert(itemData);
            if (error) throw error;
            break;
          }
          case "update_item": {
            const updateData = action.data as Record<string, unknown>;
            const { error } = await supabase
              .from("items")
              .update(updateData)
              .eq("id", action.entity_id);
            if (error) throw error;
            break;
          }
          case "delete_item": {
            // Soft delete
            const { error } = await supabase
              .from("items")
              .update({ is_deleted: true, deleted_at: new Date().toISOString() })
              .eq("id", action.entity_id);
            if (error) throw error;
            break;
          }
          case "update_quantity": {
            const quantityData = action.data as { quantity: number };
            const { error } = await supabase
              .from("items")
              .update({ quantity: quantityData.quantity })
              .eq("id", action.entity_id);
            if (error) throw error;
            break;
          }
          case "add_category": {
            const categoryData = action.data as { name: string; created_by?: string | null };
            const { error } = await supabase.from("categories").insert(categoryData);
            if (error) throw error;
            break;
          }
        }

        await markActionSynced(action.id!);
        result.actionsSynced++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        result.errors.push(`Failed to sync ${action.type}: ${errorMessage}`);
        console.error(`Failed to sync action ${action.id}:`, error);
      }
    }

    // Clean up synced actions
    await clearSyncedActions();

    // Refresh local cache with latest data
    await fetchAndCacheItems();
    result.itemsSynced = (await loadItemsLocally()).length;

    if (result.errors.length > 0) {
      result.success = false;
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    result.errors.push(errorMessage);
    result.success = false;
    return result;
  }
};

// Clear all offline data (for logout)
export const clearOfflineData = async () => {
  await offlineDb.items.clear();
  await offlineDb.categories.clear();
  await offlineDb.profiles.clear();
  await offlineDb.pendingActions.clear();
};
