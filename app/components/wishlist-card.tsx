"use client";

import type { WishlistItem, CountryCode } from "@/types";
import { COUNTRY_CODES, COUNTRY_LABELS } from "@/types";
import { useCurrency } from "@/app/lib/currency-context";
import { formatCurrency } from "@/app/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
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
      };

    const converted = convertToPreferred(p.price, p.currency);
    const convertedValid = !!rates.rates[p.currency] && !!rates.rates[preferredCurrency] && !rates.error;

    return {
      code,
      label: COUNTRY_LABELS[code],
      originalPrice: p.price,
      originalCurrency: p.currency,
      convertedPrice: converted,
      convertedValid,
      priceSource: p.priceSource,
      buyingLink: p.buyingLink,
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
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(item.id)}
            className="mt-1 h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-emerald-600 focus:ring-emerald-500"
            aria-label={`Select ${product.displayName}`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base font-medium">
                {product.displayName}
              </CardTitle>
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  className="shrink-0 rounded px-1.5 py-0.5 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-red-400 transition-colors"
                  aria-label="Remove"
                >
                  Remove
                </button>
              )}
            </div>
            <p className="text-xs text-zinc-500">{product.name}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                <th className="pb-2 pr-2 w-1/3">Country</th>
                <th className="pb-2 pr-2 w-1/4 text-right">Price</th>
                <th className="pb-2 pr-2 w-1/4 text-right">{`Preferred (${preferredCurrency})`}</th>
                <th className="pb-2 w-1/6 text-right">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {pricesByCountry.map((row) => {
                const isBest = best?.code === row.code;
                const color = ITEM_CHART_COLORS[row.code];
                return (
                  <tr key={row.code} className="text-zinc-300">
                    <td className="py-2 pr-2 w-1/3">
                      <span
                        className="mr-1.5 inline-block h-2 w-2 shrink-0 rounded-full align-middle"
                        style={{ backgroundColor: color }}
                        aria-hidden
                      />
                      <span className="inline-block">
                        {row.label}
                        {isBest && (
                          <span className="ml-1.5 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                            Best
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-2 pr-2 w-1/4 font-medium tabular-nums text-right text-sm">
                      {row.originalPrice != null
                        ? formatCurrency(row.originalPrice, row.originalCurrency!)
                        : "—"}
                    </td>
                    <td className="py-2 pr-2 w-1/4 text-zinc-400 tabular-nums text-right text-sm">
                      {row.convertedValid && row.convertedPrice != null
                        ? formatCurrency(row.convertedPrice, preferredCurrency, { maxFractionDigits: 0 })
                        : rates.error
                        ? "FX ✗"
                        : "—"}
                    </td>
                    <td className="py-2 w-1/6 text-right">
                      {row.buyingLink ? (
                        <a
                          href={row.buyingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-emerald-500 hover:underline"
                        >
                          Buy
                        </a>
                      ) : (
                        <span className="text-xs text-zinc-600">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
