/** Supported countries (ISO-style codes used in API and UI) */
export const COUNTRY_CODES = [
  "US",
  "UK",
  "IN",
  "AE",
  "CN",
  "KR",
  "JP",
  "DE",
  "AU",
  "HK",
] as const;
export type CountryCode = (typeof COUNTRY_CODES)[number];

export const COUNTRY_LABELS: Record<CountryCode, string> = {
  US: "USA",
  UK: "United Kingdom",
  IN: "India",
  AE: "UAE Dubai",
  CN: "China",
  KR: "South Korea",
  JP: "Japan",
  DE: "Germany",
  AU: "Australia",
  HK: "Hong Kong",
};

/** Currency codes we support for display and for pricing */
export const CURRENCY_CODES = [
  "USD",
  "GBP",
  "INR",
  "AED",
  "CNY",
  "KRW",
  "JPY",
  "EUR",
  "AUD",
  "HKD",
] as const;
export type CurrencyCode = (typeof CURRENCY_CODES)[number];

/** Default currency per country (for pricing source) */
export const COUNTRY_CURRENCY: Record<CountryCode, CurrencyCode> = {
  US: "USD",
  UK: "GBP",
  IN: "INR",
  AE: "AED",
  CN: "CNY",
  KR: "KRW",
  JP: "JPY",
  DE: "EUR",
  AU: "AUD",
  HK: "HKD",
};

/** Pricing for one country */
export interface CountryPricing {
  price: number | null;
  currency: string;
  priceSource: string;
  buyingLink: string;
  stockStatus?: "in_stock" | "out_of_stock" | "preorder" | "unknown";
  notes?: string;
}

/** Canonical product with pricing per country */
export interface Product {
  id: string;
  name: string;
  displayName: string;
  category: "tech" | "vehicle" | "other";
  carryOnFriendly: boolean;
  baselineConfiguration?: string;
  /** Pricing by country code; may be partial if not available */
  pricing: Partial<Record<CountryCode, CountryPricing>>;
}

/** Wishlist item: product + metadata. Costs derived client-side using FX rates. */
export interface WishlistItem {
  id: string;
  product: Product;
  tag?: string;
  createdAt: string;
}

/** FX rates: amount in base (USD) per 1 unit of currency. So rates.USD === 1. */
export interface Rates {
  base: "USD";
  rates: Record<string, number>;
  updatedAt: string;
}
