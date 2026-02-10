"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Sector,
} from "recharts";
import type { SectorProps } from "recharts";
import { useEffect, useRef, useState } from "react";
import type { WishlistItem } from "@/types";
import { COUNTRY_CODES, COUNTRY_LABELS } from "@/types";
import { useCurrency } from "@/app/lib/currency-context";
import { ITEM_CHART_COLORS } from "@/app/lib/constants";
import { formatCurrency } from "@/app/lib/utils";

interface AnalyticsPieProps {
  items: WishlistItem[];
}

export function AnalyticsPie({ items }: AnalyticsPieProps) {
  const { convertToPreferred, preferredCountry, preferredCurrency } = useCurrency();

  const chartRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Build data per product: choose the best country (min converted price) for each product
  const productsData = items
    .map((item) => {
      const entries = COUNTRY_CODES.map((code) => {
        const p = item.product.pricing[code];
        if (!p || p.price === null) return null;
        const converted = convertToPreferred(p.price, p.currency);
        return { code, converted, original: p } as const;
      }).filter(Boolean) as Array<{ code: string; converted: number; original: any }>; // keep simple

      if (entries.length === 0) return null;

      const best = entries.reduce((a, b) => (a.converted <= b.converted ? a : b));
      const homeEntry = item.product.pricing[preferredCountry];
      const homeConverted = homeEntry && homeEntry.price !== null ? convertToPreferred(homeEntry.price, homeEntry.currency) : null;

      return {
        id: item.id,
        name: item.product.displayName,
        bestCountry: best.code,
        bestCountryLabel: COUNTRY_LABELS[best.code as keyof typeof COUNTRY_LABELS],
        bestBuyingLink: best.original?.buyingLink,
        bestValue: Math.round(best.converted * 100) / 100,
        homeValue: homeConverted != null ? Math.round(homeConverted * 100) / 100 : null,
      };
    })
    .filter(Boolean) as Array<{
      id: string;
      name: string;
      bestCountry: string;
      bestCountryLabel: string;
      bestBuyingLink?: string;
      bestValue: number;
      homeValue: number | null;
    }>;

  const data = productsData.map((p) => ({
    name: p.name,
    code: p.bestCountry,
    countryLabel: p.bestCountryLabel,
    buyLink: p.bestBuyingLink,
    value: p.bestValue,
    fill: ITEM_CHART_COLORS[p.bestCountry as keyof typeof ITEM_CHART_COLORS] ?? "#333",
  }));

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [lockedIndex, setLockedIndex] = useState<number | null>(null);
  const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(null);
  const [panelSize, setPanelSize] = useState<{ width: number; height: number }>({ width: 240, height: 120 });

  useEffect(() => {
    if (hoveredIndex != null && hoveredIndex >= data.length) setHoveredIndex(null);
    if (lockedIndex != null && lockedIndex >= data.length) setLockedIndex(null);
  }, [data.length, hoveredIndex, lockedIndex]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!chartRef.current) return;
      if (!chartRef.current.contains(event.target as Node)) {
        setLockedIndex(null);
        setHoveredIndex(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const activeIndex = lockedIndex ?? hoveredIndex;
  const activeEntry = activeIndex != null ? data[activeIndex] : null;

  const updatePanelPosition = (event?: { clientX?: number; clientY?: number }) => {
    if (!chartRef.current || !event) return;
    const rect = chartRef.current.getBoundingClientRect();
    const x = (event.clientX ?? 0) - rect.left;
    const y = (event.clientY ?? 0) - rect.top;
    setPanelPos({ x, y });
  };

  useEffect(() => {
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setPanelSize({ width: rect.width, height: rect.height });
    }
  }, [activeEntry]);

  const optimizedTotal = productsData.reduce((s, p) => s + p.bestValue, 0);
  const homeTotal = productsData.reduce((s, p) => s + (p.homeValue ?? p.bestValue), 0);

  if (data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-xl border text-sm" style={{borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-tertiary)'}}>
        Select items to see your wishlist breakdown
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <div className="text-xs" style={{color: 'var(--text-secondary)'}}>Optimized total</div>
          <div className="text-lg font-semibold" style={{color: 'var(--accent-primary)'}}>{formatCurrency(optimizedTotal, preferredCurrency)}</div>
        </div>
        <div className="text-right">
          <div className="text-xs" style={{color: 'var(--text-secondary)'}}>If bought from {preferredCountry}</div>
          <div className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>{formatCurrency(homeTotal, preferredCurrency)}</div>
        </div>
      </div>

      <div
        className="relative h-[300px] w-full"
        ref={chartRef}
        style={{ outline: "none" }}
        onMouseDown={(e) => e.preventDefault()}
      >
        {activeEntry && panelPos && chartRef.current && (
          <div
            ref={panelRef}
            className="pointer-events-auto absolute z-20 rounded-lg border px-3 py-2 shadow-xl"
            style={{
              left: (() => {
                const chartRect = chartRef.current!.getBoundingClientRect();
                const padding = 8;
                const offsetX = 16;
                const rawLeft = panelPos.x + offsetX;
                return Math.min(
                  Math.max(rawLeft, padding),
                  chartRect.width - panelSize.width - padding
                );
              })(),
              top: (() => {
                const chartRect = chartRef.current!.getBoundingClientRect();
                const padding = 8;
                const offsetY = 12;
                const above = panelPos.y - panelSize.height - offsetY;
                const below = panelPos.y + offsetY;
                const rawTop = above >= padding ? above : below;
                return Math.min(
                  Math.max(rawTop, padding),
                  chartRect.height - panelSize.height - padding
                );
              })(),
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-primary)',
            }}
          >
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {activeEntry.name}
            </div>
            <div className="mt-1 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                  Best in
                </div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {activeEntry.countryLabel}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                  Cost
                </div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {formatCurrency(activeEntry.value, preferredCurrency)}
                </div>
              </div>
            </div>
            {activeEntry.buyLink && (
              <a
                href={activeEntry.buyLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--accent-primary)',
                  border: '1px solid var(--border-primary)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--accent-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--accent-primary)';
                }}
              >
                Buy now →
              </a>
            )}
          </div>
        )}
        <div className="relative z-0 h-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart tabIndex={-1} style={{ outline: "none" }}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
              activeIndex={activeIndex ?? undefined}
              activeShape={(props: SectorProps) => (
                <Sector
                  {...props}
                  outerRadius={(props.outerRadius ?? 100) + 8}
                />
              )}
              onMouseEnter={(_, index, event) => {
                if (lockedIndex == null) {
                  setHoveredIndex(index);
                  updatePanelPosition(event as any);
                }
              }}
              onMouseMove={(_, __, event) => {
                if (lockedIndex == null) updatePanelPosition(event as any);
              }}
              onMouseLeave={() => {
                if (lockedIndex == null) setHoveredIndex(null);
              }}
              onClick={(_, index, event) => {
                setLockedIndex((prev) => (prev === index ? null : index));
                setHoveredIndex((prev) => (prev === index ? null : index));
                updatePanelPosition(event as any);
              }}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
