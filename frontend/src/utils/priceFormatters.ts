/**
 * Price formatting utilities for payment displays
 */

interface PriceBreakdownItem {
  item_price: number | null;
  shipping_cost: number | null;
  vat_amount: number | null;
  processing_fee: number | null;
  platform_fee: number | null;
}

/**
 * Formats a price breakdown string from payment data.
 * Converts values from satang (cents) to THB and formats the display string.
 * 
 * @param item - Object containing item_price, shipping_cost, and fee amounts (in satang)
 * @returns Formatted string like "Item ฿1,000 + Ship ฿50 + Fees ฿105.00"
 */
export function formatPriceBreakdown(item: PriceBreakdownItem): string {
  const itemPrice = (item.item_price ?? 0) / 100;
  const shippingCost = (item.shipping_cost ?? 0) / 100;
  const totalFees = ((item.vat_amount ?? 0) + (item.processing_fee ?? 0) + (item.platform_fee ?? 0)) / 100;
  const format = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const shippingText = shippingCost > 0 ? ` + Ship ฿${format(shippingCost)}` : "";
  return `Item ฿${format(itemPrice)}${shippingText} + Fees ฿${format(totalFees)}`;
}
