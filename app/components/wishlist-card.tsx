"use client";

import type { WishlistItem, CountryCode } from "@/types";
import { COUNTRY_CODES, COUNTRY_LABELS } from "@/types";
import { useCurrency } from "@/app/lib/currency-context";
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
  const { convertToPreferred, formatInPreferred } = useCurrency();
  const { product } = item;

  const pricesByCountry: Array<{
    code: CountryCode;
    label: string;
    price: number | null;
    priceSource?: string;
    buyingLink?: string;
    currency?: string;
  }> = COUNTRY_CODES.map((code) => {
    const p = product.pricing[code];
    if (!p) return { code, label: COUNTRY_LABELS[code], price: null };
    const converted = convertToPreferred(p.price, p.currency);
    return {
      code,
      label: COUNTRY_LABELS[code],
      price: converted,
      priceSource: p.priceSource,
      buyingLink: p.buyingLink,
      currency: p.currency,
    };
  });

  const withPrice = pricesByCountry.filter(
    (r): r is typeof r & { price: number } => r.price != null
  );
  const best = withPrice.length
    ? withPrice.reduce((a, b) => (a.price <= b.price ? a : b))
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
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                <th className="pb-2 pr-2">Country</th>
                <th className="pb-2 pr-2">Price</th>
                <th className="pb-2 pr-2 hidden sm:table-cell">Source</th>
                <th className="pb-2 w-20">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {pricesByCountry.map((row) => {
                if (row.price == null || !row.buyingLink) return null;
                const isBest = best?.code === row.code;
                const color = ITEM_CHART_COLORS[row.code];
                return (
                  <tr key={row.code} className="text-zinc-300">
                    <td className="py-2 pr-2">
                      <span
                        className="mr-1.5 inline-block h-2 w-2 shrink-0 rounded-full align-middle"
                        style={{ backgroundColor: color }}
                        aria-hidden
                      />
                      {row.label}
                      {isBest && (
                        <span className="ml-1.5 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                          Best
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-2 font-medium tabular-nums">
                      {formatInPreferred(row.price, row.currency!)}
                    </td>
                    <td className="max-w-[120px] truncate py-2 pr-2 text-zinc-500 hidden sm:table-cell">
                      {row.priceSource ?? "—"}
                    </td>
                    <td className="py-2">
                      <a
                        href={row.buyingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-500 hover:underline"
                      >
                        Buy
                      </a>
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
