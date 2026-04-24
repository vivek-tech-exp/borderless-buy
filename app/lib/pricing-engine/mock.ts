import { upsertPricingCacheEntry } from "@/app/lib/pricing-cache";
import { isMeaningfulProductQuery, normalizeProductQuery } from "@/app/lib/product-query";
import type { CountryCode, Product } from "@/types";
import { COUNTRY_CODES, COUNTRY_CURRENCY } from "@/types";
import { BasePricingEngine, type PricingResult } from "./base";

const MOCK_MODEL = "mock-static-v1";

const COUNTRY_MULTIPLIERS: Record<CountryCode, number> = {
  US: 1,
  UK: 0.92,
  IN: 86,
  AE: 3.9,
  CN: 7.5,
  KR: 1370,
  JP: 151,
  DE: 0.96,
  AU: 1.58,
  HK: 8.1,
};

const MARKET_SOURCES: Record<CountryCode, string> = {
  US: "Best Buy",
  UK: "Currys",
  IN: "Croma",
  AE: "Amazon UAE",
  CN: "JD.com",
  KR: "Coupang",
  JP: "Yodobashi",
  DE: "MediaMarkt",
  AU: "JB Hi-Fi",
  HK: "Fortress",
};

function titleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function estimateBaseUsd(normalizedQuery: string): number {
  if (normalizedQuery.includes("iphone")) return 999;
  if (normalizedQuery.includes("macbook")) return 1599;
  if (normalizedQuery.includes("camera")) return 1299;
  if (normalizedQuery.includes("headphone") || normalizedQuery.includes("airpods")) return 249;
  if (normalizedQuery.includes("playstation") || normalizedQuery.includes("ps5")) return 499;
  if (normalizedQuery.includes("tesla") || normalizedQuery.includes("car")) return 39990;
  return 699;
}

function buildRetailerSearchUrl(countryCode: CountryCode, productName: string): string {
  const query = encodeURIComponent(productName);
  const hosts: Record<CountryCode, string> = {
    US: `https://www.bestbuy.com/site/searchpage.jsp?st=${query}`,
    UK: `https://www.currys.co.uk/search?q=${query}`,
    IN: `https://www.croma.com/searchB?q=${query}`,
    AE: `https://www.amazon.ae/s?k=${query}`,
    CN: `https://search.jd.com/Search?keyword=${query}`,
    KR: `https://www.coupang.com/np/search?q=${query}`,
    JP: `https://www.yodobashi.com/?word=${query}`,
    DE: `https://www.mediamarkt.de/de/search.html?query=${query}`,
    AU: `https://www.jbhifi.com.au/search?q=${query}`,
    HK: `https://www.fortress.com.hk/en/search?q=${query}`,
  };
  return hosts[countryCode];
}

function buildMockProduct(query: string, normalizedQuery: string): Product {
  const displayName = titleCase(normalizedQuery) || query.trim();
  const baseUsd = estimateBaseUsd(normalizedQuery);

  return {
    id: `mock-${normalizedQuery.replace(/\s+/g, "-")}`,
    name: normalizedQuery,
    displayName,
    category: normalizedQuery.includes("car") || normalizedQuery.includes("tesla") ? "vehicle" : "tech",
    carryOnFriendly: !(normalizedQuery.includes("car") || normalizedQuery.includes("tesla")),
    baselineConfiguration: "Mainstream retail configuration",
    selectionRationale: "Static demo pricing from the mock provider.",
    pricing: Object.fromEntries(
      COUNTRY_CODES.map((countryCode) => {
        const multiplier = COUNTRY_MULTIPLIERS[countryCode];
        const price = Math.round(baseUsd * multiplier);
        return [
          countryCode,
          {
            price,
            currency: COUNTRY_CURRENCY[countryCode],
            priceSource: MARKET_SOURCES[countryCode],
            buyingLink: buildRetailerSearchUrl(countryCode, displayName),
            stockStatus: "in_stock",
            notes: "Mock demo price.",
          },
        ];
      })
    ),
  };
}

export class MockPricingProvider extends BasePricingEngine {
  async performResolveProductPricing(query: string): Promise<PricingResult | null> {
    const normalizedQuery = normalizeProductQuery(query);

    if (!isMeaningfulProductQuery(normalizedQuery)) {
      return {
        error: "Enter a real product name to compare prices.",
        normalizedQuery,
        model: MOCK_MODEL,
      };
    }

    const product = buildMockProduct(query, normalizedQuery);
    const cachedProduct = await upsertPricingCacheEntry({
      normalizedQuery,
      rawQuery: query.trim(),
      product,
      model: MOCK_MODEL,
    });

    return {
      product: cachedProduct?.product ?? product,
      normalizedQuery,
      model: cachedProduct?.model ?? MOCK_MODEL,
      source: "fresh_ai",
      cacheAgeSeconds: cachedProduct?.ageSeconds ?? 0,
    };
  }
}
