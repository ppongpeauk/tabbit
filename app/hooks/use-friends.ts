/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description React Query hooks for friends
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getFriends as getFriendsFromApi,
  removeFriend,
  type Friend,
} from "@/utils/api";
import { saveFriend, getFriends as getFriendsFromStorage, deleteFriend as deleteFriendFromStorage, type Friend as StorageFriend } from "@/utils/storage";

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
      const [apiResponse, localFriends] = await Promise.all([
        getFriendsFromApi(),
        getFriendsFromStorage(),
      ]);

      const apiFriends = apiResponse.success && apiResponse.friends ? apiResponse.friends : [];

      const friendMap = new Map<string, StorageFriend>();

      apiFriends.forEach((apiFriend) => {
        const existingLocal = localFriends.find((f) => f.id === apiFriend.friendId);
        if (!existingLocal) {
          friendMap.set(apiFriend.friendId, {
            id: apiFriend.friendId,
            name: apiFriend.friendName,
            email: apiFriend.friendEmail || undefined,
            createdAt: apiFriend.createdAt,
          });
        }
      });

      localFriends.forEach((friend) => {
        friendMap.set(friend.id, friend);
      });

      return Array.from(friendMap.values());
    },
  });
}

/**
 * Hook to delete a friend
 */
export function useDeleteFriend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (friendId: string) => {
      const localFriends = await getFriendsFromStorage();
      const isLocalFriend = localFriends.some((f) => f.id === friendId);

      if (isLocalFriend) {
        await deleteFriendFromStorage(friendId);
      } else {
        await removeFriend(friendId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendKeys.lists() });
    },
  });
}

/**
 * Hook to create a friend locally
 */
export function useCreateFriend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string }): Promise<StorageFriend> => {
      const friend = await saveFriend({
        name: data.name,
      });
      return friend;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendKeys.lists() });
    },
  });
}



