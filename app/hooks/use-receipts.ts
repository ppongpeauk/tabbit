/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description React Query hooks for receipts
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getReceipts,
  saveReceipt,
  updateReceipt,
  deleteReceipt,
  type StoredReceipt,
} from "@/utils/storage";

// Query keys
export const receiptKeys = {
  all: ["receipts"] as const,
  lists: () => [...receiptKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) =>
    [...receiptKeys.lists(), { filters }] as const,
  details: () => [...receiptKeys.all, "detail"] as const,
  detail: (id: string) => [...receiptKeys.details(), id] as const,
};

// Helper function to get receipt by ID
async function getReceiptById(id: string): Promise<StoredReceipt | null> {
  const receipts = await getReceipts();
  return receipts.find((r) => r.id === id) || null;
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
export function useReceipt(id: string | undefined) {
  return useQuery({
    queryKey: receiptKeys.detail(id || ""),
    queryFn: () => getReceiptById(id || ""),
    enabled: !!id,
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
