/**
 * Format a date string as "Jan 1, 2025".
 */
export function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
