/**
 * Shipping carrier and fulfillment status constants
 */

export const CARRIER_OPTIONS = [
  { value: "EMS", label: "EMS (Thailand Post)" },
  { value: "KEX", label: "Kerry Express" },
  { value: "FLASH_EXPRESS", label: "Flash Express" },
  { value: "J_AND_T", label: "J&T Express" },
];

export const CARRIER_LABELS: Record<string, string> = {
  ems: "EMS",
  kex: "Kerry",
  flash_express: "Flash",
  j_and_t: "J&T",
};

export const CARRIER_COLORS: Record<string, string> = {
  ems: "blue",
  kex: "orange",
  flash_express: "yellow",
  j_and_t: "red",
};

export const FULFILLMENT_LABELS: Record<string, string> = {
  packing: "Packing",
  in_transit: "In Transit",
  delivered: "Delivered",
};

export const FULFILLMENT_COLORS: Record<string, string> = {
  packing: "orange",
  in_transit: "blue",
  delivered: "green",
};
