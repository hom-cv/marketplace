import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { listUserBans, banUser, liftUserBan } from "@/api/admin";
import type { UserBanResponse } from "@/api/types/admin";
import {
  BanManagementTable,
  CreateBanModal,
  BanEntityType,
} from "@/components/BanManagement";

export function UserBansPage() {
  const queryClient = useQueryClient();
  const [activeOnly, setActiveOnly] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);
  const [userId, setUserId] = useState<number | undefined>();
  const [reason, setReason] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["userBans", activeOnly],
    queryFn: () => listUserBans({ active_only: activeOnly }),
  });

  const banMutation = useMutation({
    mutationFn: () => banUser({ user_id: userId!, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userBans"] });
      close();
      setUserId(undefined);
      setReason("");
    },
  });

  const liftMutation = useMutation({
    mutationFn: liftUserBan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userBans"] });
    },
  });

  return (
    <>
      <BanManagementTable<UserBanResponse>
        entityType={BanEntityType.User}
        items={data?.items}
        total={data?.total || 0}
        isLoading={isLoading}
        error={error}
        activeOnly={activeOnly}
        onActiveOnlyChange={setActiveOnly}
        columns={[
          {
            key: "user",
            label: "User",
            render: (ban) => <Text fw={500}>{ban.username}</Text>,
          },
          {
            key: "email",
            label: "Email",
            render: (ban) => ban.email,
          },
        ]}
        onCreateClick={open}
        onLiftBan={(banId) => liftMutation.mutate(banId)}
        isLiftingBan={liftMutation.isPending}
      />

      <CreateBanModal
        opened={opened}
        onClose={close}
        entityType={BanEntityType.User}
        idValue={userId}
        onIdChange={setUserId}
        reason={reason}
        onReasonChange={setReason}
        onSubmit={() => banMutation.mutate()}
        isSubmitting={banMutation.isPending}
      />
    </>
  );
}
