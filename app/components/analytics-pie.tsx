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
import { useCurrency } from "@/app/lib/currency-context";
import { ITEM_CHART_COLORS } from "@/app/lib/constants";
import { formatCurrency } from "@/app/lib/utils";

interface AnalyticsPieProps {
  items: WishlistItem[];
  hoveredItemId?: string | null;
}

export function AnalyticsPie({ items, hoveredItemId }: AnalyticsPieProps) {
  const { convertToPreferred, preferredCurrency } = useCurrency();

  const displayItems =
    hoveredItemId != null
      ? items.filter((i) => i.id === hoveredItemId)
      : items;

  const data = COUNTRY_CODES.map((code) => {
    const total = displayItems.reduce((sum, item) => {
      const p = item.product.pricing[code];
      if (!p) return sum;
      const converted = convertToPreferred(p.price, p.currency);
      return sum + converted;
    }, 0);
    return {
      name: COUNTRY_LABELS[code],
      code,
      value: Math.round(total * 100) / 100,
      fill: ITEM_CHART_COLORS[code],
    };
  }).filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/50 text-sm text-zinc-500">
        {hoveredItemId
          ? "Hover a card to see it here"
          : "Select items to see cost by country"}
      </div>
    );
  }

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
          >
            {data.map((entry) => (
              <Cell key={entry.code} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) =>
              formatCurrency(value, preferredCurrency)
            }
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
  );
}
