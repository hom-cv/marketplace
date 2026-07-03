/**
 * useCreatePostForm - thin wrapper over useListingForm for creating a listing.
 * Seeds empty values and wires the create mutation + post-create navigation.
 */

import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { createPost } from "@/api/posts";
import { queryKeys } from "@/hooks/queryKeys";
import { useListingForm } from "@/hooks/useListingForm";

export function useCreatePostForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation("listings");

  return useListingForm({
    initialValues: {
      title: "",
      description: "",
      type: null,
      gender: null,
      price: "",
      shippingCost: 0,
      size: null,
    },
    submit: (data) => createPost(data),
    successMessage: t("create.success"),
    errorFallback: t("create.error"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
      navigate({ to: "/account/listings" });
    },
  });
}
