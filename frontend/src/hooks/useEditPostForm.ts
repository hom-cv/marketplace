/**
 * useEditPostForm - thin wrapper over useListingForm for editing a listing.
 * Seeds values + images + measurements from the post, and wires the update
 * mutation + post-update navigation back to the listing.
 */

import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { updatePost } from "@/api/posts";
import { queryKeys } from "@/hooks/queryKeys";
import type { Post } from "@/api/types/post";
import { useListingForm } from "@/hooks/useListingForm";

export function useEditPostForm(post: Post) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation("listings");

  return useListingForm({
    post,
    initialValues: {
      title: post.title,
      description: post.description,
      type: post.type,
      gender: post.gender,
      price: parseFloat(post.price),
      shippingCost: parseFloat(post.shipping_cost || "0"),
      size: post.size,
    },
    submit: (data) => updatePost(post.id, data),
    successMessage: t("edit.success"),
    errorFallback: t("edit.error"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.posts.detail(post.id),
      });
      navigate({
        to: "/explore/$postId",
        params: { postId: String(post.id) },
      });
    },
  });
}
