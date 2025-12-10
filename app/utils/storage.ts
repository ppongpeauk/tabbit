import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getSyncReceipts,
  saveSyncReceipt,
  updateSyncReceipt as updateSyncReceiptDb,
  deleteSyncReceipt,
  isSyncEnabled,
  type SyncReceipt,
} from "@/lib/sync-db";

const RECEIPTS_KEY = "@tabbit:receipts";
const FRIENDS_KEY = "@tabbit:friends";
const DEFAULT_SPLIT_MODE_KEY = "@tabbit:default_split_mode";

import type {
  ReceiptItem,
  Merchant,
  Transaction,
  Totals,
  ReturnInfo,
  AppData,
  Technical,
} from "./api";
import type { SplitData } from "./split";
import { SplitStrategy } from "./split";

export interface Friend {
  id: string;
  name: string;
  phoneNumber?: string;
  email?: string;
  createdAt: string;
}

export interface StoredReceipt {
  id: string;
  name: string;
  merchant: Merchant;
  transaction: Transaction;
  items: ReceiptItem[];
  totals: Totals;
  returnInfo?: ReturnInfo;
  appData?: AppData;
  technical?: Technical;
  imageUri?: string;
  imageHash?: string;
  splitData?: SplitData;
  createdAt: string;
}

// Re-export types for convenience
export type { ReceiptItem } from "./api";

export async function saveReceipt(
  receipt: Omit<StoredReceipt, "id" | "createdAt">
): Promise<StoredReceipt> {
  const syncEnabled = await isSyncEnabled();

  if (syncEnabled) {
    // Use sync database
    const newReceipt = await saveSyncReceipt({
      ...receipt,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      syncStatus: "pending",
    });
    return newReceipt as StoredReceipt;
  } else {
    // Use regular AsyncStorage
    const receipts = await getReceipts();
    const newReceipt: StoredReceipt = {
      ...receipt,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    receipts.unshift(newReceipt);
    await AsyncStorage.setItem(RECEIPTS_KEY, JSON.stringify(receipts));
    return newReceipt;
  }
}

export async function getReceipts(): Promise<StoredReceipt[]> {
  const syncEnabled = await isSyncEnabled();

  if (syncEnabled) {
    // Use sync database
    const syncReceipts = await getSyncReceipts();
    // Convert SyncReceipt to StoredReceipt (remove sync-specific fields)
    return syncReceipts.map((r) => {
      const { syncStatus, syncError, lastSyncedAt, serverId, ...receipt } = r;
      return receipt as StoredReceipt;
    });
  } else {
    // Use regular AsyncStorage
    try {
      const data = await AsyncStorage.getItem(RECEIPTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error loading receipts:", error);
      return [];
    }
  }
}

export async function deleteReceipt(id: string): Promise<void> {
  const syncEnabled = await isSyncEnabled();

  if (syncEnabled) {
    // Use sync database
    await deleteSyncReceipt(id);
  } else {
    // Use regular AsyncStorage
    const receipts = await getReceipts();
    const filtered = receipts.filter((r) => r.id !== id);
    await AsyncStorage.setItem(RECEIPTS_KEY, JSON.stringify(filtered));
  }
}

export async function updateReceipt(
  id: string,
  updates: Partial<StoredReceipt>
): Promise<void> {
  const syncEnabled = await isSyncEnabled();

  if (syncEnabled) {
    // Use sync database - mark as pending if synced before
    const syncReceipts = await getSyncReceipts();
    const existing = syncReceipts.find((r) => r.id === id);
    if (existing) {
      await updateSyncReceiptDb(id, {
        ...updates,
        syncStatus:
          existing.syncStatus === "synced" ? "pending" : existing.syncStatus,
      });
    }
  } else {
    // Use regular AsyncStorage
    const receipts = await getReceipts();
    const index = receipts.findIndex((r) => r.id === id);
    if (index !== -1) {
      receipts[index] = { ...receipts[index], ...updates };
      await AsyncStorage.setItem(RECEIPTS_KEY, JSON.stringify(receipts));
    }
  }
}

/**
 * Check if a receipt with the given image hash already exists
 * @param imageHash - SHA-256 hash of the image
 * @returns The existing receipt if found, null otherwise
 */
export async function findReceiptByImageHash(
  imageHash: string
): Promise<StoredReceipt | null> {
  const receipts = await getReceipts();
  return receipts.find((r) => r.imageHash === imageHash) || null;
}

/**
 * Save a new friend
 */
export async function saveFriend(
  friend: Omit<Friend, "id" | "createdAt">
): Promise<Friend> {
  const friends = await getFriends();
  const newFriend: Friend = {
    ...friend,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  friends.push(newFriend);
  await AsyncStorage.setItem(FRIENDS_KEY, JSON.stringify(friends));
  return newFriend;
}

/**
 * Get all friends
 */
export async function getFriends(): Promise<Friend[]> {
  try {
    const data = await AsyncStorage.getItem(FRIENDS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error loading friends:", error);
    return [];
  }
}

/**
 * Delete a friend by ID
 */
export async function deleteFriend(id: string): Promise<void> {
  const friends = await getFriends();
  const filtered = friends.filter((f) => f.id !== id);
  await AsyncStorage.setItem(FRIENDS_KEY, JSON.stringify(filtered));
}

/**
 * Update a friend's information
 */
export async function updateFriend(
  id: string,
  updates: Partial<Friend>
): Promise<void> {
  const friends = await getFriends();
  const index = friends.findIndex((f) => f.id === id);
  if (index !== -1) {
    friends[index] = { ...friends[index], ...updates };
    await AsyncStorage.setItem(FRIENDS_KEY, JSON.stringify(friends));
  }
}

/**
 * Save split data for a receipt
 */
export async function saveSplitData(
  receiptId: string,
  splitData: SplitData
): Promise<void> {
  await updateReceipt(receiptId, { splitData });
}

/**
 * Get split data for a receipt
 */
export async function getSplitData(
  receiptId: string
): Promise<SplitData | null> {
  const receipts = await getReceipts();
  const receipt = receipts.find((r) => r.id === receiptId);
  return receipt?.splitData || null;
}

/**
 * Get the default split mode preference
 */
export async function getDefaultSplitMode(): Promise<SplitStrategy> {
  try {
    const data = await AsyncStorage.getItem(DEFAULT_SPLIT_MODE_KEY);
    if (data) {
      return data as SplitStrategy;
    }
    return SplitStrategy.EQUAL; // Default to EQUAL if not set
  } catch (error) {
    console.error("Error loading default split mode:", error);
    return SplitStrategy.EQUAL;
  }
}

/**
 * Set the default split mode preference
 */
export async function setDefaultSplitMode(mode: SplitStrategy): Promise<void> {
  try {
    await AsyncStorage.setItem(DEFAULT_SPLIT_MODE_KEY, mode);
  } catch (error) {
    console.error("Error saving default split mode:", error);
    throw error;
  }
}
