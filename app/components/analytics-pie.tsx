"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Sector,
} from "recharts";
import type { SectorProps } from "recharts";
import { useEffect, useRef, useState } from "react";
import type { CountryCode, WishlistItem } from "@/types";
import { COUNTRY_CODES, COUNTRY_LABELS } from "@/types";
import { useCurrency } from "@/app/lib/currency-context";
import { ITEM_CHART_COLORS } from "@/app/lib/constants";
import { formatCurrency } from "@/app/lib/utils";

interface AnalyticsPieProps {
  readonly items: ReadonlyArray<WishlistItem>;
}

type ProductBestEntry = {
  code: CountryCode;
  converted: number;
  original: {
    buyingLink: string;
  };
};

type ProductData = {
  id: string;
  name: string;
  bestCountry: CountryCode;
  bestCountryLabel: string;
  bestBuyingLink: string;
  bestValue: number;
  homeValue: number | null;
};

type PanelAnchor = {
  x: number;
  y: number;
};

type PointerLikeEvent = {
  clientX?: number;
  clientY?: number;
};

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function renderActiveSector(props: SectorProps) {
  return <Sector {...props} outerRadius={(props.outerRadius ?? 100) + 8} />;
}

function getPanelCoordinates(
  panelAnchor: PanelAnchor,
  chartRect: DOMRect,
  panelSize: { width: number; height: number }
): { left: number; top: number } {
  const padding = 8;
  const offsetX = 16;
  const offsetY = 12;
  const rawLeft = panelAnchor.x + offsetX;
  const above = panelAnchor.y - panelSize.height - offsetY;
  const below = panelAnchor.y + offsetY;
  const rawTop = above >= padding ? above : below;

  return {
    left: Math.min(Math.max(rawLeft, padding), chartRect.width - panelSize.width - padding),
    top: Math.min(Math.max(rawTop, padding), chartRect.height - panelSize.height - padding),
  };
}

function toPointerLikeEvent(event: unknown): PointerLikeEvent | null {
  if (!event || typeof event !== "object") {
    return null;
  }
  const pointerEvent = event as PointerLikeEvent;
  return typeof pointerEvent.clientX === "number" || typeof pointerEvent.clientY === "number"
    ? pointerEvent
    : null;
}

export function AnalyticsPie({ items }: Readonly<AnalyticsPieProps>) {
  const { convertToPreferred, preferredCountry, preferredCurrency } = useCurrency();

  const chartRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Build data per product: choose the best country (min converted price) for each product
  const productsData = items
    .map((item) => {
      const entries = COUNTRY_CODES.reduce<ProductBestEntry[]>((accumulator, code) => {
        const p = item.product.pricing[code];
        if (p?.price == null) return accumulator;
        const converted = convertToPreferred(p.price, p.currency);
        accumulator.push({ code, converted, original: p });
        return accumulator;
      }, []);

      if (entries.length === 0) return null;

      const best = entries.reduce(
        (a, b) => (a.converted <= b.converted ? a : b),
        entries[0]
      );
      const homeEntry = item.product.pricing[preferredCountry];
      const homeConverted =
        homeEntry?.price == null
          ? null
          : convertToPreferred(homeEntry.price, homeEntry.currency);

      return {
        id: item.id,
        name: item.product.displayName,
        bestCountry: best.code,
        bestCountryLabel: COUNTRY_LABELS[best.code],
        bestBuyingLink: best.original?.buyingLink,
        bestValue: roundCurrency(best.converted),
        homeValue: homeConverted === null ? null : roundCurrency(homeConverted),
      };
    })
    .filter((entry): entry is ProductData => entry !== null);

  const itemColorPalette = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4",
    "#ec4899",
    "#14b8a6",
    "#f97316",
    "#6366f1",
  ];

  const getItemColor = (seed: string) => {
    let hash = 5381;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash * 33) ^ (seed.codePointAt(i) ?? 0);
    }
    const index = Math.abs(hash) % itemColorPalette.length;
    return itemColorPalette[index];
  };

  const data = productsData.map((p) => ({
    name: p.name,
    code: p.bestCountry,
    countryLabel: p.bestCountryLabel,
    buyLink: p.bestBuyingLink,
    value: p.bestValue,
    fill: getItemColor(p.id ?? p.name) ?? ITEM_CHART_COLORS[p.bestCountry as keyof typeof ITEM_CHART_COLORS] ?? "#333",
  }));

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [lockedIndex, setLockedIndex] = useState<number | null>(null);
  const [panelPos, setPanelPos] = useState<PanelAnchor | null>(null);
  const [panelSize, setPanelSize] = useState<{ width: number; height: number }>({ width: 240, height: 120 });
  const [panelCoordinates, setPanelCoordinates] = useState<{ left: number; top: number } | null>(null);

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

  const safeHoveredIndex =
    hoveredIndex != null && hoveredIndex < data.length ? hoveredIndex : null;
  const safeLockedIndex =
    lockedIndex != null && lockedIndex < data.length ? lockedIndex : null;
  const activeIndex = safeLockedIndex ?? safeHoveredIndex;
  const activeEntry = activeIndex === null ? null : data[activeIndex];

  const refreshPanelCoordinates = (anchor: PanelAnchor) => {
    if (!chartRef.current) return;
    const chartRect = chartRef.current.getBoundingClientRect();
    setPanelCoordinates(getPanelCoordinates(anchor, chartRect, panelSize));
  };

  const updatePanelPosition = (event: PointerLikeEvent | null) => {
    if (!chartRef.current || !event) return;
    const rect = chartRef.current.getBoundingClientRect();
    const x = (event.clientX ?? 0) - rect.left;
    const y = (event.clientY ?? 0) - rect.top;
    const anchor = { x, y };
    setPanelPos(anchor);
    refreshPanelCoordinates(anchor);
  };

  useEffect(() => {
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const nextPanelSize = { width: rect.width, height: rect.height };
      setPanelSize(nextPanelSize);
      if (panelPos && chartRef.current) {
        const chartRect = chartRef.current.getBoundingClientRect();
        setPanelCoordinates(getPanelCoordinates(panelPos, chartRect, nextPanelSize));
      }
    }
  }, [activeEntry, panelPos]);

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
        className="relative h-[320px] w-full py-2"
        ref={chartRef}
        style={{ outline: "none" }}
      >
        {activeEntry && panelPos && panelCoordinates && (
          <div
            ref={panelRef}
            className="pointer-events-auto absolute z-20 rounded-lg border px-3 py-2 shadow-xl"
            style={{
              left: panelCoordinates.left,
              top: panelCoordinates.top,
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-primary)',
            }}
          >
            <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              {activeEntry.name}
            </div>
            <div className="mt-1 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Best in
                </div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {activeEntry.countryLabel}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
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
                className="mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition-colors"
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
            <PieChart tabIndex={-1} style={{ outline: "none" }} margin={{ top: 8, bottom: 8 }}>
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
              activeShape={renderActiveSector}
              onMouseEnter={(_, index, event) => {
                if (lockedIndex == null) {
                  setHoveredIndex(index);
                  updatePanelPosition(toPointerLikeEvent(event));
                }
              }}
              onMouseMove={(_, __, event) => {
                if (lockedIndex == null) updatePanelPosition(toPointerLikeEvent(event));
              }}
              onMouseLeave={() => {
                if (lockedIndex == null) setHoveredIndex(null);
              }}
              onClick={(_, index, event) => {
                setLockedIndex((prev) => (prev === index ? null : index));
                setHoveredIndex((prev) => (prev === index ? null : index));
                updatePanelPosition(toPointerLikeEvent(event));
              }}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
        {data.map((entry) => (
          <span key={entry.name} className="inline-flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: entry.fill }}
              aria-hidden
            />
            <span className="max-w-[220px] truncate">
              {entry.name}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
