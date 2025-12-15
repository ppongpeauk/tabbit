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
 */
export async function saveSyncReceipt(
  receipt: Partial<SyncReceipt> & { id?: string }
): Promise<SyncReceipt> {
  const receipts = await getSyncReceipts();
  const receiptId = receipt.id || Date.now().toString();
  const newReceipt: SyncReceipt = {
    ...receipt,
    id: receiptId,
    syncStatus: receipt.syncStatus || (receipt.serverId ? "synced" : "pending"),
    createdAt: receipt.createdAt || new Date().toISOString(),
  } as SyncReceipt;

  const existingIndex = receipts.findIndex((r) => r.id === receiptId);
  if (existingIndex >= 0) {
    receipts[existingIndex] = { ...receipts[existingIndex], ...newReceipt };
  } else {
    receipts.unshift(newReceipt);
  }

  await AsyncStorage.setItem(SYNC_DB_KEY, JSON.stringify(receipts));
  return receipts[existingIndex >= 0 ? existingIndex : 0];
}

/**
 * Update receipt in local sync database
 */
export async function updateSyncReceipt(
  id: string,
  updates: Partial<SyncReceipt>
): Promise<void> {
  const receipts = await getSyncReceipts();
  const index = receipts.findIndex((r) => r.id === id);
  if (index >= 0) {
    receipts[index] = { ...receipts[index], ...updates };
    await AsyncStorage.setItem(SYNC_DB_KEY, JSON.stringify(receipts));
  }
}

/**
 * Delete receipt from local sync database
 */
export async function deleteSyncReceipt(id: string): Promise<void> {
  const receipts = await getSyncReceipts();
  const filtered = receipts.filter((r) => r.id !== id);
  await AsyncStorage.setItem(SYNC_DB_KEY, JSON.stringify(filtered));
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


