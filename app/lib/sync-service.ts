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
import type { StoredReceipt } from "@/utils/storage";

const TOKEN_STORAGE_KEY = "tabbit.token";

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncAt: string | null;
  pendingCount: number;
  error: string | null;
}

export class SyncService {
  private isSyncing = false;
  private syncPromise: Promise<unknown> | null = null;
  private syncListeners: Set<(status: SyncStatus) => void> = new Set();
  private retryAttempts = new Map<string, number>(); // Track retry attempts per receipt
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_MS = 1000; // Base delay of 1 second

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
   * Push pending receipts to server
   */
  async push(): Promise<{ success: boolean; synced: number; errors: number }> {
    // Wait for any ongoing sync to complete
    if (this.syncPromise) {
      await this.syncPromise;
    }

    if (this.isSyncing) {
      return { success: false, synced: 0, errors: 0 };
    }

    this.isSyncing = true;
    this.notifyListeners(await this.getStatus());

    const pushOperation = (async () => {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
        if (!token) {
          throw new Error("Not authenticated");
        }

        // Get pending receipts atomically
        const pending = await getPendingSyncReceipts();
        if (pending.length === 0) {
          return { success: true, synced: 0, errors: 0 };
        }

        // Store original state for rollback
        const originalStates = new Map(
          pending.map((r) => [r.id, { syncStatus: r.syncStatus, syncError: r.syncError }])
        );

        // Convert receipts to sync format
        const syncReceipts = pending.map((receipt) => {
          // Extract sync-specific fields
          const {
            syncStatus,
            syncError,
            lastSyncedAt,
            serverId,
            updatedAt: receiptUpdatedAt,
            ...receiptData
          } = receipt;

          // Use updatedAt if available, otherwise use createdAt
          const updatedAt = receiptUpdatedAt || receipt.createdAt;

          return {
            id: receipt.id,
            data: receiptData as unknown as Record<string, unknown>,
            createdAt: receipt.createdAt,
            updatedAt,
          };
        });

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

        // Update sync status atomically - only mark as synced if server confirms
        // Server returns synced count, so we update receipts in order
        const updatePromises: Promise<void>[] = [];
        for (let i = 0; i < pending.length; i++) {
          const receipt = pending[i];
          if (i < data.synced) {
            // Successfully synced - clear retry attempts
            this.retryAttempts.delete(receipt.id);
            updatePromises.push(
              updateSyncReceipt(receipt.id, {
                syncStatus: "synced",
                lastSyncedAt: new Date().toISOString(),
                syncError: undefined, // Clear any previous errors
              })
            );
          } else {
            // Failed to sync - check retry attempts
            const attempts = this.retryAttempts.get(receipt.id) || 0;
            if (attempts < this.MAX_RETRY_ATTEMPTS) {
              // Mark as pending for retry
              this.retryAttempts.set(receipt.id, attempts + 1);
              updatePromises.push(
                updateSyncReceipt(receipt.id, {
                  syncStatus: "pending", // Keep as pending for retry
                  syncError: `Sync failed (attempt ${attempts + 1}/${this.MAX_RETRY_ATTEMPTS})`,
                })
              );
            } else {
              // Max retries reached - mark as error
              this.retryAttempts.delete(receipt.id);
              updatePromises.push(
                updateSyncReceipt(receipt.id, {
                  syncStatus: "error",
                  syncError: "Failed to sync after multiple attempts",
                })
              );
            }
          }
        }

        await Promise.all(updatePromises);

        return {
          success: true,
          synced: data.synced,
          errors: data.errors,
        };
      } catch (error) {
        // On error, don't change sync status - receipts remain pending for retry
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        throw error;
      }
    })();

    this.syncPromise = pushOperation;

    try {
      const result = await pushOperation;
      this.isSyncing = false;
      this.syncPromise = null;
      this.notifyListeners(await this.getStatus());
      return result;
    } catch (error) {
      this.isSyncing = false;
      this.syncPromise = null;
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
    // Wait for any ongoing sync to complete
    if (this.syncPromise) {
      await this.syncPromise;
    }

    if (this.isSyncing) {
      return { success: false, pulled: 0 };
    }

    this.isSyncing = true;
    this.notifyListeners(await this.getStatus());

    const pullOperation = (async () => {
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

        // Get local receipts atomically
        const localReceipts = await getSyncReceipts();
        const localMap = new Map(localReceipts.map((r) => [r.id, r]));

        let pulled = 0;
        const updatePromises: Promise<void>[] = [];

        for (const serverReceipt of data.receipts || []) {
          const localId = serverReceipt.id;
          const existing = localMap.get(localId);

          if (existing) {
            // Conflict resolution: Use server data if it's newer, otherwise preserve local changes
            const serverUpdatedAt = new Date(serverReceipt.updatedAt);
            const localUpdatedAt = existing.updatedAt
              ? new Date(existing.updatedAt)
              : new Date(existing.createdAt);

            // If local receipt has pending changes, don't overwrite
            if (existing.syncStatus === "pending") {
              // Keep local changes, but update serverId and sync metadata
              updatePromises.push(
                updateSyncReceipt(localId, {
                  serverId: serverReceipt.serverId,
                  // Don't change syncStatus - keep as pending so it gets pushed
                  lastSyncedAt: serverReceipt.syncedAt,
                })
              );
            } else if (serverUpdatedAt >= localUpdatedAt) {
              // Server is newer or equal - merge server data
              const serverData = serverReceipt.data as unknown as StoredReceipt;
              updatePromises.push(
                updateSyncReceipt(localId, {
                  ...serverData,
                  serverId: serverReceipt.serverId,
                  syncStatus: "synced",
                  lastSyncedAt: serverReceipt.syncedAt,
                  updatedAt: serverReceipt.updatedAt, // Use server's updatedAt
                  // Preserve local ID
                  id: localId,
                })
              );
            } else {
              // Local is newer - keep local data but update sync metadata
              updatePromises.push(
                updateSyncReceipt(localId, {
                  serverId: serverReceipt.serverId,
                  syncStatus: "pending", // Mark as pending to push local changes
                  lastSyncedAt: serverReceipt.syncedAt,
                  // Don't update updatedAt - keep local timestamp
                })
              );
            }
          } else {
            // New receipt from server
            const receiptData = serverReceipt.data as unknown as StoredReceipt;
            const newReceipt: SyncReceipt = {
              ...receiptData,
              id: localId,
              serverId: serverReceipt.serverId,
              syncStatus: "synced",
              lastSyncedAt: serverReceipt.syncedAt,
              updatedAt: serverReceipt.updatedAt, // Use server's updatedAt
              createdAt: serverReceipt.createdAt,
            };
            updatePromises.push(
              (async () => {
                const { saveSyncReceipt } = await import("./sync-db");
                await saveSyncReceipt({
                  ...newReceipt,
                  id: localId,
                });
              })()
            );
            pulled++;
          }
        }

        // Execute all updates atomically
        await Promise.all(updatePromises);

        // Only update lastSyncAt if we successfully processed receipts
        if (data.lastSyncAt) {
          await setLastSyncAt(data.lastSyncAt);
        }

        return { success: true, pulled };
      } catch (error) {
        // On error, don't update lastSyncAt - will retry from same point
        throw error;
      }
    })();

    this.syncPromise = pullOperation;

    try {
      const result = await pullOperation;
      this.isSyncing = false;
      this.syncPromise = null;
      this.notifyListeners(await this.getStatus());
      return result;
    } catch (error) {
      this.isSyncing = false;
      this.syncPromise = null;
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
   * Ensures push completes before pull to avoid conflicts
   * Includes automatic retry for failed operations
   */
  async sync(): Promise<{ success: boolean; synced: number; pulled: number }> {
    // Wait for any ongoing sync to complete
    if (this.syncPromise) {
      await this.syncPromise;
    }

    if (this.isSyncing) {
      return { success: false, synced: 0, pulled: 0 };
    }

    const syncWithRetry = async (
      operation: () => Promise<{ success: boolean; synced?: number; pulled?: number }>,
      maxRetries = 2
    ): Promise<{ success: boolean; synced: number; pulled: number }> => {
      let lastError: Error | null = null;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const result = await operation();
          if (result.success) {
            return {
              success: true,
              synced: result.synced || 0,
              pulled: result.pulled || 0,
            };
          }
        } catch (error) {
          lastError = error instanceof Error ? error : new Error("Unknown error");
          if (attempt < maxRetries) {
            // Exponential backoff: wait 1s, 2s, 4s...
            const delay = this.RETRY_DELAY_MS * Math.pow(2, attempt);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }
      throw lastError || new Error("Sync failed after retries");
    };

    try {
      // Push first to ensure local changes are synced
      const pushResult = await syncWithRetry(() => this.push());

      // Small delay to ensure server has processed push
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Then pull to get any server-side changes
      const pullResult = await syncWithRetry(() => this.pull());

      return {
        success: true,
        synced: pushResult.synced,
        pulled: pullResult.pulled,
      };
    } catch (error) {
      console.error("Sync failed:", error);
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
