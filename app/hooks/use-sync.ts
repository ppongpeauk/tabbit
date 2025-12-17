/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description React hooks for sync functionality
 */

import { useState, useEffect, useCallback } from "react";
import { syncService, type SyncStatus } from "@/lib/sync-service";
import { isSyncEnabled, setSyncEnabled } from "@/lib/sync-db";

/**
 * Hook to manage sync status and operations
 */
export function useSync() {
  const [status, setStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSyncAt: null,
    pendingCount: 0,
    error: null,
  });
  const [enabled, setEnabledState] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load initial sync enabled state
    isSyncEnabled().then((enabled) => {
      setEnabledState(enabled);
      setIsLoading(false);
    });

    // Subscribe to sync status changes
    const unsubscribe = syncService.subscribe((newStatus) => {
      setStatus(newStatus);
    });

    // Load initial status
    syncService.getStatus().then(setStatus);

    return unsubscribe;
  }, []);

  const sync = useCallback(async () => {
    if (!enabled) return;
    try {
      await syncService.sync();
    } catch (error) {
      console.error("Sync failed:", error);
    }
  }, [enabled]);

  const push = useCallback(async () => {
    if (!enabled) return;
    try {
      await syncService.push();
    } catch (error) {
      console.error("Push failed:", error);
    }
  }, [enabled]);

  const pull = useCallback(async () => {
    if (!enabled) return;
    try {
      await syncService.pull();
    } catch (error) {
      console.error("Pull failed:", error);
    }
  }, [enabled]);

  const toggleEnabled = useCallback(async (newEnabled: boolean) => {
    await setSyncEnabled(newEnabled);
    setEnabledState(newEnabled);
    if (newEnabled) {
      // Auto-sync when enabled
      try {
        await syncService.sync();
      } catch (error) {
        console.error("Auto-sync failed:", error);
      }
    }
  }, []);

  return {
    status,
    enabled,
    isLoading,
    sync,
    push,
    pull,
    toggleEnabled,
  };
}



