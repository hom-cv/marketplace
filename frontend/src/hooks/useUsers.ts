/**
 * User-related query and mutation hooks
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserProfile, getUserPosts, updateMyProfile } from "@/api/users";
import { useAuthStore } from "@/stores/authStore";
import type { UpdateProfileRequest } from "@/api/types/user";
import { queryKeys } from "./queryKeys";

export function useUserProfile(username: string | undefined) {
  return useQuery({
    queryKey: queryKeys.users.profile(username),
    queryFn: () => getUserProfile(username!),
    enabled: !!username,
    // Profiles change slowly; without this every listing view refetches the
    // seller's profile. Mutations (follow, feedback) invalidate explicitly.
    staleTime: 5 * 60 * 1000,
  });
}

export function useUserPosts(username: string | undefined) {
  return useQuery({
    queryKey: queryKeys.posts.byUser(username!),
    queryFn: () => getUserPosts(username!),
    enabled: !!username,
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (data: UpdateProfileRequest) => updateMyProfile(data),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      const promises = [
        queryClient.invalidateQueries({ queryKey: queryKeys.currentUser }),
      ];
      if (user?.username) {
        promises.push(queryClient.invalidateQueries({ queryKey: queryKeys.users.profile(user.username) }));
      }
      Promise.all(promises);
    },
  });
}
