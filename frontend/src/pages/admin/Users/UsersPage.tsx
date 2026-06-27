import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader, Table, TextInput } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconSearch, IconUsers, IconLogin2 } from "@tabler/icons-react";
import { useAdminUsers } from "@/hooks/useAdmin";
import { useImpersonateMutation } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/authStore";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { getErrorMessage } from "@/utils/error";
import shared from "@/styles/listPage.module.css";
import styles from "./UsersPage.module.css";

export function UsersPage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 300);

  const { data, isLoading, error } = useAdminUsers(debouncedSearch);

  const impersonate = useImpersonateMutation();

  const handleImpersonate = (userId: number) => {
    impersonate.mutate(userId, {
      onSuccess: () => navigate({ to: "/explore" }),
    });
  };

  const users = data?.items ?? [];

  return (
    <div className={shared.container}>
      <h1 className={shared.title}>Users</h1>

      <div className={shared.toolbar}>
        <div className={shared.toolbarLeft}>
          <span className={shared.count}>{data?.total ?? 0} total</span>
        </div>
        <TextInput
          placeholder="Search username or email"
          leftSection={<IconSearch size={14} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          className={styles.search}
        />
      </div>

      {impersonate.isError && (
        <Alert variant="error" title="Could not impersonate">
          {getErrorMessage(impersonate.error, "Failed to log in as user")}
        </Alert>
      )}

      {isLoading ? (
        <div className={shared.loading}>
          <Loader size="lg" />
        </div>
      ) : error ? (
        <Alert variant="error" title="Error">
          {getErrorMessage(error, "Failed to load users")}
        </Alert>
      ) : users.length === 0 ? (
        <EmptyStateCard
          icon={<IconUsers size={24} />}
          title="No users"
          description={search ? "No users match your search." : "No users found."}
        />
      ) : (
        <div className={styles.tableWrap}>
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>User</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Roles</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {users.map((user) => {
                const isSelf = user.id === currentUser?.id;
                return (
                  <Table.Tr key={user.id}>
                    <Table.Td>
                      <div className={styles.userCell}>
                        <span className={styles.username}>{user.username}</span>
                        <span className={styles.fullName}>
                          {[user.first_name, user.last_name]
                            .filter(Boolean)
                            .join(" ")}
                        </span>
                      </div>
                    </Table.Td>
                    <Table.Td>{user.email_address}</Table.Td>
                    <Table.Td>
                      <div className={styles.badges}>
                        {user.is_admin && (
                          <StatusBadge label="Admin" color="violet" />
                        )}
                        {user.is_seller && (
                          <StatusBadge label="Seller" color="blue" />
                        )}
                        {!user.email_verified && (
                          <StatusBadge label="Unverified" color="orange" />
                        )}
                      </div>
                    </Table.Td>
                    <Table.Td className={styles.actionCell}>
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<IconLogin2 size={14} />}
                        onClick={() => handleImpersonate(user.id)}
                        disabled={isSelf || impersonate.isPending}
                        title={
                          isSelf ? "You can't impersonate yourself" : undefined
                        }
                      >
                        Impersonate
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </div>
      )}
    </div>
  );
}
