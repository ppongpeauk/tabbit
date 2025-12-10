/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Sync service for offline receipt synchronization
 */

import { API_BASE_URL } from "@/utils/config";
import * as SecureStore from "expo-secure-store";
import {
  getSyncReceipts,
  getPendingSyncReceipts,
  updateSyncReceipt,
  setLastSyncAt,
  getLastSyncAt,
  type SyncReceipt,
} from "./sync-db";
import { File } from "expo-file-system";
import type { StoredReceipt } from "@/utils/storage";

const TOKEN_STORAGE_KEY = "tabbit.token";

/**
 * Convert image URI to base64
 */
async function imageUriToBase64(uri: string): Promise<string> {
  try {
    const file = new File(uri);
    return await file.base64();
  } catch (error) {
    throw new Error(
      `Failed to read image file: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncAt: string | null;
  pendingCount: number;
  error: string | null;
}

export class SyncService {
  private isSyncing = false;
  private syncListeners: Set<(status: SyncStatus) => void> = new Set();

  /**
   * Subscribe to sync status changes
   */
  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.syncListeners.add(listener);
    return () => {
      this.syncListeners.delete(listener);
    };
  }

  /**
   * Notify listeners of sync status change
   */
  private notifyListeners(status: SyncStatus): void {
    this.syncListeners.forEach((listener) => listener(status));
  }

  /**
   * Get current sync status
   */
  async getStatus(): Promise<SyncStatus> {
    const pending = await getPendingSyncReceipts();
    const lastSyncAt = await getLastSyncAt();
    return {
      isSyncing: this.isSyncing,
      lastSyncAt,
      pendingCount: pending.length,
      error: null,
    };
  }

  /**
   * Check if user is pro (for determining if images should be synced)
   */
  private async checkIsPro(): Promise<boolean> {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
      if (!token) {
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/subscription/sync`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.success && data.isPro === true;
    } catch (error) {
      console.error("Failed to check pro status:", error);
      return false;
    }
  }

  /**
   * Push pending receipts to server
   */
  async push(): Promise<{ success: boolean; synced: number; errors: number }> {
    if (this.isSyncing) {
      return { success: false, synced: 0, errors: 0 };
    }

    this.isSyncing = true;
    this.notifyListeners(await this.getStatus());

    try {
      const token = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
      if (!token) {
        throw new Error("Not authenticated");
      }

      const pending = await getPendingSyncReceipts();
      if (pending.length === 0) {
        this.isSyncing = false;
        this.notifyListeners(await this.getStatus());
        return { success: true, synced: 0, errors: 0 };
      }

      // Check if user is pro (only pro users get image storage)
      const isPro = await this.checkIsPro();

      // Convert receipts to sync format
      const syncReceipts = await Promise.all(
        pending.map(async (receipt) => {
          let imageUri: string | undefined;
          // Only include images if user is pro
          if (receipt.imageUri && isPro) {
            try {
              // Check if it's already base64
              if (receipt.imageUri.startsWith("data:")) {
                // Extract base64 part
                const base64Match = receipt.imageUri.match(/base64,(.+)$/);
                imageUri = base64Match ? base64Match[1] : undefined;
              } else {
                // Convert file URI to base64
                imageUri = await imageUriToBase64(receipt.imageUri);
              }
            } catch (error) {
              console.error(
                `Failed to convert image for receipt ${receipt.id}:`,
                error
              );
            }
          }

          // Extract sync-specific fields
          const {
            syncStatus,
            syncError,
            lastSyncedAt,
            serverId,
            ...receiptData
          } = receipt;

          return {
            id: receipt.id,
            data: receiptData as unknown as Record<string, unknown>,
            imageUri,
            createdAt: receipt.createdAt,
            updatedAt: receipt.createdAt, // Use createdAt as updatedAt if not available
          };
        })
      );

      const response = await fetch(`${API_BASE_URL}/sync/push`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ receipts: syncReceipts }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: `HTTP ${response.status}: ${response.statusText}`,
        }));
        throw new Error(errorData.message || "Failed to push receipts");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to push receipts");
      }

      // Update sync status for synced receipts
      const syncedIds = new Set(pending.slice(0, data.synced).map((r) => r.id));
      for (const receipt of pending) {
        if (syncedIds.has(receipt.id)) {
          await updateSyncReceipt(receipt.id, {
            syncStatus: "synced",
            lastSyncedAt: new Date().toISOString(),
          });
        } else {
          await updateSyncReceipt(receipt.id, {
            syncStatus: "error",
            syncError: "Failed to sync",
          });
        }
      }

      this.isSyncing = false;
      this.notifyListeners(await this.getStatus());
      return {
        success: true,
        synced: data.synced,
        errors: data.errors,
      };
    } catch (error) {
      this.isSyncing = false;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.notifyListeners({
        ...(await this.getStatus()),
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Pull receipts from server
   */
  async pull(): Promise<{ success: boolean; pulled: number }> {
    if (this.isSyncing) {
      return { success: false, pulled: 0 };
    }

    this.isSyncing = true;
    this.notifyListeners(await this.getStatus());

    try {
      const token = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
      if (!token) {
        throw new Error("Not authenticated");
      }

      const lastSyncAt = await getLastSyncAt();
      const queryParam = lastSyncAt
        ? `?lastSyncAt=${encodeURIComponent(lastSyncAt)}`
        : "";

      const response = await fetch(`${API_BASE_URL}/sync/pull${queryParam}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: `HTTP ${response.status}: ${response.statusText}`,
        }));
        throw new Error(errorData.message || "Failed to pull receipts");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to pull receipts");
      }

      // Merge pulled receipts with local database
      const localReceipts = await getSyncReceipts();
      const localMap = new Map(localReceipts.map((r) => [r.id, r]));

      let pulled = 0;
      for (const serverReceipt of data.receipts || []) {
        const localId = serverReceipt.id;
        const existing = localMap.get(localId);

        if (existing) {
          // Update existing receipt
          await updateSyncReceipt(localId, {
            serverId: serverReceipt.serverId,
            syncStatus: "synced",
            lastSyncedAt: serverReceipt.syncedAt,
            // Update imageUri if we got a new URL
            imageUri: serverReceipt.imageUrl || existing.imageUri,
          });
        } else {
          // Add new receipt from server
          const receiptData = serverReceipt.data as unknown as StoredReceipt;
          const newReceipt: SyncReceipt = {
            ...receiptData,
            id: localId,
            serverId: serverReceipt.serverId,
            syncStatus: "synced",
            lastSyncedAt: serverReceipt.syncedAt,
            imageUri: serverReceipt.imageUrl || receiptData.imageUri,
            createdAt: serverReceipt.createdAt,
          };
          // Use saveSyncReceipt to add new receipt
          const { saveSyncReceipt } = await import("./sync-db");
          await saveSyncReceipt({
            ...newReceipt,
            id: localId,
          });
          pulled++;
        }
      }

      if (data.lastSyncAt) {
        await setLastSyncAt(data.lastSyncAt);
      }

      this.isSyncing = false;
      this.notifyListeners(await this.getStatus());
      return { success: true, pulled };
    } catch (error) {
      this.isSyncing = false;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.notifyListeners({
        ...(await this.getStatus()),
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Full sync (push then pull)
   */
  async sync(): Promise<{ success: boolean; synced: number; pulled: number }> {
    try {
      const pushResult = await this.push();
      const pullResult = await this.pull();
      return {
        success: true,
        synced: pushResult.synced,
        pulled: pullResult.pulled,
      };
    } catch (error) {
      return {
        success: false,
        synced: 0,
        pulled: 0,
      };
    }
  }

  /**
   * Check if sync is allowed (all authenticated users can sync)
   */
  async checkSyncStatus(): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
      if (!token) {
        return { allowed: false, reason: "Not authenticated" };
      }

      const response = await fetch(`${API_BASE_URL}/sync/status`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return { allowed: false, reason: "Failed to check sync status" };
      }

      const data = await response.json();
      return {
        allowed: data.allowed ?? false,
        reason: data.reason,
      };
    } catch (error) {
      return {
        allowed: false,
        reason:
          error instanceof Error
            ? error.message
            : "Failed to check sync status",
      };
    }
  }
}

export const syncService = new SyncService();
