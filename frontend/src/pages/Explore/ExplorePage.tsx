/**
 * ExplorePage - Browse listings (authenticated users)
 * Uses shared ExploreLayout component
 */

import { ExploreLayout } from "@/components/ExploreLayout";
import { ReportModal } from "@/components/ReportModal";
import { useReportModal } from "@/hooks/useReportModal";

export function ExplorePage() {
  const reportModal = useReportModal();

  return (
    <>
      <ExploreLayout onReportClick={reportModal.openReport} />

      {reportModal.target && (
        <ReportModal
          opened={reportModal.opened}
          onClose={reportModal.close}
          reportType={reportModal.target.reportType}
          entityId={reportModal.target.entityId}
          entityName={reportModal.target.entityName}
        />
      )}
    </>
  );
}
