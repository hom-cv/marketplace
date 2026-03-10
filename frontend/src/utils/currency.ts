/**
 * Currency formatting utilities for THB/satang conversions.
 */

const SATANG_PER_BAHT = 100;

/** Convert satang (smallest unit) to THB. */
export function satangToThb(satang: number): number {
  return satang / SATANG_PER_BAHT;
}

/** Format a THB amount to 2 decimal places with locale grouping. */
export function formatThb(thb: number): string {
  return thb.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Convert satang to a formatted THB string. */
export function formatSatang(satang: number): string {
  return formatThb(satangToThb(satang));
}
