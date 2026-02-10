"use client";

import { useEffect, useState } from "react";
import { CheckCircleIcon, XCircleIcon, ClockIcon, LightBulbIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { WishlistItem } from "@/types";
import { COUNTRY_CODES, COUNTRY_LABELS } from "@/types";
import { useCurrency } from "@/app/lib/currency-context";
import { formatCurrency } from "@/app/lib/utils";
import { Card, CardContent, CardHeader } from "@/app/components/ui/card";
import { ITEM_CHART_COLORS } from "@/app/lib/constants";
import { Input } from "@/app/components/ui/input";

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
}: WishlistCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isEditingTag, setIsEditingTag] = useState(false);
  const [tagInput, setTagInput] = useState(item.tag ?? "");
  const [showRationale, setShowRationale] = useState(false);
  const { convertToPreferred, preferredCurrency, preferredCountry, rates } = useCurrency();
  const { product } = item;

  useEffect(() => {
    setTagInput(item.tag ?? "");
  }, [item.tag]);

  useEffect(() => {
    if (!product.isVagueQuery) {
      setShowRationale(false);
    }
  }, [product.isVagueQuery]);

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

  const homeCountryData = pricesByCountry.find((row) => row.code === preferredCountry);
  const hasHomePrice = homeCountryData?.convertedValid && homeCountryData.convertedPrice != null;

  const effectivePrice = viewMode === "local"
    ? (hasHomePrice ? homeCountryData!.convertedPrice! : null)
    : (best ? best.convertedPrice : null);
  const incomeRatio = incomeAmount && incomeAmount > 0 && effectivePrice
    ? effectivePrice / incomeAmount
    : null;
  const incomeRatioLabel = incomeRatio
    ? `${incomeRatio.toFixed(1)}x your monthly income`
    : null;

  const homeRow = pricesByCountry.find((row) => row.code === preferredCountry);
  const topMarkets = withConverted
    .slice()
    .sort((a, b) => a.convertedPrice - b.convertedPrice)
    .slice(0, 3);
  const flipMarkets = [homeRow, ...withConverted.filter((row) => row.code !== preferredCountry)]
    .filter(Boolean) as typeof pricesByCountry;
  const flipMarketsTop = flipMarkets
    .filter((row, index, arr) => arr.findIndex((r) => r.code === row.code) === index)
    .slice(0, 9);

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
            <div className="flex items-center justify-between gap-2 mt-1">
              <p className="text-[11px]" style={{color: 'var(--text-tertiary)'}}>{product.name}</p>
              <span
                className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider"
                style={{backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', borderColor: 'var(--border-primary)'}}
                title={product.carryOnFriendly ? "Easy to buy abroad and carry home" : "Best purchased locally"}
              >
                {product.carryOnFriendly ? "Buy abroad" : "Buy local"}
              </span>
            </div>
            {product.isVagueQuery && product.selectionRationale && (
              <div className="mt-1">
                <button
                  type="button"
                  className="text-xs underline decoration-dotted transition-colors"
                  style={{color: 'var(--text-tertiary)'}}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                  onClick={() => setShowRationale((prev) => !prev)}
                  aria-expanded={showRationale}
                  aria-controls={`rationale-${item.id}`}
                >
                  Why this pick?
                </button>
                {showRationale && (
                  <div
                    id={`rationale-${item.id}`}
                    className="mt-2 rounded-lg border p-3 text-xs"
                    style={{backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)'}}
                  >
                    {product.selectionRationale}
                  </div>
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {!isEditingTag && item.tag && (
                <button
                  type="button"
                  onClick={() => setIsEditingTag(true)}
                  className="text-xs rounded-full px-2 py-0.5 transition-colors"
                  style={{backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)'}}
                >
                  #{item.tag}
                </button>
              )}
              {!isEditingTag && !item.tag && onUpdateTag && (
                <button
                  type="button"
                  onClick={() => setIsEditingTag(true)}
                  className="text-xs transition-colors"
                  style={{color: 'var(--accent-primary)'}}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--accent-primary)'}
                >
                  + Add goal tag
                </button>
              )}
              {isEditingTag && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    commitTag();
                  }}
                  className="flex items-center gap-2"
                >
                  <Input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Goal tag"
                    list={`goal-tags-${item.id}`}
                    className="h-8 px-3 py-1 text-xs w-36"
                    aria-label="Goal tag"
                  />
                  <datalist id={`goal-tags-${item.id}`}>
                    {availableTags.map((tag) => (
                      <option key={tag} value={tag} />
                    ))}
                  </datalist>
                  <button
                    type="submit"
                    className="text-xs rounded-md px-2 py-1 transition-colors"
                    style={{color: 'var(--accent-primary)'}}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--accent-primary)'}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={cancelTagEdit}
                    className="text-xs rounded-md px-2 py-1 transition-colors"
                    style={{color: 'var(--text-tertiary)'}}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                  >
                    Cancel
                  </button>
                </form>
              )}
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
        {viewMode === "local" ? (
          /* Local Mode View */
          <>
            {/* Home Country Price - Prominent */}
            <div className="mb-4 p-5 rounded-xl border" style={{backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)'}}>
              <p className="text-xs uppercase tracking-wide font-medium mb-2" style={{color: 'var(--text-secondary)'}}>
                🏠 {COUNTRY_LABELS[preferredCountry]} Price
              </p>
              {hasHomePrice ? (
                <>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-bold" style={{color: 'var(--text-primary)'}}>
                      {formatCurrency(homeCountryData!.convertedPrice!, preferredCurrency, { maxFractionDigits: 0 })}
                    </span>
                  </div>
                  {incomeRatioLabel ? (
                    <div
                      className="mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium"
                      style={{borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', backgroundColor: 'var(--bg-secondary)'}}
                    >
                      <ClockIcon className="h-3.5 w-3.5" />
                      <span>About {incomeRatioLabel}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="text-xs transition-colors"
                      style={{color: 'var(--accent-primary)'}}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--accent-primary)'}
                      onClick={onIncomeFocus}
                    >
                      Add income to see affordability
                    </button>
                  )}
                  {homeCountryData!.buyingLink && (
                    <a
                      href={homeCountryData!.buyingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-sm font-medium transition-colors mt-2"
                      style={{color: 'var(--accent-primary)'}}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--accent-primary)'}
                    >
                      Buy now →
                    </a>
                  )}
                </>
              ) : (
                <p className="text-sm" style={{color: 'var(--text-tertiary)'}}>
                  Not available in {COUNTRY_LABELS[preferredCountry]}
                </p>
              )}
            </div>

            {/* Hint to switch to global view */}
            {best && homeCountryData?.code !== best.code && (
              <div className="px-3 py-2 rounded-lg text-xs" style={{backgroundColor: 'var(--bg-secondary)', color: 'var(--text-tertiary)'}}>
                💡 Switch to Global View to see cheaper options in other countries
              </div>
            )}
          </>
        ) : (
          /* Global Mode View */
          <>
            <div style={{ perspective: '1200px' }}>
              <div
                className="relative"
                style={{
                  transformStyle: 'preserve-3d',
                  transition: 'transform 500ms ease',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                {/* Front */}
                <div style={{ backfaceVisibility: 'hidden' }}>
                  {/* Best Price Highlight */}
                  {best && (
                    <div
                      className="mb-4 p-4 rounded-xl border"
                      style={{
                        background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.02))',
                        borderColor: 'var(--accent-primary)',
                        boxShadow: '0 10px 30px rgba(16, 185, 129, 0.12)',
                      }}
                    >
                      <p className="text-xs uppercase tracking-wide font-medium mb-1" style={{color: 'var(--text-secondary)'}}>
                        💰 Best Available Price
                      </p>
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-[32px] font-bold" style={{color: 'var(--accent-primary)'}}>
                          {formatCurrency(best.convertedPrice, preferredCurrency, { maxFractionDigits: 0 })}
                        </span>
                        <span className="text-sm" style={{color: 'var(--text-secondary)'}}>
                          in {best.label}
                        </span>
                        {incomeRatioLabel && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-medium"
                            style={{borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', backgroundColor: 'var(--bg-secondary)'}}
                          >
                            <ClockIcon className="h-3 w-3" />
                            {incomeRatioLabel.replace(" your monthly income", "")}
                          </span>
                        )}
                      </div>
                      {!incomeRatioLabel && (
                        <button
                          type="button"
                          className="text-xs mt-2 transition-colors"
                          style={{color: 'var(--accent-primary)'}}
                          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--accent-primary)'}
                          onClick={onIncomeFocus}
                        >
                          Add income to see affordability
                        </button>
                      )}
                    </div>
                  )}

                  {topMarkets.length > 0 && (
                    <div className="mb-4 rounded-xl border p-3" style={{borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)'}}>
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] uppercase tracking-wider" style={{color: 'var(--text-tertiary)'}}>
                          Top markets
                        </p>
                        <span className="text-[10px]" style={{color: 'var(--text-tertiary)'}}>
                          Sorted by cheapest
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {topMarkets.map((row) => (
                          <div key={row.code} className="rounded-full border px-2.5 py-1 text-xs" style={{borderColor: 'var(--border-primary)', color: 'var(--text-secondary)'}}>
                            {row.label} · {formatCurrency(row.convertedPrice, preferredCurrency, { maxFractionDigits: 0 }).replace(/^[^0-9]+/, "")}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsFlipped(true)}
                    className="w-full text-xs transition-colors py-2 text-right border-t mt-2 -mx-4 -mb-4 px-4"
                    style={{borderColor: 'var(--border-primary)', color: 'var(--text-tertiary)'}}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                  >
                    See all markets
                  </button>
                </div>

                {/* Back */}
                <div
                  className="absolute inset-0"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <div className="pt-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs uppercase tracking-wider" style={{color: 'var(--text-tertiary)'}}>
                        All markets (top 9)
                      </p>
                      <button
                        type="button"
                        className="text-xs transition-colors"
                        style={{color: 'var(--text-tertiary)'}}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                        onClick={() => setIsFlipped(false)}
                      >
                        Back
                      </button>
                    </div>
                    <div>
                      <div className="grid grid-cols-3 gap-2">
                      {flipMarketsTop.map((row) => {
                        const color = ITEM_CHART_COLORS[row.code];
                        const hasPrice = row.convertedValid && row.convertedPrice != null;
                        const ratio = incomeAmount && incomeAmount > 0 && row.convertedPrice
                          ? row.convertedPrice / incomeAmount
                          : null;

                        return (
                          <div
                            key={row.code}
                            className="rounded-lg border p-2.5"
                            style={{borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)'}}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} aria-hidden />
                                <span className="text-[11px] font-medium" style={{color: 'var(--text-secondary)'}}>
                                  {row.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {row.code === preferredCountry && (
                                  <span className="text-[9px] uppercase tracking-wider" style={{color: 'var(--accent-primary)'}}>
                                    Home
                                  </span>
                                )}
                                {row.buyingLink && (
                                  <a
                                    href={row.buyingLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px]"
                                    style={{color: 'var(--accent-primary)'}}
                                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-hover)'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--accent-primary)'}
                                    title={row.priceSource ? `Source: ${row.priceSource}` : "View retailer"}
                                  >
                                    ↗
                                  </a>
                                )}
                              </div>
                            </div>
                            <p className="mt-1 text-sm font-semibold tabular-nums" style={{color: hasPrice ? 'var(--text-primary)' : 'var(--text-tertiary)'}}>
                              {hasPrice
                                ? formatCurrency(row.convertedPrice!, preferredCurrency, { maxFractionDigits: 0 })
                                : "Not available"}
                            </p>
                            {ratio && (
                              <p className="text-[10px] mt-0.5" style={{color: 'var(--text-tertiary)'}}>
                                {ratio.toFixed(1)}x monthly
                              </p>
                            )}
                            {row.priceSource && row.buyingLink && (
                              <p className="text-[9px] mt-0.5 uppercase tracking-wider" style={{color: 'var(--text-tertiary)'}}>
                                {row.priceSource}
                              </p>
                            )}
                          </div>
                        );
                      })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
