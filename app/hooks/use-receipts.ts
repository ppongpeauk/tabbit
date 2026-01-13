/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description React Query hooks for receipts
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/utils/api";
import {
  getReceipts,
  saveReceipt,
  updateReceipt,
  deleteReceipt,
  type StoredReceipt,
} from "@/utils/storage";
import type { AxiosError } from "axios";

// Query keys
export const receiptKeys = {
  all: ["receipts"] as const,
  lists: () => [...receiptKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) =>
    [...receiptKeys.lists(), { filters }] as const,
  details: () => [...receiptKeys.all, "detail"] as const,
  detail: (id: string) => [...receiptKeys.details(), id] as const,
};

/**
 * Helper function to get receipt by ID from server
 */
async function getReceiptById(id: string): Promise<StoredReceipt | null> {
  try {
    const response = await apiClient.get(`/receipts/${id}`);
    const data = response.data;
    if (!data.success || !data.receipt) {
      return null;
    }
    return data.receipt as StoredReceipt;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    // Return null for 404 errors (receipt not found)
    if (axiosError.response?.status === 404) {
      return null;
    }
    // Throw error for other cases
    throw new Error(
      axiosError.response?.data?.message ||
        axiosError.message ||
        "Failed to fetch receipt"
    );
  }
}

/**
 * Hook to fetch all receipts
 */
export function useReceipts() {
  return useQuery({
    queryKey: receiptKeys.lists(),
    queryFn: getReceipts,
  });
}

/**
 * Hook to fetch a single receipt by ID
 */
export function useReceipt(id: string | string[] | undefined) {
  // Handle case where id might be an array from route params
  const receiptId = Array.isArray(id) ? id[0] : id;

  return useQuery({
    queryKey: receiptKeys.detail(receiptId || ""),
    queryFn: () => {
      if (!receiptId) {
        throw new Error("Receipt ID is required");
      }
      return getReceiptById(receiptId);
    },
    enabled: !!receiptId,
    retry: (failureCount, error) => {
      // Don't retry on 404 errors (receipt not found)
      if (error instanceof Error && error.message.includes("404")) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

/**
 * Hook to create a new receipt
 */
export function useCreateReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (receipt: Omit<StoredReceipt, "id" | "createdAt">) =>
      saveReceipt(receipt),
    onSuccess: () => {
      // Invalidate and refetch receipts list
      queryClient.invalidateQueries({ queryKey: receiptKeys.lists() });
    },
  });
}

/**
 * Hook to update a receipt
 */
export function useUpdateReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<StoredReceipt>;
    }) => updateReceipt(id, updates),
    onSuccess: (_, variables) => {
      // Invalidate both the list and the specific receipt
      queryClient.invalidateQueries({ queryKey: receiptKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: receiptKeys.detail(variables.id),
      });
    },
  });
}

/**
 * Hook to delete a receipt
 */
export function useDeleteReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteReceipt(id),
    onSuccess: (_, id) => {
      // Remove the receipt from cache and invalidate list
      queryClient.removeQueries({ queryKey: receiptKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: receiptKeys.lists() });
    },
  });
}
