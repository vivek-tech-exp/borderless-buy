import type { CountryCode } from "@/types";

export { COUNTRY_CODES, COUNTRY_LABELS, COUNTRY_CURRENCY } from "@/types";

export const PREFERRED_CURRENCY_KEY = "borderless-buy-preferred-currency";

export const CURRENCY_LABELS: Record<string, string> = {
  INR: "₹ INR",
  NPR: "NPR",
  USD: "$ USD",
  AED: "AED",
  CNY: "¥ CNY",
  KRW: "₩ KRW",
  EUR: "€ EUR",
  GBP: "£ GBP",
};

export const ITEM_CHART_COLORS: Record<CountryCode, string> = {
  IN: "#10b981",
  NP: "#8b5cf6",
  US: "#3b82f6",
  AE: "#f59e0b",
  CN: "#ef4444",
  KR: "#06b6d4",
};
