"use client";

import { formatCurrency } from "@/app/lib/utils";

type MarketItem = {
  id: string;
  name: string;
  converted: number;
  priceSource?: string;
  buyingLink?: string;
};

interface MarketItemsListProps {
  marketCode: string;
  items: MarketItem[];
  preferredCurrency: string;
}

export function MarketItemsList({ marketCode, items, preferredCurrency }: Readonly<MarketItemsListProps>) {
  if (items.length === 0) {
    return (
      <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
        No items available for this market.
      </div>
    );
  }

  return (
    <>
      {items.map((item) => (
        <div
          key={`${marketCode}-${item.id}`}
          className="flex items-start justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0"
          style={{ borderColor: "var(--border-primary)" }}
        >
          <div className="min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: "var(--text-secondary)" }} title={item.name}>
              {item.name}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {formatCurrency(item.converted, preferredCurrency, { maxFractionDigits: 0 })}
            </div>
            {item.buyingLink && (
              <a
                href={item.buyingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 inline-flex items-center gap-1 text-xs"
                style={{ color: "var(--accent-primary)" }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.color = "var(--accent-hover)";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.color = "var(--accent-primary)";
                }}
              >
                <span className="max-w-[110px] truncate">{item.priceSource ?? "Buy"}</span>
                <span aria-hidden>↗</span>
              </a>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
