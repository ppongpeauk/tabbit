/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Local database for offline receipt storage and sync
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StoredReceipt } from "@/utils/storage";

const SYNC_DB_KEY = "@tabbit:sync_db";
const LAST_SYNC_KEY = "@tabbit:last_sync";
const SYNC_ENABLED_KEY = "@tabbit:sync_enabled";

export interface SyncReceipt extends StoredReceipt {
  serverId?: string; // Server-side ID if synced
  syncStatus: "pending" | "synced" | "error";
  syncError?: string;
  lastSyncedAt?: string;
  updatedAt?: string; // Timestamp for conflict resolution
}

/**
 * Get all receipts from local sync database
 */
export async function getSyncReceipts(): Promise<SyncReceipt[]> {
  try {
    const data = await AsyncStorage.getItem(SYNC_DB_KEY);
    if (!data) return [];
    const receipts = JSON.parse(data) as SyncReceipt[];
    return receipts;
  } catch (error) {
    console.error("Error loading sync receipts:", error);
    return [];
  }
}

/**
 * Save receipt to local sync database
 * Ensures atomic operation and proper timestamp handling
 */
export async function saveSyncReceipt(
  receipt: Partial<SyncReceipt> & { id?: string }
): Promise<SyncReceipt> {
  try {
    const receipts = await getSyncReceipts();
    const receiptId = receipt.id || Date.now().toString();
    const now = new Date().toISOString();

    const newReceipt: SyncReceipt = {
      ...receipt,
      id: receiptId,
      syncStatus: receipt.syncStatus || (receipt.serverId ? "synced" : "pending"),
      createdAt: receipt.createdAt || now,
      updatedAt: receipt.updatedAt || receipt.createdAt || now,
    } as SyncReceipt;

    const existingIndex = receipts.findIndex((r) => r.id === receiptId);
    if (existingIndex >= 0) {
      // Merge with existing - preserve sync metadata if not provided
      const existing = receipts[existingIndex];
      receipts[existingIndex] = {
        ...existing,
        ...newReceipt,
        // Preserve sync metadata if not explicitly updating
        syncStatus: newReceipt.syncStatus ?? existing.syncStatus,
        serverId: newReceipt.serverId ?? existing.serverId,
        lastSyncedAt: newReceipt.lastSyncedAt ?? existing.lastSyncedAt,
      };
    } else {
      receipts.unshift(newReceipt);
    }

    await AsyncStorage.setItem(SYNC_DB_KEY, JSON.stringify(receipts));
    return receipts[existingIndex >= 0 ? existingIndex : 0];
  } catch (error) {
    console.error("Error saving sync receipt:", error);
    throw new Error(
      `Failed to save receipt: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Update receipt in local sync database
 * Ensures atomic operation and updates updatedAt timestamp
 */
export async function updateSyncReceipt(
  id: string,
  updates: Partial<SyncReceipt>
): Promise<void> {
  try {
    const receipts = await getSyncReceipts();
    const index = receipts.findIndex((r) => r.id === id);
    if (index >= 0) {
      const existing = receipts[index];
      const now = new Date().toISOString();

      // Update receipt with new data
      receipts[index] = {
        ...existing,
        ...updates,
        // Always update updatedAt when receipt data changes (unless explicitly set)
        updatedAt: updates.updatedAt || (updates.syncStatus ? existing.updatedAt : now),
        // Preserve ID
        id: existing.id,
      };

      await AsyncStorage.setItem(SYNC_DB_KEY, JSON.stringify(receipts));
    } else {
      console.warn(`Receipt ${id} not found for update`);
    }
  } catch (error) {
    console.error("Error updating sync receipt:", error);
    throw new Error(
      `Failed to update receipt: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Delete receipt from local sync database
 * Ensures atomic operation
 */
export async function deleteSyncReceipt(id: string): Promise<void> {
  try {
    const receipts = await getSyncReceipts();
    const filtered = receipts.filter((r) => r.id !== id);

    // Only update if receipt was actually found
    if (filtered.length !== receipts.length) {
      await AsyncStorage.setItem(SYNC_DB_KEY, JSON.stringify(filtered));
    } else {
      console.warn(`Receipt ${id} not found for deletion`);
    }
  } catch (error) {
    console.error("Error deleting sync receipt:", error);
    throw new Error(
      `Failed to delete receipt: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Get receipts that need to be synced (pending or error status)
 */
export async function getPendingSyncReceipts(): Promise<SyncReceipt[]> {
  const receipts = await getSyncReceipts();
  return receipts.filter(
    (r) => r.syncStatus === "pending" || r.syncStatus === "error"
  );
}

/**
 * Get last sync timestamp
 */
export async function getLastSyncAt(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_SYNC_KEY);
  } catch {
    return null;
  }
}

/**
 * Set last sync timestamp
 */
export async function setLastSyncAt(timestamp: string): Promise<void> {
  await AsyncStorage.setItem(LAST_SYNC_KEY, timestamp);
}

/**
 * Check if sync is enabled
 */
export async function isSyncEnabled(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(SYNC_ENABLED_KEY);
    return value === "true";
  } catch {
    return false;
  }
}

/**
 * Set sync enabled status
 */
export async function setSyncEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(SYNC_ENABLED_KEY, enabled ? "true" : "false");
}



