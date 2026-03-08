import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader, Select, Textarea } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconFlag,
  IconChevronDown,
  IconTrash,
  IconUserCancel,
} from "@tabler/icons-react";
import { getReports, reviewReport, banUser, banPost } from "@/api/admin";
import type { ReportStatus, ReportType } from "@/api/types/admin";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { formatShortDate } from "@/utils/date";
import shared from "@/styles/listPage.module.css";
import styles from "./ReportsPage.module.css";

const STATUS_BADGE: Record<ReportStatus, { label: string; color: "orange" | "blue" | "green" | "gray" }> = {
  pending: { label: "Pending", color: "orange" },
  reviewed: { label: "Reviewed", color: "blue" },
  resolved: { label: "Resolved", color: "green" },
  dismissed: { label: "Dismissed", color: "gray" },
};

const TYPE_BADGE: Record<ReportType, { label: string; color: "violet" | "blue" }> = {
  user: { label: "USER", color: "violet" },
  post: { label: "POST", color: "blue" },
};

const REASON_LABELS: Record<string, string> = {
  counterfeit: "Counterfeit",
  abuse_of_system: "Abuse of System",
  prohibited_item: "Prohibited Item",
  scam: "Scam",
};

function buildBanReason(notes: string, reportReason: string, fallback: string): string {
  return `Report: ${notes.trim() || REASON_LABELS[reportReason] || fallback}`;
}

export function ReportsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const { data: reportsData, isLoading, error } = useQuery({
    queryKey: ["admin-reports", statusFilter, typeFilter],
    queryFn: () => getReports(statusFilter || undefined, typeFilter || undefined),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ reportId, status }: { reportId: number; status: "reviewed" | "resolved" | "dismissed" }) =>
      reviewReport(reportId, { status, admin_notes: adminNotes.trim() || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });

      setExpandedId(null);
      setAdminNotes("");
    },
  });

  const banUserMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: number; reason: string }) =>
      banUser({ user_id: userId, reason }),
    onSuccess: () => {
      notifications.show({ title: "User Banned", message: "The user has been banned.", color: "red" });
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-bans"] });
    },
    onError: (err: Error) => {
      notifications.show({ title: "Ban Failed", message: err.message, color: "red" });
    },
  });

  const banPostMutation = useMutation({
    mutationFn: ({ postId, reason }: { postId: number; reason: string }) =>
      banPost({ post_id: postId, reason }),
    onSuccess: () => {
      notifications.show({ title: "Listing Removed", message: "The listing has been removed.", color: "red" });
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin-post-bans"] });
    },
    onError: (err: Error) => {
      notifications.show({ title: "Removal Failed", message: err.message, color: "red" });
    },
  });

  const handleExpandToggle = (reportId: number) => {
    if (expandedId === reportId) {
      setExpandedId(null);
      setAdminNotes("");
    } else {
      setExpandedId(reportId);
      const report = reportsData?.items.find((r) => r.id === reportId);
      setAdminNotes(report?.admin_notes || "");
    }
  };

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
        {error instanceof Error ? error.message : "Failed to load reports"}
      </Alert>
    );
  }

  const reports = reportsData?.items ?? [];

  return (
    <div className={shared.container}>
      <h1 className={shared.title}>Reports</h1>

      <div className={styles.toolbar}>
        <Select
          placeholder="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          data={[
            { value: "", label: "All Statuses" },
            { value: "pending", label: "Pending" },
            { value: "reviewed", label: "Reviewed" },
            { value: "resolved", label: "Resolved" },
            { value: "dismissed", label: "Dismissed" },
          ]}
          clearable
          w={160}
        />
        <Select
          placeholder="Type"
          value={typeFilter}
          onChange={setTypeFilter}
          data={[
            { value: "", label: "All Types" },
            { value: "user", label: "User" },
            { value: "post", label: "Listing" },
          ]}
          clearable
          w={140}
        />
        <span className={styles.count}>{reportsData?.total ?? 0} total</span>
      </div>

      {reports.length === 0 ? (
        <EmptyStateCard
          icon={<IconFlag size={24} />}
          title="No reports"
          description="No reports match the current filters."
        />
      ) : (
        <div className={shared.list}>
          {reports.map((report) => {
            const isExpanded = expandedId === report.id;
            const statusBadge = STATUS_BADGE[report.status];
            const typeBadge = TYPE_BADGE[report.report_type];
            const targetName = report.report_type === "user"
              ? report.reported_username
              : report.reported_post_title;

            return (
              <div key={report.id} className={shared.item}>
                <button
                  type="button"
                  className={shared.row}
                  onClick={() => handleExpandToggle(report.id)}
                  aria-expanded={isExpanded}
                >
                  <div className={shared.info}>
                    <div className={shared.topRow}>
                      <span className={styles.rowTarget}>
                        <StatusBadge label={typeBadge.label} color={typeBadge.color} />
                        {targetName}
                      </span>
                      <StatusBadge label={statusBadge.label} color={statusBadge.color} />
                    </div>
                    <div className={shared.meta}>
                      <span className={styles.rowReporter}>
                        by {report.reporter_username || "anonymous"}
                      </span>
                      <span className={shared.date}>
                        {formatShortDate(report.created_date)}
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
                    <div className={styles.detailGrid}>
                      <div>
                        <p className={shared.detailLabel}>Reason</p>
                        <p className={shared.detailValue}>
                          {REASON_LABELS[report.reason] || report.reason}
                        </p>
                      </div>
                      <div>
                        <p className={shared.detailLabel}>Description</p>
                        <p className={styles.detailValueWrap}>{report.description}</p>
                      </div>
                    </div>

                    {report.admin_notes && report.status !== "pending" && (
                      <div className={styles.adminNotesCard}>
                        <p className={styles.adminNotesLabel}>Admin Notes</p>
                        <p className={styles.adminNotesText}>{report.admin_notes}</p>
                        {report.reviewed_by_username && (
                          <p className={styles.adminNotesReviewer}>
                            Reviewed by {report.reviewed_by_username}
                          </p>
                        )}
                      </div>
                    )}

                    {report.status === "pending" && (
                      <div className={styles.pendingActions}>
                        <Textarea
                          label="Admin Notes"
                          placeholder="Add notes about your decision (optional)..."
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.currentTarget.value)}
                          rows={2}
                        />

                        <div>
                          <p className={styles.actionsLabel}>Moderation</p>
                          <div className={styles.moderationRow}>
                            {report.report_type === "user" && report.reported_user_id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                leftIcon={<IconUserCancel size={14} />}
                                onClick={() =>
                                  banUserMutation.mutate({
                                    userId: report.reported_user_id!,
                                    reason: buildBanReason(adminNotes, report.reason, "Rules violation"),
                                  })
                                }
                                disabled={report.is_user_banned || banUserMutation.isPending}
                              >
                                {report.is_user_banned ? "User Banned" : "Ban User"}
                              </Button>
                            )}
                            {report.report_type === "post" && report.reported_post_id && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  leftIcon={<IconTrash size={14} />}
                                  onClick={() =>
                                    banPostMutation.mutate({
                                      postId: report.reported_post_id!,
                                      reason: buildBanReason(adminNotes, report.reason, "Inappropriate content"),
                                    })
                                  }
                                  disabled={report.is_post_banned || banPostMutation.isPending}
                                >
                                  {report.is_post_banned ? "Listing Removed" : "Remove Listing"}
                                </Button>
                                {report.reported_user_id && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    leftIcon={<IconUserCancel size={14} />}
                                    onClick={() =>
                                      banUserMutation.mutate({
                                        userId: report.reported_user_id!,
                                        reason: buildBanReason(adminNotes, report.reason, "Rules violation"),
                                      })
                                    }
                                    disabled={report.is_user_banned || banUserMutation.isPending}
                                  >
                                    {report.is_user_banned ? "User Banned" : "Ban User"}
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        <div className={styles.resolutionRow}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => reviewMutation.mutate({ reportId: report.id, status: "dismissed" })}
                            disabled={reviewMutation.isPending}
                          >
                            Dismiss
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => reviewMutation.mutate({ reportId: report.id, status: "reviewed" })}
                            disabled={reviewMutation.isPending}
                          >
                            Mark Reviewed
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => reviewMutation.mutate({ reportId: report.id, status: "resolved" })}
                            disabled={reviewMutation.isPending}
                          >
                            Resolve
                          </Button>
                        </div>
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
