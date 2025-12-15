/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description React Query hooks for friends
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getFriends,
  saveFriend,
  updateFriend,
  deleteFriend,
  type Friend,
} from "@/utils/storage";

// Query keys
export const friendKeys = {
  all: ["friends"] as const,
  lists: () => [...friendKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) =>
    [...friendKeys.lists(), { filters }] as const,
  details: () => [...friendKeys.all, "detail"] as const,
  detail: (id: string) => [...friendKeys.details(), id] as const,
};

/**
 * Hook to fetch all friends
 */
export function useFriends() {
  return useQuery({
    queryKey: friendKeys.lists(),
    queryFn: getFriends,
  });
}

/**
 * Hook to create a new friend
 */
export function useCreateFriend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (friend: Omit<Friend, "id" | "createdAt">) =>
      saveFriend(friend),
    onSuccess: () => {
      // Invalidate and refetch friends list
      queryClient.invalidateQueries({ queryKey: friendKeys.lists() });
    },
  });
}

/**
 * Hook to update a friend
 */
export function useUpdateFriend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Friend> }) =>
      updateFriend(id, updates),
    onSuccess: (_, variables) => {
      // Invalidate both the list and the specific friend
      queryClient.invalidateQueries({ queryKey: friendKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: friendKeys.detail(variables.id),
      });
    },
  });
}

/**
 * Hook to delete a friend
 */
export function useDeleteFriend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteFriend(id),
    onSuccess: (_, id) => {
      // Remove the friend from cache and invalidate list
      queryClient.removeQueries({ queryKey: friendKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: friendKeys.lists() });
    },
  });
}


