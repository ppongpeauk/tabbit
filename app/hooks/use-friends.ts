/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description React Query hooks for friends
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getFriends,
  removeFriend,
  type Friend,
} from "@/utils/api";

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
    queryFn: async () => {
      const response = await getFriends();
      if (response.success && response.friends) {
        return response.friends;
      }
      return [];
    },
  });
}

/**
 * Hook to delete a friend
 */
export function useDeleteFriend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (friendId: string) => removeFriend(friendId),
    onSuccess: () => {
      // Invalidate and refetch friends list
      queryClient.invalidateQueries({ queryKey: friendKeys.lists() });
    },
  });
}



