import { COUNTRY_CODES, COUNTRY_LABELS, type CountryCode, type WishlistItem } from "@/types";

type ConvertedItem = {
  id: string;
  name: string;
  converted: number;
  priceSource?: string;
  buyingLink?: string;
};

type CountryTotal = {
  code: CountryCode;
  label: string;
  total: number;
  count: number;
};

type CountryItems = {
  code: CountryCode;
  label: string;
  items: ConvertedItem[];
};

export interface MarketSummary {
  totalItems: number;
  totalsByCountry: CountryTotal[];
  itemsByCountry: CountryItems[];
  bestMarket: CountryTotal | null;
  bestTotal: number;
  homeTotal: number;
  potentialSavings: number | null;
  marketList: CountryItems[];
  effectiveBestCode: CountryCode;
  effectiveCompareCode: CountryCode;
  effectiveBestMarket: CountryTotal | null;
  effectiveCompareMarket: CountryTotal | null;
  compareTotal: number;
  compareSavings: number | null;
  bestItems: ConvertedItem[];
  compareItems: ConvertedItem[];
}

type BuildMarketSummaryParams = {
  itemsForTotals: WishlistItem[];
  preferredCountry: CountryCode;
  selectedBestCode: CountryCode | null;
  selectedCompareCode: CountryCode | null;
  convertToPreferred: (amount: number, sourceCurrency: string) => number;
  coverageThreshold?: number;
};

function toCountryItems(
  itemsForTotals: WishlistItem[],
  convertToPreferred: (amount: number, sourceCurrency: string) => number
): CountryItems[] {
  return COUNTRY_CODES.map((code) => {
    const items = itemsForTotals.reduce<ConvertedItem[]>((accumulator, item) => {
      const pricing = item.product.pricing[code];
      if (!pricing || pricing.price === null) {
        return accumulator;
      }
      accumulator.push({
        id: item.id,
        name: item.product.displayName,
        converted: convertToPreferred(pricing.price, pricing.currency),
        priceSource: pricing.priceSource,
        buyingLink: pricing.buyingLink,
      });
      return accumulator;
    }, []);

    return { code, label: COUNTRY_LABELS[code], items };
  }).filter((entry) => entry.items.length > 0);
}

function toCountryTotals(
  itemsForTotals: WishlistItem[],
  convertToPreferred: (amount: number, sourceCurrency: string) => number
): CountryTotal[] {
  return COUNTRY_CODES.map((code) => {
    let count = 0;
    const total = itemsForTotals.reduce((sum, item) => {
      const pricing = item.product.pricing[code];
      if (!pricing || pricing.price === null) return sum;
      count += 1;
      return sum + convertToPreferred(pricing.price, pricing.currency);
    }, 0);

    return { code, label: COUNTRY_LABELS[code], total, count };
  });
}

export function buildMarketSummary({
  itemsForTotals,
  preferredCountry,
  selectedBestCode,
  selectedCompareCode,
  convertToPreferred,
  coverageThreshold = 0.8,
}: BuildMarketSummaryParams): MarketSummary {
  const totalItems = itemsForTotals.length;
  const totalsByCountry = toCountryTotals(itemsForTotals, convertToPreferred);
  const itemsByCountry = toCountryItems(itemsForTotals, convertToPreferred);

  const eligibleTotals = totalsByCountry.filter(
    (entry) => totalItems > 0 && entry.total > 0 && entry.count / totalItems >= coverageThreshold
  );
  const totalsForRanking = eligibleTotals.length > 0
    ? eligibleTotals
    : totalsByCountry.filter((entry) => entry.total > 0);

  const bestMarket = totalsForRanking.reduce<CountryTotal | null>(
    (best, entry) => (entry.total > 0 && (!best || entry.total < best.total) ? entry : best),
    null
  );
  const bestTotal = bestMarket?.total ?? 0;
  const homeTotal = totalsByCountry.find((entry) => entry.code === preferredCountry)?.total ?? 0;
  const potentialSavings = bestTotal > 0 && homeTotal > 0 ? homeTotal - bestTotal : null;

  const eligibleMarketCodes = new Set(eligibleTotals.map((entry) => entry.code));
  const marketList = eligibleTotals.length > 0
    ? itemsByCountry.filter((entry) => eligibleMarketCodes.has(entry.code))
    : itemsByCountry;

  const availableCodes = new Set(marketList.map((entry) => entry.code));
  const effectiveBestCode = selectedBestCode && availableCodes.has(selectedBestCode)
    ? selectedBestCode
    : bestMarket?.code ?? preferredCountry;
  const effectiveCompareCode = selectedCompareCode && availableCodes.has(selectedCompareCode)
    ? selectedCompareCode
    : preferredCountry;

  const effectiveBestMarket = totalsByCountry.find((entry) => entry.code === effectiveBestCode) ?? null;
  const effectiveCompareMarket = totalsByCountry.find((entry) => entry.code === effectiveCompareCode) ?? null;
  const compareTotal = effectiveCompareMarket?.total ?? 0;
  const compareSavings = bestTotal > 0 && compareTotal > 0 ? compareTotal - bestTotal : null;
  const bestItems = itemsByCountry.find((entry) => entry.code === effectiveBestCode)?.items ?? [];
  const compareItems = itemsByCountry.find((entry) => entry.code === effectiveCompareCode)?.items ?? [];

  return {
    totalItems,
    totalsByCountry,
    itemsByCountry,
    bestMarket,
    bestTotal,
    homeTotal,
    potentialSavings,
    marketList,
    effectiveBestCode,
    effectiveCompareCode,
    effectiveBestMarket,
    effectiveCompareMarket,
    compareTotal,
    compareSavings,
    bestItems,
    compareItems,
  };
}
