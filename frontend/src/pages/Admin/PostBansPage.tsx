import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { listPostBans, banPost, liftPostBan } from "@/api/admin";
import type { PostBanResponse } from "@/api/types/admin";
import {
  BanManagementTable,
  CreateBanModal,
  BanEntityType,
} from "@/components/BanManagement";

export function PostBansPage() {
  const queryClient = useQueryClient();
  const [activeOnly, setActiveOnly] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);
  const [postId, setPostId] = useState<number | undefined>();
  const [reason, setReason] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["postBans", activeOnly],
    queryFn: () => listPostBans({ active_only: activeOnly }),
  });

  const banMutation = useMutation({
    mutationFn: () => banPost({ post_id: postId!, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["postBans"] });
      close();
      setPostId(undefined);
      setReason("");
    },
  });

  const liftMutation = useMutation({
    mutationFn: liftPostBan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["postBans"] });
    },
  });

  return (
    <>
      <BanManagementTable<PostBanResponse>
        entityType={BanEntityType.Listing}
        items={data?.items}
        total={data?.total || 0}
        isLoading={isLoading}
        error={error}
        activeOnly={activeOnly}
        onActiveOnlyChange={setActiveOnly}
        columns={[
          {
            key: "listing",
            label: "Listing",
            render: (ban) => (
              <Text fw={500} lineClamp={1} maw={200}>
                {ban.post_title}
              </Text>
            ),
          },
          {
            key: "seller",
            label: "Seller",
            render: (ban) => ban.seller_username,
          },
        ]}
        onCreateClick={open}
        onLiftBan={(banId) => liftMutation.mutate(banId)}
        isLiftingBan={liftMutation.isPending}
      />

      <CreateBanModal
        opened={opened}
        onClose={close}
        entityType={BanEntityType.Listing}
        idValue={postId}
        onIdChange={setPostId}
        reason={reason}
        onReasonChange={setReason}
        onSubmit={() => banMutation.mutate()}
        isSubmitting={banMutation.isPending}
      />
    </>
  );
}
