import type { CountryCode } from "@/types";

export { COUNTRY_CODES, COUNTRY_LABELS, COUNTRY_CURRENCY } from "@/types";

export const PREFERRED_CURRENCY_KEY = "borderless-buy-preferred-currency";

export const CURRENCY_LABELS: Record<string, string> = {
  USD: "$ USD",
  GBP: "£ GBP",
  INR: "₹ INR",
  AED: "AED",
  CNY: "¥ CNY",
  KRW: "₩ KRW",
  JPY: "¥ JPY",
  EUR: "€ EUR",
  AUD: "A$ AUD",
  HKD: "HK$ HKD",
};

export const ITEM_CHART_COLORS: Record<CountryCode, string> = {
  US: "#3b82f6",
  UK: "#8b5cf6",
  IN: "#10b981",
  AE: "#f59e0b",
  CN: "#ef4444",
  KR: "#06b6d4",
  JP: "#ec4899",
  DE: "#14b8a6",
  AU: "#f97316",
  HK: "#6366f1",
};
