/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Hook for checking and managing user limits
 */

import { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "@/utils/config";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "@/contexts/auth-context";
import { useRevenueCat } from "@/contexts/revenuecat-context";

const TOKEN_STORAGE_KEY = "tabbit.token";

export interface LimitStatus {
  monthlyScansUsed: number;
  monthlyScansLimit: number;
  monthlyScansRemaining: number;
  monthlyScansResetDate: string;
  totalReceiptsSaved: number;
  totalReceiptsLimit: number;
  totalReceiptsRemaining: number;
  receiptsResetDate: string;
}

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
}

export function useLimits() {
  const { user } = useAuth();
  const { isPro } = useRevenueCat();
  const [limitStatus, setLimitStatus] = useState<LimitStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLimitStatus = useCallback(async () => {
    if (!user || isPro) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const token = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/limits/status`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch limit status: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setLimitStatus(data);
      } else {
        throw new Error(data.message || "Failed to fetch limit status");
      }
    } catch (err) {
      console.error("Error fetching limit status:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [user, isPro]);

  const checkScanLimit = useCallback(async (): Promise<LimitCheckResult> => {
    if (!user || isPro) {
      return { allowed: true };
    }

    try {
      const token = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
      if (!token) {
        return { allowed: true }; // Allow if not authenticated
      }

      const response = await fetch(`${API_BASE_URL}/limits/check-scan`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        return {
          allowed: false,
          reason: data.message || "Scan limit check failed",
        };
      }

      const data = await response.json();
      return {
        allowed: data.allowed ?? true,
        reason: data.reason,
      };
    } catch (err) {
      console.error("Error checking scan limit:", err);
      return {
        allowed: true, // Allow on error to not block users
        reason: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }, [user, isPro]);

  const checkSaveLimit = useCallback(async (): Promise<LimitCheckResult> => {
    if (!user || isPro) {
      return { allowed: true };
    }

    try {
      const token = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
      if (!token) {
        return { allowed: true }; // Allow if not authenticated
      }

      const response = await fetch(`${API_BASE_URL}/limits/check-save`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        return {
          allowed: false,
          reason: data.message || "Save limit check failed",
        };
      }

      const data = await response.json();
      return {
        allowed: data.allowed ?? true,
        reason: data.reason,
      };
    } catch (err) {
      console.error("Error checking save limit:", err);
      return {
        allowed: true, // Allow on error to not block users
        reason: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }, [user, isPro]);

  useEffect(() => {
    fetchLimitStatus();
  }, [fetchLimitStatus]);

  return {
    limitStatus,
    isLoading,
    error,
    refresh: fetchLimitStatus,
    checkScanLimit,
    checkSaveLimit,
  };
}
