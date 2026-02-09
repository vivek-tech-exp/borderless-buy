"use client";

import { useState } from "react";
import type { WishlistItem, CountryCode } from "@/types";
import { COUNTRY_CODES, COUNTRY_LABELS } from "@/types";
import { useCurrency } from "@/app/lib/currency-context";
import { formatCurrency } from "@/app/lib/utils";
import { Card, CardContent, CardHeader } from "@/app/components/ui/card";
import { ITEM_CHART_COLORS } from "@/app/lib/constants";

interface WishlistCardProps {
  item: WishlistItem;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onRemove?: (id: string) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  isHovered?: boolean;
}

export function WishlistCard({
  item,
  selected,
  onToggleSelect,
  onRemove,
  onMouseEnter,
  onMouseLeave,
  isHovered,
}: WishlistCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const { convertToPreferred, preferredCurrency, rates } = useCurrency();
  const { product } = item;

  const pricesByCountry = COUNTRY_CODES.map((code) => {
    const p = product.pricing[code];
    if (!p)
      return {
        code,
        label: COUNTRY_LABELS[code],
        originalPrice: null as number | null,
        originalCurrency: undefined as string | undefined,
        convertedPrice: null as number | null,
        convertedValid: false,
        priceSource: undefined,
        buyingLink: undefined,
        stockStatus: "unknown" as const,
        notes: undefined as string | undefined,
      };

    const converted = p.price !== null ? convertToPreferred(p.price, p.currency) : null;
    const convertedValid = p.price !== null && !!rates.rates[p.currency] && !!rates.rates[preferredCurrency] && !rates.error;

    return {
      code,
      label: COUNTRY_LABELS[code],
      originalPrice: p.price,
      originalCurrency: p.currency,
      convertedPrice: converted,
      convertedValid,
      priceSource: p.priceSource,
      buyingLink: p.buyingLink,
      stockStatus: p.stockStatus || "unknown",
      notes: p.notes,
    };
  });

  const withConverted = pricesByCountry.filter(
    (r): r is typeof r & { convertedPrice: number; convertedValid: true } =>
      r.convertedPrice != null && (r as any).convertedValid === true
  );
  const best = withConverted.length
    ? withConverted.reduce((a, b) => (a.convertedPrice <= b.convertedPrice ? a : b))
    : null;

  return (
    <Card
      className={`overflow-hidden transition-all ${
        isHovered ? "ring-2 ring-emerald-500/50" : ""
      }`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(item.id)}
            className="mt-1 h-5 w-5 rounded border-zinc-600 bg-zinc-800 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            aria-label={`Select ${product.displayName}`}
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-zinc-100 leading-snug">
              {product.displayName}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">{product.name}</p>
          </div>
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="shrink-0 text-zinc-600 hover:text-red-400 transition-colors"
              title="Remove item"
              aria-label="Remove"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Best Price Highlight */}
        {best && (
          <div className="mb-5 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border border-emerald-500/30">
            <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium mb-1">
              Best Price
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-emerald-400">
                {formatCurrency(best.convertedPrice, preferredCurrency, { maxFractionDigits: 0 })}
              </span>
              <span className="text-sm text-zinc-400">
                in {best.label}
              </span>
            </div>
          </div>
        )}

        {/* Country Grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {pricesByCountry.map((row) => {
            const isBest = best?.code === row.code;
            const color = ITEM_CHART_COLORS[row.code];
            const hasPrice = row.convertedValid && row.convertedPrice != null;

            return (
              <div
                key={row.code}
                className={`p-3 rounded-lg border transition-all ${
                  isBest
                    ? "border-emerald-500/50 bg-emerald-500/10"
                    : "border-zinc-700/50 bg-zinc-800/50 hover:border-zinc-600/70 hover:bg-zinc-800/70"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                  <span className="text-xs font-medium text-zinc-400 truncate">
                    {row.label}
                  </span>
                </div>
                <p className={`text-sm font-semibold tabular-nums ${
                  hasPrice ? "text-zinc-100" : "text-zinc-600"
                }`}>
                  {hasPrice
                    ? formatCurrency(row.convertedPrice!, preferredCurrency, { maxFractionDigits: 0 })
                    : "Not available"}
                </p>
                {row.stockStatus && row.stockStatus !== "unknown" && (
                  <p className="text-[10px] text-zinc-500 mt-1">
                    {row.stockStatus === "in_stock" && "✓ In stock"}
                    {row.stockStatus === "out_of_stock" && "✗ Out of stock"}
                    {row.stockStatus === "preorder" && "⏳ Preorder"}
                  </p>
                )}
                {row.buyingLink && hasPrice && (
                  <a
                    href={row.buyingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-emerald-500 hover:text-emerald-400 transition-colors mt-1.5 inline-block"
                  >
                    Shop →
                  </a>
                )}
              </div>
            );
          })}
        </div>

        {/* Details Toggle */}
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="w-full text-xs text-zinc-500 hover:text-zinc-400 transition-colors py-2 text-center border-t border-zinc-800/50 mt-2 -mx-4 -mb-4 px-4"
        >
          {showDetails ? "Hide details" : "View all prices & sources"}
        </button>

        {/* Expanded Details */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t border-zinc-800/50 space-y-3">
            {pricesByCountry.map((row) => {
              const color = ITEM_CHART_COLORS[row.code];
              return (
                <div key={row.code} className="text-sm">
                  <div className="flex items-start gap-2">
                    <span
                      className="h-2 w-2 rounded-full shrink-0 mt-1"
                      style={{ backgroundColor: color }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-zinc-300">{row.label}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {row.originalPrice
                          ? formatCurrency(row.originalPrice, row.originalCurrency!)
                          : "Not available"}
                        {row.priceSource && ` • ${row.priceSource}`}
                      </p>
                      {row.stockStatus && row.stockStatus !== "unknown" && (
                        <p className="text-xs text-zinc-600 mt-1">
                          {row.stockStatus === "in_stock" && "✓ In stock"}
                          {row.stockStatus === "out_of_stock" && "✗ Out of stock"}
                          {row.stockStatus === "preorder" && "⏳ Preorder"}
                        </p>
                      )}
                      {row.notes && (
                        <p className="text-xs text-amber-600 mt-1">💡 {row.notes}</p>
                      )}
                      {row.buyingLink && (
                        <a
                          href={row.buyingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-emerald-500 hover:text-emerald-400 mt-1.5 inline-block"
                        >
                          View on retailer →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
