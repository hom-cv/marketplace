/**
 * useReportModal - Hook for managing ReportModal state
 * Designed to be used in parent components to lift modal state from PostCard
 */

import { useState, useCallback } from "react";
import type { ReportType } from "@/api/types/admin";

export interface ReportTarget {
  reportType: ReportType;
  entityId: number;
  entityName: string;
}

export function useReportModal() {
  const [opened, setOpened] = useState(false);
  const [target, setTarget] = useState<ReportTarget | null>(null);

  const openReport = useCallback((newTarget: ReportTarget) => {
    setTarget(newTarget);
    setOpened(true);
  }, []);

  const close = useCallback(() => {
    setOpened(false);
  }, []);

  return { opened, target, openReport, close };
}
