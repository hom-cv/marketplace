/**
 * Report-related mutation hooks
 */

import { useMutation } from "@tanstack/react-query";
import { submitReport, type ReportCreateRequest } from "@/api/reports";

export function useSubmitReportMutation(options?: {
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}) {
  return useMutation({
    mutationFn: (request: ReportCreateRequest) => submitReport(request),
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}
