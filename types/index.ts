/** Supported countries (ISO-style codes used in API and UI) */
export const COUNTRY_CODES = [
  "IN",
  "NP",
  "US",
  "AE",
  "CN",
  "KR",
] as const;
export type CountryCode = (typeof COUNTRY_CODES)[number];

export const COUNTRY_LABELS: Record<CountryCode, string> = {
  IN: "India",
  NP: "Nepal",
  US: "USA",
  AE: "UAE Dubai",
  CN: "China",
  KR: "South Korea",
};

/** Currency codes we support for display and for pricing */
export const CURRENCY_CODES = [
  "INR",
  "NPR",
  "USD",
  "AED",
  "CNY",
  "KRW",
  "EUR",
  "GBP",
] as const;
export type CurrencyCode = (typeof CURRENCY_CODES)[number];

/** Default currency per country (for pricing source) */
export const COUNTRY_CURRENCY: Record<CountryCode, CurrencyCode> = {
  IN: "INR",
  NP: "NPR",
  US: "USD",
  AE: "AED",
  CN: "CNY",
  KR: "KRW",
};

/** Pricing for one country */
export interface CountryPricing {
  price: number;
  currency: string;
  priceSource: string;
  buyingLink: string;
}

/** Canonical product with pricing per country */
export interface Product {
  id: string;
  name: string;
  displayName: string;
  category: "tech" | "vehicle" | "other";
  carryOnFriendly: boolean;
  /** Pricing by country code; may be partial if not available */
  pricing: Partial<Record<CountryCode, CountryPricing>>;
}

/** Wishlist item: product + metadata. Costs derived client-side using FX rates. */
export interface WishlistItem {
  id: string;
  product: Product;
  createdAt: string;
}

/** FX rates: amount in base (USD) per 1 unit of currency. So rates.USD === 1. */
export interface Rates {
  base: "USD";
  rates: Record<string, number>;
  updatedAt: string;
}
