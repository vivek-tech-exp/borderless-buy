"use client";

import { useState, useCallback, useEffect } from "react";
import { AddItemForm } from "@/app/components/add-item-form";
import { WishlistCard } from "@/app/components/wishlist-card";
import { AnalyticsPie } from "@/app/components/analytics-pie";
import { CurrencySetting } from "@/app/components/currency-setting";
import { PromptInfoModal } from "@/app/components/prompt-info-modal";
import { useCurrency } from "@/app/lib/currency-context";
import { supabase } from "@/app/lib/supabase";
import { AuthForm } from "@/app/components/auth-form";
import { COUNTRY_CODES, COUNTRY_LABELS } from "@/types";
import { ITEM_CHART_COLORS } from "@/app/lib/constants";
import { formatCurrency } from "@/app/lib/utils";
import type { WishlistItem } from "@/types";

export default function MainDashboard() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [showPromptModal, setShowPromptModal] = useState(false);

  const { convertToPreferred, preferredCurrency } = useCurrency();

  // Load persisted items for signed-in users
  useEffect(() => {
    let mounted = true;
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token || !mounted) return;
      try {
        const res = await fetch("/api/wishlist", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load wishlist");
        if (mounted && data.items) {
          setItems(data.items);
        }
      } catch (err: any) {
        console.warn("Failed to load wishlist:", err?.message ?? String(err));
      }
    }
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) load();
      if (!session?.user) setItems([]);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleAdd = useCallback(async (item: WishlistItem, prompt?: string) => {
    // Optimistically add locally
    setItems((prev) => [item, ...prev]);
    setSelectedIds((prev) => new Set(prev).add(item.id));
    if (prompt) setLastPrompt(prompt);

    // If user is signed in, persist via server endpoint (verifies token)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ item }),
      });
      if (!res.ok) {
        const data = await res.json();
        console.warn("Failed to persist wishlist item:", data.error ?? res.statusText);
      }
    } catch (err) {
      console.warn("Error saving item to server:", err);
    }
  }, []);

  const handleRemove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (hoveredItemId === id) setHoveredItemId(null);
  }, [hoveredItemId]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map((i) => i.id)));
  }, [items]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedItems = items.filter((i) => selectedIds.has(i.id));
  const chartItems =
    hoveredItemId != null
      ? items.filter((i) => i.id === hoveredItemId)
      : selectedItems;

  const totalsByCountry = COUNTRY_CODES.map((code) => {
    const total = selectedItems.reduce((sum, item) => {
      const p = item.product.pricing[code];
      if (!p) return sum;
      return sum + convertToPreferred(p.price, p.currency);
    }, 0);
    return { code, label: COUNTRY_LABELS[code], total };
  });
  const bestTotal = totalsByCountry.reduce(
    (min, t) => (t.total > 0 && (min === 0 || t.total < min) ? t.total : min),
    0
  );
  const showTotals = selectedItems.length > 0 && !hoveredItemId;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-1 items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
                Borderless Buy
              </h1>
              <p className="mt-1.5 text-sm text-zinc-500">
                Your wishlist — plan purchases, track totals, and find where to save by buying globally.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPromptModal(true)}
              className="shrink-0 rounded-full p-2 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
              title="View last Gemini prompt"
              aria-label="View last Gemini prompt"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          </div>
          <div className="shrink-0 flex items-center gap-3">
            <AuthForm />
            <div className="sm:w-40">
              <CurrencySetting />
            </div>
          </div>
        </div>
      </header>

      <section className="mb-8">
        <AddItemForm onAdd={handleAdd} />
      </section>

      {showTotals && (
        <section className="mb-8">
          <h2 className="mb-4 text-sm font-medium text-zinc-400">
            Your investment by country
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {totalsByCountry.map(({ code, label, total }) => (
              <div
                key={code}
                className="rounded-xl border border-zinc-700/80 bg-zinc-900/80 px-3 py-3 min-h-[100px] flex flex-col justify-between"
              >
                <div className="min-w-0">
                  <span
                    className="mb-1 block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: ITEM_CHART_COLORS[code] }}
                    aria-hidden
                  />
                  <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 truncate">
                    {label}
                  </p>
                </div>
                <p className="mt-2 text-base font-semibold tabular-nums text-zinc-100 break-words">
                  {total > 0
                    ? formatCurrency(total, preferredCurrency)
                    : "—"}
                </p>
              </div>
            ))}
          </div>
          {bestTotal > 0 && (
            <p className="mt-4 text-sm text-zinc-400">
              💰 Cheapest option:{" "}
              <span className="font-medium text-emerald-400">
                {formatCurrency(bestTotal, preferredCurrency)}
              </span>
            </p>
          )}
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-4 text-sm font-medium text-zinc-400">
          Cost breakdown by country
        </h2>
        <AnalyticsPie items={chartItems} hoveredItemId={hoveredItemId} />
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-zinc-400">Wishlist</h2>
          {items.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={selectAll}
                className="rounded-md px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
              >
                Select all
              </button>
              <span className="text-zinc-600" aria-hidden>·</span>
              <button
                type="button"
                onClick={deselectAll}
                className="rounded-md px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
              >
                Deselect all
              </button>
            </div>
          )}
        </div>
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-700 py-10 text-center text-sm text-zinc-500">
            Start building your wishlist! Add items you want to buy (e.g., MacBook, iPhone 16, or a motorcycle) to see total costs and find the best deals globally.
          </p>
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {items.map((item) => (
              <li key={item.id}>
                <WishlistCard
                  item={item}
                  selected={selectedIds.has(item.id)}
                  onToggleSelect={handleToggleSelect}
                  onRemove={handleRemove}
                  onMouseEnter={() => setHoveredItemId(item.id)}
                  onMouseLeave={() => setHoveredItemId(null)}
                  isHovered={hoveredItemId === item.id}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {showPromptModal && (
        <PromptInfoModal
          prompt={lastPrompt}
          onClose={() => setShowPromptModal(false)}
        />
      )}
    </main>
  );
}
