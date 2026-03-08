import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader,
  Select,
  NumberInput,
  CopyButton,
  Tooltip,
} from "@mantine/core";
import {
  IconPlus,
  IconCopy,
  IconCheck,
  IconChevronDown,
} from "@tabler/icons-react";
import { getInvites, generateInvites, revokeInvite } from "@/api/admin";
import type { InviteStatus } from "@/api/types/admin";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import shared from "@/styles/listPage.module.css";
import styles from "./InviteCodesPage.module.css";

const STATUS_BADGE: Record<InviteStatus, { label: string; color: "green" | "blue" | "red" }> = {
  active: { label: "Active", color: "green" },
  used: { label: "Used", color: "blue" },
  revoked: { label: "Revoked", color: "red" },
};

export function InviteCodesPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [generateCount, setGenerateCount] = useState<number>(1);
  const [expandedCode, setExpandedCode] = useState<string | null>(null);

  const { data: invitesData, isLoading, error } = useQuery({
    queryKey: ["admin-invites", statusFilter],
    queryFn: () => getInvites(statusFilter || undefined),
  });

  const generateMutation = useMutation({
    mutationFn: (count: number) => generateInvites(count),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-invites"] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (code: string) => revokeInvite(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-invites"] });
    },
  });

  if (isLoading) {
    return (
      <div className={shared.loading}>
        <Loader size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error" title="Error">
        {error instanceof Error ? error.message : "Failed to load invite codes"}
      </Alert>
    );
  }

  const invites = invitesData?.items ?? [];

  return (
    <div className={shared.container}>
      <h1 className={shared.title}>Invite Codes</h1>

      <div className={styles.generateCard}>
        <NumberInput
          value={generateCount}
          onChange={(val) => setGenerateCount(typeof val === "number" ? val : 1)}
          min={1}
          max={50}
          w={100}
          label="Count"
        />
        <Button
          variant="primary"
          size="sm"
          leftIcon={<IconPlus size={14} />}
          onClick={() => generateMutation.mutate(generateCount)}
          disabled={generateMutation.isPending}
        >
          {generateMutation.isPending ? "Generating..." : "Generate"}
        </Button>
      </div>

      <div className={styles.toolbar}>
        <Select
          placeholder="Filter by status"
          value={statusFilter}
          onChange={setStatusFilter}
          data={[
            { value: "", label: "All" },
            { value: "active", label: "Active" },
            { value: "used", label: "Used" },
            { value: "revoked", label: "Revoked" },
          ]}
          clearable
          w={180}
        />
        <span className={styles.count}>{invitesData?.total ?? 0} total</span>
      </div>

      {invites.length === 0 ? (
        <EmptyStateCard
          icon={<IconPlus size={24} />}
          title="No invite codes"
          description="Generate invite codes to allow new sellers to register."
        />
      ) : (
        <div className={shared.list}>
          {invites.map((invite) => {
            const isExpanded = expandedCode === invite.code;
            const badge = STATUS_BADGE[invite.status];

            return (
              <div key={invite.code} className={shared.item}>
                <button
                  type="button"
                  className={shared.row}
                  onClick={() => setExpandedCode(isExpanded ? null : invite.code)}
                  aria-expanded={isExpanded}
                >
                  <div className={shared.info}>
                    <div className={shared.topRow}>
                      <span className={styles.code}>{invite.code}</span>
                    </div>
                    <div className={shared.meta}>
                      <StatusBadge label={badge.label} color={badge.color} />
                      <span className={shared.date}>
                        {new Date(invite.created_date).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  <IconChevronDown
                    size={18}
                    className={`${shared.expandIcon} ${isExpanded ? shared.expandIconOpen : ""}`}
                    aria-hidden="true"
                  />
                </button>

                {isExpanded && (
                  <div className={shared.expandedContent}>
                    <div className={styles.copyRow}>
                      <span className={styles.codeFull}>{invite.code}</span>
                      <CopyButton value={invite.code}>
                        {({ copied, copy }) => (
                          <Tooltip label={copied ? "Copied" : "Copy"}>
                            <button
                              type="button"
                              onClick={copy}
                              className={styles.copyButton}
                            >
                              {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                            </button>
                          </Tooltip>
                        )}
                      </CopyButton>
                    </div>

                    <div className={styles.detailGrid}>
                      <div>
                        <p className={styles.detailLabel}>Created By</p>
                        <p className={styles.detailValue}>{invite.created_by_username || "-"}</p>
                      </div>
                      <div>
                        <p className={styles.detailLabel}>Created</p>
                        <p className={styles.detailValue}>
                          {new Date(invite.created_date).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      {invite.used_by_username && (
                        <>
                          <div>
                            <p className={styles.detailLabel}>Used By</p>
                            <p className={styles.detailValue}>{invite.used_by_username}</p>
                          </div>
                          {invite.used_at && (
                            <div>
                              <p className={styles.detailLabel}>Used At</p>
                              <p className={styles.detailValue}>
                                {new Date(invite.used_at).toLocaleDateString(undefined, {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {invite.status === "active" && (
                      <div className={styles.revokeButton}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => revokeMutation.mutate(invite.code)}
                          disabled={revokeMutation.isPending}
                        >
                          {revokeMutation.isPending ? "Revoking..." : "Revoke"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
