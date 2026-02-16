"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ClockIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { CountryCode, CountryPricing, Product, WishlistItem } from "@/types";
import { COUNTRY_CODES, COUNTRY_LABELS } from "@/types";
import { useCurrency } from "@/app/lib/currency-context";
import { formatCurrency } from "@/app/lib/utils";
import { Card, CardContent, CardHeader } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";

function getGoogleSearchUrl(query: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function normalizePriceSource(source?: string) {
  if (!source) return "Buy";
  const lowered = source.toLowerCase();
  if (lowered.includes("unable to find") || lowered.includes("no direct") || lowered.includes("search result")) {
    return "Store search";
  }
  return source;
}

export type ViewMode = "local" | "global";

interface WishlistCardProps {
  item: WishlistItem;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onRemove?: (id: string) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  isHovered?: boolean;
  viewMode?: ViewMode;
  incomeAmount?: number;
  onIncomeFocus?: () => void;
  onUpdateTag?: (id: string, tag: string | null) => void;
  availableTags?: string[];
}

type PriceRow = {
  code: CountryCode;
  label: string;
  originalPrice: number | null;
  originalCurrency: string | undefined;
  convertedPrice: number | null;
  convertedValid: boolean;
  priceSource: string | undefined;
  buyingLink: string | undefined;
  stockStatus: NonNullable<CountryPricing["stockStatus"]>;
  notes: string | undefined;
};

type ConvertedPriceRow = PriceRow & {
  convertedPrice: number;
  convertedValid: true;
};

type LogisticsQueries = {
  powerQuery: string | null;
  warrantyQuery: string | null;
  carryOnQuery: string | null;
};

function createMissingPriceRow(code: CountryCode): PriceRow {
  return {
    code,
    label: COUNTRY_LABELS[code],
    originalPrice: null,
    originalCurrency: undefined,
    convertedPrice: null,
    convertedValid: false,
    priceSource: undefined,
    buyingLink: undefined,
    stockStatus: "unknown",
    notes: undefined,
  };
}

function createPriceRow(params: {
  code: CountryCode;
  pricing: Product["pricing"][CountryCode] | undefined;
  convertToPreferred: (amount: number, sourceCurrency: string) => number;
  ratesByCurrency: Record<string, number>;
  preferredCurrency: string;
  ratesError: boolean;
}): PriceRow {
  const { code, pricing, convertToPreferred, ratesByCurrency, preferredCurrency, ratesError } = params;
  if (pricing) {
    const convertedPrice = pricing.price === null ? null : convertToPreferred(pricing.price, pricing.currency);
    const ratesAvailable =
      Boolean(ratesByCurrency[pricing.currency]) &&
      Boolean(ratesByCurrency[preferredCurrency]) &&
      ratesError === false;
    const convertedValid = pricing.price === null ? false : ratesAvailable;

    return {
      code,
      label: COUNTRY_LABELS[code],
      originalPrice: pricing.price,
      originalCurrency: pricing.currency,
      convertedPrice,
      convertedValid,
      priceSource: pricing.priceSource,
      buyingLink: pricing.buyingLink,
      stockStatus: pricing.stockStatus || "unknown",
      notes: pricing.notes,
    };
  }

  return createMissingPriceRow(code);
}

function hasConvertedPrice(row: PriceRow): row is ConvertedPriceRow {
  return row.convertedPrice !== null && row.convertedValid;
}

function buildLeaderboardRows(
  sortedMarkets: ConvertedPriceRow[],
  preferredCountry: CountryCode,
  maxRanks = 9
): ConvertedPriceRow[] {
  const homeInSorted = sortedMarkets.find((row) => row.code === preferredCountry) ?? null;
  const withoutHome = sortedMarkets.filter((row) => row.code !== preferredCountry);
  if (!homeInSorted) {
    return withoutHome.slice(0, maxRanks);
  }
  return [...withoutHome.slice(0, maxRanks - 1), homeInSorted];
}

function isLeaderboardAtEnd(element: HTMLDivElement): boolean {
  const noScroll = element.scrollHeight <= element.clientHeight + 1;
  const atEnd = element.scrollTop + element.clientHeight >= element.scrollHeight - 1;
  return noScroll || atEnd;
}

function buildLogisticsQueries(params: {
  productName: string;
  productCategory: Product["category"];
  bestCountryName: string | undefined;
  homeCountryName: string;
}): LogisticsQueries {
  const { productName, productCategory, bestCountryName, homeCountryName } = params;
  const supportsPowerCheck = productCategory === "tech";
  const powerQuery =
    supportsPowerCheck && bestCountryName
      ? `Does ${productName} bought in ${bestCountryName} work in ${homeCountryName} voltage?`
      : null;
  const warrantyQuery = bestCountryName
    ? `Does ${productName} have global warranty if bought in ${bestCountryName} for ${homeCountryName}?`
    : null;
  const carryOnQuery = bestCountryName ? `Is ${productName} allowed in carry-on flight luggage?` : null;

  return { powerQuery, warrantyQuery, carryOnQuery };
}

function toPositiveIncome(incomeAmount?: number): number | null {
  if (typeof incomeAmount !== "number" || !Number.isFinite(incomeAmount) || incomeAmount <= 0) {
    return null;
  }
  return incomeAmount;
}

function resolveEffectivePrice(params: {
  viewMode: ViewMode;
  hasHomePrice: boolean;
  homeConvertedPrice: number | null;
  bestConvertedPrice: number | null;
}): number | null {
  const { viewMode, hasHomePrice, homeConvertedPrice, bestConvertedPrice } = params;
  if (viewMode === "local") {
    return hasHomePrice ? homeConvertedPrice : null;
  }
  return bestConvertedPrice;
}

function StoreSourceLink({ href, source }: Readonly<{ href: string; source: string }>) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 text-xs"
      style={{ color: "var(--accent-primary)" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--accent-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "var(--accent-primary)";
      }}
    >
      <span className="min-w-0 flex-1 truncate">{normalizePriceSource(source)}</span>
      <span aria-hidden>↗</span>
    </a>
  );
}

function LocalModeBody(props: Readonly<{
  preferredCountry: CountryCode;
  preferredCurrency: string;
  homeCountryData: PriceRow | undefined;
  hasHomePrice: boolean;
  incomeRatioLabel: string | null;
  onIncomeFocus?: () => void;
  bestMarket: ConvertedPriceRow | null;
}>) {
  const {
    preferredCountry,
    preferredCurrency,
    homeCountryData,
    hasHomePrice,
    incomeRatioLabel,
    onIncomeFocus,
    bestMarket,
  } = props;
  const localConvertedPrice = homeCountryData?.convertedPrice ?? null;
  const localBuyingLink = homeCountryData?.buyingLink;
  const showGlobalHint = Boolean(bestMarket && homeCountryData && homeCountryData.code !== bestMarket.code);

  return (
    <>
      <div
        className="mb-4 rounded-xl border p-5"
        style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}
      >
        <p className="mb-2 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
          🏠 {COUNTRY_LABELS[preferredCountry]} Price
        </p>
        {hasHomePrice && localConvertedPrice !== null ? (
          <>
            <div className="mb-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
                {formatCurrency(localConvertedPrice, preferredCurrency, { maxFractionDigits: 0 })}
              </span>
            </div>
            {incomeRatioLabel ? (
              <div
                className="mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
                style={{
                  borderColor: "var(--accent-primary)",
                  color: "var(--accent-primary)",
                  backgroundColor: "var(--bg-secondary)",
                }}
              >
                <ClockIcon className="h-3.5 w-3.5" />
                <span>About {incomeRatioLabel}</span>
              </div>
            ) : (
              <button
                type="button"
                className="text-xs transition-colors"
                style={{ color: "var(--accent-primary)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--accent-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--accent-primary)";
                }}
                onClick={onIncomeFocus}
              >
                Add income to see affordability
              </button>
            )}
            {localBuyingLink && (
              <a
                href={localBuyingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm font-medium transition-colors"
                style={{ color: "var(--accent-primary)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--accent-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--accent-primary)";
                }}
              >
                Buy now →
              </a>
            )}
          </>
        ) : (
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            Not available in {COUNTRY_LABELS[preferredCountry]}
          </p>
        )}
      </div>

      {showGlobalHint && (
        <div className="rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-tertiary)" }}>
          💡 Switch to Global View to see better value options in other countries
        </div>
      )}
    </>
  );
}

function BestValueTile(props: Readonly<{
  isHomeBest: boolean;
  bestMarket: ConvertedPriceRow | null;
  preferredCurrency: string;
  bestRatio: number | null;
}>) {
  const { isHomeBest, bestMarket, preferredCurrency, bestRatio } = props;

  return (
    <div
      className="relative rounded-lg border p-2.5 pt-6"
      style={{ borderColor: "var(--border-primary)", backgroundColor: "var(--bg-primary)" }}
    >
      <div className="absolute right-0 top-0">
        <div className="relative">
          <div className="rounded-bl-md px-2 py-1 text-[10px] uppercase tracking-wider text-white" style={{ backgroundColor: "var(--accent-primary)" }}>
            Best value
          </div>
          <div className="absolute right-0 top-full h-2 w-2" style={{ backgroundColor: "var(--accent-primary)" }} />
        </div>
      </div>
      {isHomeBest ? (
        <div className="flex h-full flex-col items-center justify-center py-3 text-center">
          <p className="text-lg font-semibold" style={{ color: "var(--accent-primary)" }}>
            Home wins
          </p>
        </div>
      ) : (
        <>
          <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
            {bestMarket ? bestMarket.label : "—"}
          </p>
          <p className="mt-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {bestMarket ? formatCurrency(bestMarket.convertedPrice, preferredCurrency, { maxFractionDigits: 0 }) : "—"}
          </p>
          {bestMarket?.priceSource && bestMarket?.buyingLink && (
            <div className="mt-1 max-w-full overflow-hidden">
              <StoreSourceLink href={bestMarket.buyingLink} source={bestMarket.priceSource} />
            </div>
          )}
          {bestRatio && (
            <p className="mt-0.5 text-xs" style={{ color: "var(--text-tertiary)" }}>
              {bestRatio.toFixed(2)}x income
            </p>
          )}
        </>
      )}
    </div>
  );
}

function HomePriceTile(props: Readonly<{
  preferredCountry: CountryCode;
  preferredCurrency: string;
  homeCountryData: PriceRow | undefined;
  hasHomePrice: boolean;
  homeRatio: number | null;
}>) {
  const { preferredCountry, preferredCurrency, homeCountryData, hasHomePrice, homeRatio } = props;
  const homeConvertedPrice = homeCountryData?.convertedPrice ?? null;
  const homeBuyingLink = homeCountryData?.buyingLink;
  const homePriceSource = homeCountryData?.priceSource;

  return (
    <div
      className="relative rounded-lg border p-2.5 pt-6"
      style={{ borderColor: "var(--border-primary)", backgroundColor: "var(--bg-primary)" }}
    >
      <div className="absolute right-0 top-0">
        <div className="relative">
          <div className="rounded-bl-md px-2 py-1 text-[10px] uppercase tracking-wider" style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
            Home price
          </div>
          <div className="absolute right-0 top-full h-2 w-2" style={{ backgroundColor: "var(--bg-tertiary)" }} />
        </div>
      </div>
      <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
        {COUNTRY_LABELS[preferredCountry]}
      </p>
      <p className="mt-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        {hasHomePrice && homeConvertedPrice !== null
          ? formatCurrency(homeConvertedPrice, preferredCurrency, { maxFractionDigits: 0 })
          : "—"}
      </p>
      {homePriceSource && homeBuyingLink && (
        <div className="mt-1 max-w-full overflow-hidden">
          <StoreSourceLink href={homeBuyingLink} source={homePriceSource} />
        </div>
      )}
      {homeRatio && (
        <p className="mt-0.5 text-xs" style={{ color: "var(--text-tertiary)" }}>
          {homeRatio.toFixed(2)}x income
        </p>
      )}
    </div>
  );
}

function GlobalFrontBody(props: Readonly<{
  hasPricing: boolean;
  savings: number | null;
  preferredCurrency: string;
  isHomeBest: boolean;
  bestMarket: ConvertedPriceRow | null;
  bestRatio: number | null;
  preferredCountry: CountryCode;
  homeCountryData: PriceRow | undefined;
  hasHomePrice: boolean;
  homeRatio: number | null;
  incomeRatioLabel: string | null;
  onIncomeFocus?: () => void;
  supportsPowerCheck: boolean;
  powerQuery: string | null;
  warrantyQuery: string | null;
  carryOnQuery: string | null;
  productCarryOnFriendly: boolean;
  onFlip: () => void;
}>) {
  const {
    hasPricing,
    savings,
    preferredCurrency,
    isHomeBest,
    bestMarket,
    bestRatio,
    preferredCountry,
    homeCountryData,
    hasHomePrice,
    homeRatio,
    incomeRatioLabel,
    onIncomeFocus,
    supportsPowerCheck,
    powerQuery,
    warrantyQuery,
    carryOnQuery,
    productCarryOnFriendly,
    onFlip,
  } = props;

  return (
    <div style={{ backfaceVisibility: "hidden" }}>
      <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl border p-3" style={{ borderColor: "var(--border-primary)", backgroundColor: "var(--bg-secondary)" }}>
          {!hasPricing && (
            <div className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              No pricing found. Try a more specific product name.
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
              Arbitrage
            </p>
            {savings != null && savings > 0 && (
              <span className="text-xs font-medium" style={{ color: "var(--accent-primary)" }}>
                Save {formatCurrency(savings, preferredCurrency, { maxFractionDigits: 0 })}
              </span>
            )}
          </div>
          {hasPricing && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <BestValueTile
                isHomeBest={isHomeBest}
                bestMarket={bestMarket}
                preferredCurrency={preferredCurrency}
                bestRatio={bestRatio}
              />
              <HomePriceTile
                preferredCountry={preferredCountry}
                preferredCurrency={preferredCurrency}
                homeCountryData={homeCountryData}
                hasHomePrice={hasHomePrice}
                homeRatio={homeRatio}
              />
            </div>
          )}
          {!incomeRatioLabel && hasPricing && (
            <button
              type="button"
              className="mt-2 text-xs transition-colors"
              style={{ color: "var(--accent-primary)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--accent-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--accent-primary)";
              }}
              onClick={onIncomeFocus}
            >
              Add income to compare affordability
            </button>
          )}
        </div>

        <div className="rounded-xl border p-3" style={{ borderColor: "var(--border-primary)", backgroundColor: "var(--bg-secondary)" }}>
          <p className="text-xs uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
            Logistics
          </p>
          <div className="mt-2 grid gap-2">
            {supportsPowerCheck && (
              <div className="flex items-center justify-between text-xs">
                <span>Power</span>
                {powerQuery ? (
                  <a
                    href={getGoogleSearchUrl(powerQuery)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline"
                  >
                    Ask AI ↗
                  </a>
                ) : (
                  <span style={{ color: "var(--text-tertiary)" }}>Check</span>
                )}
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span>Warranty</span>
              {warrantyQuery ? (
                <a
                  href={getGoogleSearchUrl(warrantyQuery)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline"
                >
                  Ask AI ↗
                </a>
              ) : (
                <span style={{ color: "var(--text-tertiary)" }}>Varies</span>
              )}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>Carry-on</span>
              {carryOnQuery ? (
                <a
                  href={getGoogleSearchUrl(carryOnQuery)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline"
                >
                  Ask AI ↗
                </a>
              ) : (
                <span style={{ color: productCarryOnFriendly ? "var(--accent-primary)" : "var(--text-tertiary)" }}>
                  {productCarryOnFriendly ? "Ready" : "Check"}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {hasPricing && (
        <button
          type="button"
          onClick={onFlip}
          className="-mx-4 -mb-4 mt-2 w-full border-t px-4 py-2 text-right text-xs transition-colors"
          style={{ borderColor: "var(--border-primary)", color: "var(--text-tertiary)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-tertiary)";
          }}
        >
          See all markets
        </button>
      )}
    </div>
  );
}

function LeaderboardRow(props: Readonly<{
  row: ConvertedPriceRow;
  index: number;
  bestMarket: ConvertedPriceRow | null;
  preferredCountry: CountryCode;
  showIncome: boolean;
  incomeAmount: number | null;
  preferredCurrency: string;
}>) {
  const { row, index, bestMarket, preferredCountry, showIncome, incomeAmount, preferredCurrency } = props;
  const isBest = bestMarket?.code === row.code;
  const isHome = row.code === preferredCountry;
  const diff = bestMarket ? row.convertedPrice - bestMarket.convertedPrice : null;
  const backgroundColor = isBest ? "rgba(16,185,129,0.10)" : "var(--bg-primary)";
  const borderColor = isHome && !isBest ? "#f59e0b" : "var(--border-primary)";

  let sourceNode: ReactNode = null;
  if (row.buyingLink) {
    sourceNode = (
      <a
        href={row.buyingLink}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex max-w-[140px] items-center gap-1 text-xs"
        style={{ color: "var(--accent-primary)" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--accent-hover)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--accent-primary)";
        }}
      >
        <span className="truncate">{normalizePriceSource(row.priceSource)}</span>
        <span aria-hidden>↗</span>
      </a>
    );
  } else if (row.priceSource) {
    sourceNode = (
      <span className="max-w-[140px] truncate text-xs" style={{ color: "var(--text-tertiary)" }}>
        {normalizePriceSource(row.priceSource)}
      </span>
    );
  }

  return (
    <div className="rounded-lg border px-3 py-1.5" style={{ backgroundColor, borderColor }}>
      <div className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2">
        <div className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
          {index + 1}.
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
              {row.label}
            </span>
            {isBest && (
              <span className="text-xs uppercase tracking-wider" style={{ color: "var(--accent-primary)" }}>
                Best
              </span>
            )}
            {isHome && !isBest && (
              <span className="text-xs uppercase tracking-wider" style={{ color: "#f59e0b" }}>
                Home
              </span>
            )}
          </div>
          <div className="flex flex-col gap-0.5 text-xs" style={{ color: "var(--text-tertiary)" }}>
            <div className="flex items-center gap-2">
              <span>{formatCurrency(row.convertedPrice, preferredCurrency, { maxFractionDigits: 0 })}</span>
              {diff != null && diff > 0 && <span>+{formatCurrency(diff, preferredCurrency, { maxFractionDigits: 0 })}</span>}
            </div>
            {showIncome && incomeAmount !== null && <span>{(row.convertedPrice / incomeAmount).toFixed(2)}x income</span>}
          </div>
        </div>
        <div className="flex min-w-[88px] flex-col items-end gap-1 text-right">{sourceNode}</div>
      </div>
    </div>
  );
}

function GlobalBackBody(props: Readonly<{
  leaderboardRef: React.RefObject<HTMLDivElement>;
  leaderboard: ConvertedPriceRow[];
  leaderboardAtEnd: boolean;
  onLeaderboardViewportChange: (element: HTMLDivElement) => void;
  bestMarket: ConvertedPriceRow | null;
  preferredCountry: CountryCode;
  showIncome: boolean;
  incomeAmount: number | null;
  preferredCurrency: string;
  onBack: () => void;
}>) {
  const {
    leaderboardRef,
    leaderboard,
    leaderboardAtEnd,
    onLeaderboardViewportChange,
    bestMarket,
    preferredCountry,
    showIncome,
    incomeAmount,
    preferredCurrency,
    onBack,
  } = props;

  return (
    <div className="absolute inset-0" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
      <div className="flex h-full flex-col pt-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
            Your market map
          </p>
          <button
            type="button"
            className="text-xs transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-tertiary)";
            }}
            onClick={onBack}
          >
            Back to summary
          </button>
        </div>
        <div
          className="relative min-h-0 flex-1 rounded-xl border p-2"
          style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}
        >
          <div
            ref={leaderboardRef}
            className="h-full space-y-2 overflow-y-auto pb-2 pr-1"
            onScroll={(e) => onLeaderboardViewportChange(e.currentTarget)}
          >
            {leaderboard.map((row, index) => (
              <LeaderboardRow
                key={row.code}
                row={row}
                index={index}
                bestMarket={bestMarket}
                preferredCountry={preferredCountry}
                showIncome={showIncome}
                incomeAmount={incomeAmount}
                preferredCurrency={preferredCurrency}
              />
            ))}
          </div>
          {!leaderboardAtEnd && (
            <div
              className="pointer-events-none absolute bottom-0 left-0 h-6 w-full"
              style={{ background: "linear-gradient(180deg, rgba(0,0,0,0), var(--bg-primary))" }}
              aria-hidden
            />
          )}
        </div>
      </div>
    </div>
  );
}

function GlobalModeBody(props: Readonly<{
  isFlipped: boolean;
  setIsFlipped: (flipped: boolean) => void;
  hasPricing: boolean;
  savings: number | null;
  preferredCurrency: string;
  isHomeBest: boolean;
  bestMarket: ConvertedPriceRow | null;
  bestRatio: number | null;
  preferredCountry: CountryCode;
  homeCountryData: PriceRow | undefined;
  hasHomePrice: boolean;
  homeRatio: number | null;
  incomeRatioLabel: string | null;
  onIncomeFocus?: () => void;
  supportsPowerCheck: boolean;
  logisticsQueries: LogisticsQueries;
  productCarryOnFriendly: boolean;
  leaderboardRef: React.RefObject<HTMLDivElement>;
  leaderboard: ConvertedPriceRow[];
  leaderboardAtEnd: boolean;
  onLeaderboardViewportChange: (element: HTMLDivElement) => void;
  showIncome: boolean;
  incomeAmount: number | null;
}>) {
  const {
    isFlipped,
    setIsFlipped,
    hasPricing,
    savings,
    preferredCurrency,
    isHomeBest,
    bestMarket,
    bestRatio,
    preferredCountry,
    homeCountryData,
    hasHomePrice,
    homeRatio,
    incomeRatioLabel,
    onIncomeFocus,
    supportsPowerCheck,
    logisticsQueries,
    productCarryOnFriendly,
    leaderboardRef,
    leaderboard,
    leaderboardAtEnd,
    onLeaderboardViewportChange,
    showIncome,
    incomeAmount,
  } = props;

  return (
    <div style={{ perspective: "1200px" }}>
      <div
        className="relative"
        style={{
          transformStyle: "preserve-3d",
          transition: "transform 500ms ease",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        <GlobalFrontBody
          hasPricing={hasPricing}
          savings={savings}
          preferredCurrency={preferredCurrency}
          isHomeBest={isHomeBest}
          bestMarket={bestMarket}
          bestRatio={bestRatio}
          preferredCountry={preferredCountry}
          homeCountryData={homeCountryData}
          hasHomePrice={hasHomePrice}
          homeRatio={homeRatio}
          incomeRatioLabel={incomeRatioLabel}
          onIncomeFocus={onIncomeFocus}
          supportsPowerCheck={supportsPowerCheck}
          powerQuery={logisticsQueries.powerQuery}
          warrantyQuery={logisticsQueries.warrantyQuery}
          carryOnQuery={logisticsQueries.carryOnQuery}
          productCarryOnFriendly={productCarryOnFriendly}
          onFlip={() => setIsFlipped(true)}
        />
        <GlobalBackBody
          leaderboardRef={leaderboardRef}
          leaderboard={leaderboard}
          leaderboardAtEnd={leaderboardAtEnd}
          onLeaderboardViewportChange={onLeaderboardViewportChange}
          bestMarket={bestMarket}
          preferredCountry={preferredCountry}
          showIncome={showIncome}
          incomeAmount={incomeAmount}
          preferredCurrency={preferredCurrency}
          onBack={() => setIsFlipped(false)}
        />
      </div>
    </div>
  );
}

function WishlistCardBody(props: Readonly<{
  viewMode: ViewMode;
  preferredCountry: CountryCode;
  preferredCurrency: string;
  homeCountryData: PriceRow | undefined;
  hasHomePrice: boolean;
  incomeRatioLabel: string | null;
  onIncomeFocus?: () => void;
  bestMarket: ConvertedPriceRow | null;
  isFlipped: boolean;
  setIsFlipped: (flipped: boolean) => void;
  hasPricing: boolean;
  savings: number | null;
  isHomeBest: boolean;
  bestRatio: number | null;
  homeRatio: number | null;
  supportsPowerCheck: boolean;
  logisticsQueries: LogisticsQueries;
  productCarryOnFriendly: boolean;
  leaderboardRef: React.RefObject<HTMLDivElement>;
  leaderboard: ConvertedPriceRow[];
  leaderboardAtEnd: boolean;
  onLeaderboardViewportChange: (element: HTMLDivElement) => void;
  showIncome: boolean;
  incomeAmount: number | null;
}>) {
  if (props.viewMode === "local") {
    return (
      <LocalModeBody
        preferredCountry={props.preferredCountry}
        preferredCurrency={props.preferredCurrency}
        homeCountryData={props.homeCountryData}
        hasHomePrice={props.hasHomePrice}
        incomeRatioLabel={props.incomeRatioLabel}
        onIncomeFocus={props.onIncomeFocus}
        bestMarket={props.bestMarket}
      />
    );
  }

  return (
    <GlobalModeBody
      isFlipped={props.isFlipped}
      setIsFlipped={props.setIsFlipped}
      hasPricing={props.hasPricing}
      savings={props.savings}
      preferredCurrency={props.preferredCurrency}
      isHomeBest={props.isHomeBest}
      bestMarket={props.bestMarket}
      bestRatio={props.bestRatio}
      preferredCountry={props.preferredCountry}
      homeCountryData={props.homeCountryData}
      hasHomePrice={props.hasHomePrice}
      homeRatio={props.homeRatio}
      incomeRatioLabel={props.incomeRatioLabel}
      onIncomeFocus={props.onIncomeFocus}
      supportsPowerCheck={props.supportsPowerCheck}
      logisticsQueries={props.logisticsQueries}
      productCarryOnFriendly={props.productCarryOnFriendly}
      leaderboardRef={props.leaderboardRef}
      leaderboard={props.leaderboard}
      leaderboardAtEnd={props.leaderboardAtEnd}
      onLeaderboardViewportChange={props.onLeaderboardViewportChange}
      showIncome={props.showIncome}
      incomeAmount={props.incomeAmount}
    />
  );
}

function WishlistCardHeader(props: Readonly<{
  item: WishlistItem;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onRemove?: (id: string) => void;
  isEditingTag: boolean;
  tagInput: string;
  availableTags: string[];
  onStartTagEdit: () => void;
  onTagInputChange: (value: string) => void;
  onSaveTag: () => void;
  onCancelTagEdit: () => void;
}>) {
  const {
    item,
    selected,
    onToggleSelect,
    onRemove,
    isEditingTag,
    tagInput,
    availableTags,
    onStartTagEdit,
    onTagInputChange,
    onSaveTag,
    onCancelTagEdit,
  } = props;
  const { product } = item;

  return (
    <CardHeader className="pb-3">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(item.id)}
          className="mt-1 h-5 w-5 cursor-pointer rounded"
          style={{ borderColor: "var(--border-primary)", backgroundColor: "var(--input-bg)", color: "var(--accent-primary)" }}
          aria-label={`Select ${product.displayName}`}
        />
        <div className="min-w-0 flex-1">
          <div className="group relative">
            <h3 className="text-base font-semibold leading-snug sm:truncate sm:text-lg" style={{ color: "var(--text-primary)" }}>
              {product.displayName}
            </h3>
            <div
              className="pointer-events-none absolute left-0 top-full z-10 mt-1 max-w-[280px] rounded-md border px-2 py-1 text-xs opacity-0 transition-opacity group-hover:opacity-100"
              style={{
                backgroundColor: "var(--bg-primary)",
                borderColor: "var(--border-primary)",
                color: "var(--text-secondary)",
              }}
            >
              {product.displayName}
            </div>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div className="group relative min-w-0 flex-1">
              <p className="text-xs sm:truncate" style={{ color: "var(--text-tertiary)" }}>
                {product.name}
              </p>
              <div
                className="pointer-events-none absolute left-0 top-full z-10 mt-1 max-w-[260px] rounded-md border px-2 py-1 text-xs opacity-0 transition-opacity group-hover:opacity-100"
                style={{
                  backgroundColor: "var(--bg-primary)",
                  borderColor: "var(--border-primary)",
                  color: "var(--text-tertiary)",
                }}
              >
                {product.name}
              </div>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {!isEditingTag && (
              <button
                type="button"
                onClick={onStartTagEdit}
                className="rounded-full border px-2.5 py-1 text-xs transition-colors"
                style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
              >
                {item.tag ? `Goal: ${item.tag}` : "Set goal"}
              </button>
            )}
            {isEditingTag && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onSaveTag();
                }}
                className="flex items-center gap-2"
              >
                <Input
                  type="text"
                  value={tagInput}
                  onChange={(e) => onTagInputChange(e.target.value)}
                  placeholder="Goal"
                  list={`goal-tags-${item.id}`}
                  className="h-8 w-36 px-3 py-1 text-xs"
                  aria-label="Goal tag"
                />
                <datalist id={`goal-tags-${item.id}`}>
                  {availableTags.map((tag) => (
                    <option key={tag} value={tag} />
                  ))}
                </datalist>
                <button
                  type="submit"
                  className="rounded-md px-2 py-1 text-xs transition-colors"
                  style={{ color: "var(--accent-primary)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--accent-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--accent-primary)";
                  }}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={onCancelTagEdit}
                  className="rounded-md px-2 py-1 text-xs transition-colors"
                  style={{ color: "var(--text-tertiary)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-tertiary)";
                  }}
                >
                  Cancel
                </button>
              </form>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="p-1 transition-colors"
              style={{ color: "var(--text-tertiary)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#ef4444";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-tertiary)";
              }}
              title="Remove item"
              aria-label="Remove"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          )}
          <span
            className="rounded-full border px-2 py-0.5 text-xs uppercase tracking-wider"
            style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-secondary)", borderColor: "var(--border-primary)" }}
            title={product.carryOnFriendly ? "Easy to buy abroad and carry home" : "Best purchased locally"}
          >
            {product.carryOnFriendly ? "Buy abroad" : "Buy local"}
          </span>
        </div>
      </div>
    </CardHeader>
  );
}

export function WishlistCard({
  item,
  selected,
  onToggleSelect,
  onRemove,
  onMouseEnter,
  onMouseLeave,
  isHovered,
  viewMode = "global",
  incomeAmount,
  onIncomeFocus,
  onUpdateTag,
  availableTags = [],
}: Readonly<WishlistCardProps>) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isEditingTag, setIsEditingTag] = useState(false);
  const [tagInput, setTagInput] = useState(item.tag ?? "");
  const [leaderboardAtEnd, setLeaderboardAtEnd] = useState(false);
  const leaderboardRef = useRef<HTMLDivElement>(null);
  const { convertToPreferred, preferredCurrency, preferredCountry, rates } = useCurrency();
  const { product } = item;

  const pricesByCountry = useMemo(
    () =>
      COUNTRY_CODES.map((code) =>
        createPriceRow({
          code,
          pricing: product.pricing[code],
          convertToPreferred,
          ratesByCurrency: rates.rates,
          preferredCurrency,
          ratesError: rates.error,
        })
      ),
    [product.pricing, convertToPreferred, rates.rates, rates.error, preferredCurrency]
  );

  const sortedMarkets = useMemo(
    () => pricesByCountry.filter(hasConvertedPrice).slice().sort((a, b) => a.convertedPrice - b.convertedPrice),
    [pricesByCountry]
  );
  const hasPricing = sortedMarkets.length > 0;
  const bestMarket = sortedMarkets[0] ?? null;
  const bestConvertedPrice = bestMarket?.convertedPrice ?? null;
  const homeCountryData = pricesByCountry.find((row) => row.code === preferredCountry);
  const homeConvertedPrice = homeCountryData?.convertedPrice ?? null;
  const hasHomePrice = Boolean(homeCountryData?.convertedValid && homeConvertedPrice !== null);
  const effectivePrice = resolveEffectivePrice({
    viewMode,
    hasHomePrice,
    homeConvertedPrice,
    bestConvertedPrice,
  });

  const positiveIncome = toPositiveIncome(incomeAmount);
  const showIncome = positiveIncome !== null;
  const incomeRatio = showIncome && effectivePrice !== null ? effectivePrice / positiveIncome : null;
  const incomeRatioLabel = incomeRatio ? `${incomeRatio.toFixed(2)}x your monthly income` : null;
  const bestRatio = showIncome && bestConvertedPrice !== null ? bestConvertedPrice / positiveIncome : null;
  const homeRatio = showIncome && homeConvertedPrice !== null ? homeConvertedPrice / positiveIncome : null;
  const savings =
    bestConvertedPrice !== null && homeConvertedPrice !== null
      ? homeConvertedPrice - bestConvertedPrice
      : null;
  const isHomeBest = bestMarket?.code != null && bestMarket.code === homeCountryData?.code;
  const leaderboard = useMemo(
    () => buildLeaderboardRows(sortedMarkets, preferredCountry),
    [sortedMarkets, preferredCountry]
  );

  const bestCountryName = bestMarket?.label;
  const homeCountryName = COUNTRY_LABELS[preferredCountry];
  const supportsPowerCheck = product.category === "tech";
  const logisticsQueries = buildLogisticsQueries({
    productName: product.displayName,
    productCategory: product.category,
    bestCountryName,
    homeCountryName,
  });

  const syncLeaderboardEndState = useCallback((element: HTMLDivElement) => {
    const next = isLeaderboardAtEnd(element);
    setLeaderboardAtEnd((previous) => (previous === next ? previous : next));
  }, []);

  useEffect(() => {
    const element = leaderboardRef.current;
    if (!element) return;
    syncLeaderboardEndState(element);
  }, [leaderboard.length, isFlipped, syncLeaderboardEndState]);

  const commitTag = () => {
    if (!onUpdateTag) {
      setIsEditingTag(false);
      return;
    }
    const trimmed = tagInput.trim();
    onUpdateTag(item.id, trimmed.length > 0 ? trimmed : null);
    setIsEditingTag(false);
  };

  const cancelTagEdit = () => {
    setTagInput(item.tag ?? "");
    setIsEditingTag(false);
  };

  return (
    <Card
      className={`w-full max-w-full overflow-hidden transition-all ${isHovered ? "ring-2 ring-emerald-500/50" : ""}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <WishlistCardHeader
        item={item}
        selected={selected}
        onToggleSelect={onToggleSelect}
        onRemove={onRemove}
        isEditingTag={isEditingTag}
        tagInput={tagInput}
        availableTags={availableTags}
        onStartTagEdit={() => {
          setTagInput(item.tag ?? "");
          setIsEditingTag(true);
        }}
        onTagInputChange={setTagInput}
        onSaveTag={commitTag}
        onCancelTagEdit={cancelTagEdit}
      />

      <CardContent className="pt-0">
        <WishlistCardBody
          viewMode={viewMode}
          preferredCountry={preferredCountry}
          preferredCurrency={preferredCurrency}
          homeCountryData={homeCountryData}
          hasHomePrice={hasHomePrice}
          incomeRatioLabel={incomeRatioLabel}
          onIncomeFocus={onIncomeFocus}
          bestMarket={bestMarket}
          isFlipped={isFlipped}
          setIsFlipped={setIsFlipped}
          hasPricing={hasPricing}
          savings={savings}
          isHomeBest={isHomeBest}
          bestRatio={bestRatio}
          homeRatio={homeRatio}
          supportsPowerCheck={supportsPowerCheck}
          logisticsQueries={logisticsQueries}
          productCarryOnFriendly={product.carryOnFriendly}
          leaderboardRef={leaderboardRef}
          leaderboard={leaderboard}
          leaderboardAtEnd={leaderboardAtEnd}
          onLeaderboardViewportChange={syncLeaderboardEndState}
          showIncome={showIncome}
          incomeAmount={positiveIncome}
        />
      </CardContent>
    </Card>
  );
}
