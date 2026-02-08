"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import type { WishlistItem } from "@/types";
import { COUNTRY_CODES, COUNTRY_LABELS } from "@/types";
import { COUNTRY_CURRENCY } from "@/types";
import { useCurrency } from "@/app/lib/currency-context";
import { ITEM_CHART_COLORS } from "@/app/lib/constants";
import { formatCurrency } from "@/app/lib/utils";

interface AnalyticsPieProps {
  items: WishlistItem[];
  hoveredItemId?: string | null;
}

export function AnalyticsPie({ items, hoveredItemId }: AnalyticsPieProps) {
  const { convertToPreferred, preferredCountry, preferredCurrency } = useCurrency();

  const displayItems = hoveredItemId != null ? items.filter((i) => i.id === hoveredItemId) : items;

  // Build data per product: choose the best country (min converted price) for each product
  const productsData = displayItems
    .map((item) => {
      const entries = COUNTRY_CODES.map((code) => {
        const p = item.product.pricing[code];
        if (!p) return null;
        const converted = convertToPreferred(p.price, p.currency);
        return { code, converted, original: p } as const;
      }).filter(Boolean) as Array<{ code: string; converted: number; original: any }>; // keep simple

      if (entries.length === 0) return null;

      const best = entries.reduce((a, b) => (a.converted <= b.converted ? a : b));
      const homeEntry = item.product.pricing[preferredCountry];
      const homeConverted = homeEntry ? convertToPreferred(homeEntry.price, homeEntry.currency) : null;

      return {
        id: item.id,
        name: item.product.displayName,
        bestCountry: best.code,
        bestValue: Math.round(best.converted * 100) / 100,
        homeValue: homeConverted != null ? Math.round(homeConverted * 100) / 100 : null,
      };
    })
    .filter(Boolean) as Array<{
      id: string;
      name: string;
      bestCountry: string;
      bestValue: number;
      homeValue: number | null;
    }>;

  const data = productsData.map((p) => ({
    name: p.name,
    code: p.bestCountry,
    value: p.bestValue,
    fill: ITEM_CHART_COLORS[p.bestCountry as keyof typeof ITEM_CHART_COLORS] ?? "#333",
  }));

  const optimizedTotal = productsData.reduce((s, p) => s + p.bestValue, 0);
  const homeTotal = productsData.reduce((s, p) => s + (p.homeValue ?? p.bestValue), 0);

  if (data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/50 text-sm text-zinc-500">
        {hoveredItemId ? "Hover an item to see it here" : "Select items to see your wishlist breakdown"}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <div className="text-xs text-zinc-400">Optimized total</div>
          <div className="text-lg font-semibold text-emerald-400">{formatCurrency(optimizedTotal, preferredCurrency)}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-zinc-400">If bought from {preferredCountry}</div>
          <div className="text-lg font-semibold text-zinc-100">{formatCurrency(homeTotal, preferredCurrency)}</div>
        </div>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name?: string, props?: any) => {
                return [formatCurrency(value, preferredCurrency), "Cost"];
              }}
              contentStyle={{
                backgroundColor: "rgb(39 39 42)",
                border: "1px solid rgb(63 63 70)",
                borderRadius: "8px",
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
