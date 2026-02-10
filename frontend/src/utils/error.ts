/**
 * Safely extracts error message from unknown error type.
 * Works with Error objects, API error responses, and unknown types.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message || fallback;
  }
  if (typeof error === "object" && error !== null) {
    if ("detail" in error && typeof error.detail === "string") {
      return error.detail;
    }
    if ("message" in error && typeof error.message === "string") {
      return error.message;
    }
  }
  if (typeof error === "string") {
    return error;
  }
  return fallback;
}
