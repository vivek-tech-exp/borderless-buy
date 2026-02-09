"use client";

import { useState } from "react";
import { CheckCircleIcon, XCircleIcon, ClockIcon, LightBulbIcon, TrashIcon } from "@heroicons/react/24/outline";
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
            className="mt-1 h-5 w-5 rounded cursor-pointer"
            style={{borderColor: 'var(--border-primary)', backgroundColor: 'var(--input-bg)', color: 'var(--accent-primary)'}}
            aria-label={`Select ${product.displayName}`}
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold leading-snug" style={{color: 'var(--text-primary)'}}>
              {product.displayName}
            </h3>
            <div className="flex items-center gap-2 mt-1.5">
              <p className="text-xs" style={{color: 'var(--text-tertiary)'}}>{product.name}</p>
              <span className="inline-block px-2 py-0.5 text-xs rounded-full" style={{backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)'}}>
                {product.carryOnFriendly ? "🌍 Global Asset" : "🏠 Local Purchase"}
              </span>
            </div>
          </div>
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="shrink-0 transition-colors p-1"
              style={{color: 'var(--text-tertiary)'}}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
              title="Remove item"
              aria-label="Remove"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Best Price Highlight */}
        {best && (
          <div className="mb-5 p-4 rounded-xl border" style={{backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--accent-primary)', opacity: 0.8}}>
            <p className="text-xs uppercase tracking-wide font-medium mb-1" style={{color: 'var(--text-secondary)'}}>
              💰 Best Available Price
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold" style={{color: 'var(--accent-primary)'}}>
                {formatCurrency(best.convertedPrice, preferredCurrency, { maxFractionDigits: 0 })}
              </span>
              <span className="text-sm" style={{color: 'var(--text-secondary)'}}>
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
                className="p-3 rounded-lg border transition-all"
                style={{
                  backgroundColor: isBest ? 'var(--bg-secondary)' : 'var(--bg-secondary)',
                  borderColor: isBest ? 'var(--accent-primary)' : 'var(--border-primary)',
                  opacity: isBest ? 0.9 : 1,
                }}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                  <span className="text-xs font-medium truncate" style={{color: 'var(--text-secondary)'}}>
                    {row.label}
                  </span>
                </div>
                <p className="text-sm font-semibold tabular-nums" style={{color: hasPrice ? 'var(--text-primary)' : 'var(--text-tertiary)'}}>
                  {hasPrice
                    ? formatCurrency(row.convertedPrice!, preferredCurrency, { maxFractionDigits: 0 })
                    : "Not available"}
                </p>
                {row.stockStatus && row.stockStatus !== "unknown" && (
                  <p className="text-[10px] mt-1" style={{color: 'var(--text-tertiary)'}}>
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
                    className="text-[11px] transition-colors mt-1.5 inline-block"
                    style={{color: 'var(--accent-primary)'}}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--accent-primary)'}

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
          className="w-full text-xs transition-colors py-2 text-center border-t mt-2 -mx-4 -mb-4 px-4"
          style={{borderColor: 'var(--border-primary)', color: 'var(--text-tertiary)'}}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
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
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          {row.stockStatus === "in_stock" && (
                            <>
                              <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                              <span className="text-zinc-500">In stock</span>
                            </>
                          )}
                          {row.stockStatus === "out_of_stock" && (
                            <>
                              <XCircleIcon className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />
                              <span className="text-zinc-500">Out of stock</span>
                            </>
                          )}
                          {row.stockStatus === "preorder" && (
                            <>
                              <ClockIcon className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                              <span className="text-zinc-500">Preorder</span>
                            </>
                          )}
                        </div>
                      )}
                      {row.notes && (
                        <div className="flex items-start gap-2 mt-2">
                          <LightBulbIcon className="h-3.5 w-3.5 mt-0.5 text-amber-600 flex-shrink-0" />
                          <p className="text-xs text-amber-600">{row.notes}</p>
                        </div>
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
