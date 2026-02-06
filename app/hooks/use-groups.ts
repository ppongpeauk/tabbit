/**
 * @author Composer
 * @description React Query hooks for groups
 */

import { useQuery } from "@tanstack/react-query";
import { getGroups, getGroup, type Group } from "@/utils/api";

// Query keys
export const groupKeys = {
  all: ["groups"] as const,
  lists: () => [...groupKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) =>
    [...groupKeys.lists(), { filters }] as const,
  details: () => [...groupKeys.all, "detail"] as const,
  detail: (id: string) => [...groupKeys.details(), id] as const,
};

/**
 * Hook to fetch all groups
 */
export function useGroups() {
  return useQuery({
    queryKey: groupKeys.lists(),
    queryFn: async () => {
      const response = await getGroups();
      return response.success && response.groups ? response.groups : [];
    },
  });
}

/**
 * Hook to fetch a single group
 */
export function useGroup(groupId: string) {
  return useQuery({
    queryKey: groupKeys.detail(groupId),
    queryFn: async () => {
      const response = await getGroup(groupId);
      return response.success && response.group ? response.group : null;
    },
    enabled: !!groupId,
  });
}
