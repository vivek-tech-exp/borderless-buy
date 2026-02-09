"use client";

import { useState, useCallback, useEffect } from "react";
import { GlobeAltIcon, ChartPieIcon, CurrencyDollarIcon, BellAlertIcon } from "@heroicons/react/24/outline";
import { AddItemForm } from "@/app/components/add-item-form";
import { WishlistCard } from "@/app/components/wishlist-card";
import { AnalyticsPie } from "@/app/components/analytics-pie";
import { CountryFlagSelector } from "@/app/components/country-flag-selector";
import { PromptInfoModal } from "@/app/components/prompt-info-modal";
import { ThemeSwitcher } from "@/app/components/theme-switcher";
import { ViewModeToggle, type ViewMode } from "@/app/components/view-mode-toggle";
import { Input } from "@/app/components/ui/input";
import { useCurrency } from "@/app/lib/currency-context";
import { supabase } from "@/app/lib/supabase";
import { SignInModal } from "@/app/components/sign-in-modal";
import { COUNTRY_CODES, COUNTRY_LABELS } from "@/types";
import { ITEM_CHART_COLORS } from "@/app/lib/constants";
import { formatCurrency } from "@/app/lib/utils";
import type { WishlistItem } from "@/types";

const LOCAL_WISHLIST_KEY = "borderless-buy-guest-wishlist";

export default function MainDashboard() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [totalsExpanded, setTotalsExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("global");
  const [incomeInput, setIncomeInput] = useState<string>("");

  const { convertToPreferred, preferredCurrency, preferredCountry } = useCurrency();

  // Load guest items from localStorage on first mount
  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_WISHLIST_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as WishlistItem[];
        setItems(parsed);
      } catch {
        localStorage.removeItem(LOCAL_WISHLIST_KEY);
      }
    }
    // Also restore income preference
    const savedIncome = localStorage.getItem("borderless-buy-income");
    if (savedIncome) {
      setIncomeInput(savedIncome);
    }
  }, []);

  // Load persisted items for signed-in users; sync with auth state
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
          // Clear guest localStorage after successful sync
          localStorage.removeItem(LOCAL_WISHLIST_KEY);
          localStorage.removeItem("borderless-buy-income");
        }
      } catch (err: any) {
        console.warn("Failed to load wishlist:", err?.message ?? String(err));
      }
    }

    async function migrateGuestDataToServer() {
      // Check if guest has local items and user just signed in
      const stored = localStorage.getItem(LOCAL_WISHLIST_KEY);
      if (!stored) return;

      try {
        const guestItems = JSON.parse(stored) as WishlistItem[];
        if (guestItems.length === 0) return;

        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;

        // Upload each guest item to server
        for (const item of guestItems) {
          await fetch("/api/wishlist", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ item }),
          });
        }
        console.log(`Migrated ${guestItems.length} guest items to server`);
      } catch (err) {
        console.warn("Failed to migrate guest data:", err);
      }
    }

    load();
    const { data: sub } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        // User signed in: migrate guest data first, then load from server
        migrateGuestDataToServer().then(() => load());
      } else {
        // User signed out: try to load guest data from localStorage
        const stored = localStorage.getItem(LOCAL_WISHLIST_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as WishlistItem[];
            setItems(parsed);
          } catch {
            setItems([]);
          }
        } else {
          setItems([]);
        }
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(min-width: 640px)");
    const setDefault = () => setTotalsExpanded(mediaQuery.matches);
    setDefault();
    mediaQuery.addEventListener("change", setDefault);
    return () => mediaQuery.removeEventListener("change", setDefault);
  }, []);

  // Load and persist view mode preference
  useEffect(() => {
    const stored = localStorage.getItem("borderless-buy-view-mode") as ViewMode | null;
    if (stored && (stored === "local" || stored === "global")) {
      setViewMode(stored);
    }
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem("borderless-buy-view-mode", mode);
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

  const incomeAmount = Number(incomeInput);
  const safeIncomeAmount = Number.isFinite(incomeAmount) ? incomeAmount : 0;

  const handleIncomeFocus = useCallback(() => {
    const input = document.getElementById("income-input") as HTMLInputElement | null;
    input?.focus();
  }, []);

  useEffect(() => {
    if (user) return;
    try {
      localStorage.setItem(LOCAL_WISHLIST_KEY, JSON.stringify(items));
    } catch {
      // If storage fails (quota or private mode), silently skip.
    }
  }, [items, user]);

  // Persist income preference for guests
  useEffect(() => {
    if (user) return;
    try {
      if (incomeInput) {
        localStorage.setItem("borderless-buy-income", incomeInput);
      } else {
        localStorage.removeItem("borderless-buy-income");
      }
    } catch {
      // If storage fails, silently skip.
    }
  }, [incomeInput, user]);

  const selectedItems = items.filter((i) => selectedIds.has(i.id));
  const chartItems =
    hoveredItemId != null
      ? items.filter((i) => i.id === hoveredItemId)
      : selectedItems;

  const totalsByCountry = COUNTRY_CODES.map((code) => {
    const total = selectedItems.reduce((sum, item) => {
      const p = item.product.pricing[code];
      if (!p || p.price === null) return sum;
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
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="mb-12">
        {/* Hero Section: Logo + Tagline + Currency + Info Button */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              My Life Upgrade Plan
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Unapologetically Materialistic. Intelligently Sourced.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            {/* Compact flag-based country selector */}
            <CountryFlagSelector />
            {/* Theme switcher */}
            <ThemeSwitcher />
            {/* Info button (desktop only - dev tool) */}
            <button
              type="button"
              onClick={() => setShowPromptModal(true)}
              className="hidden sm:flex shrink-0 rounded-full p-2 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-secondary)]\"
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
        </div>

        {/* Sign-in prompt - prominent and inviting */}
        <div className="flex items-center justify-center mt-1">
          {user ? (
            <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-sm">
              <div className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Signed in as</div>
              <div className="font-semibold text-[var(--text-primary)] truncate max-w-[200px] text-sm">
                {user.email ?? user.phone ?? user.id}
              </div>
              <button
                onClick={() => setShowSignInModal(true)}
                className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors px-2 py-1 rounded-md hover:bg-[var(--bg-primary)]"
              >
                Manage
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-3 px-6 py-3 rounded-2xl border-2 border-dashed" style={{borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)'}}>
              <div className="flex items-center gap-2.5">
                <span className="text-xl">💡</span>
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  Keep your upgrade plan forever.
                </span>
              </div>
              <button
                onClick={() => setShowSignInModal(true)}
                className="px-5 py-2 rounded-lg font-semibold text-sm transition-all shadow-sm hover:shadow-md"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'white'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Sign in free
              </button>
            </div>
          )}
        </div>
      </header>

      {items.length > 0 && !user && (
        <section className="mb-12 rounded-lg border p-4 flex items-start gap-3" style={{borderColor: 'var(--status-warning-border)', backgroundColor: 'var(--status-warning-bg)'}}>
          <BellAlertIcon className="h-5 w-5 mt-0.5 flex-shrink-0" style={{color: 'var(--status-warning-border)'}} />
          <div className="flex-1">
            <p className="text-sm" style={{color: 'var(--status-warning-text)'}}>
              <span className="font-medium">Your upgrade plan is temporary.</span> Sign in to lock it in forever—it's free!
            </p>
            <p className="text-xs mt-1.5" style={{color: 'var(--status-warning-text)', opacity: 0.8}}>
              💾 Stored safely on this device until you sign in.
            </p>
          </div>
        </section>
      )}

      <section className="mb-12">
        <AddItemForm onAdd={handleAdd} />
      </section>

      {items.length > 0 && (
        <section className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ViewModeToggle 
            mode={viewMode} 
            onToggle={handleViewModeChange}
            countryLabel={COUNTRY_LABELS[preferredCountry]}
          />
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <label className="flex flex-col gap-1">
                <span className="text-xs" style={{color: 'var(--text-tertiary)'}}>
                  Monthly income ({preferredCurrency})
                </span>
                <Input
                  id="income-input"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  placeholder="0"
                  value={incomeInput}
                  onChange={(e) => setIncomeInput(e.target.value)}
                  className="h-10 w-40 px-3 text-sm"
                  aria-label="Monthly income"
                />
              </label>
            </div>
            <span className="text-[11px]" style={{color: 'var(--text-tertiary)'}}>
              Your number stays yours: on-device only. Not stored, not shared, not even visible to us.
            </span>
          </div>
        </section>
      )}

      <section className="mb-12">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
            <svg className="h-4 w-4" style={{color: 'var(--accent-primary)'}} fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.381-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Your Upgrade Plan
          </h2>
          {items.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={selectAll}
                className="rounded-md px-3 py-1.5 text-xs text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-secondary)]"
              >
                Pick all
              </button>
              <span className="text-[var(--border-primary)]" aria-hidden>·</span>
              <button
                type="button"
                onClick={deselectAll}
                className="rounded-md px-3 py-1.5 text-xs text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-secondary)]"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
        {items.length === 0 ? (
          <div className="relative rounded-[12px] border px-6 py-16 text-center" style={{borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)'}}>
            <div className="mx-auto max-w-sm space-y-6">
              <div className="flex justify-center">
                <div className="h-12 w-12 rounded-full border-2 flex items-center justify-center" style={{borderColor: 'var(--accent-primary)', opacity: 0.3}}>
                  <div className="h-6 w-6 rounded-full" style={{backgroundColor: 'var(--accent-primary)', opacity: 0.2}} />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  Your list is empty.
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  Start adding the things that matter to you. Whether it&apos;s a piece of tech, a vehicle, or a tool for your craft—let&apos;s find out what it really costs.
                </p>
              </div>
              <button
                onClick={() => {
                  const input = document.querySelector('input[placeholder*="What"]') as HTMLInputElement;
                  input?.focus();
                }}
                className="text-sm font-medium transition-colors"
                style={{color: 'var(--accent-primary)'}}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--accent-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--accent-primary)';
                }}
              >
                Start adding
              </button>
            </div>
          </div>
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
                  viewMode={viewMode}
                  incomeAmount={safeIncomeAmount}
                  onIncomeFocus={handleIncomeFocus}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-12">
        <h2 className="mb-6 text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
          <ChartPieIcon className="h-4 w-4" style={{color: 'var(--accent-primary)'}} />
          Price Comparison Across Markets
        </h2>
        <AnalyticsPie items={chartItems} hoveredItemId={hoveredItemId} />
      </section>

      {showTotals && (
        <section className="mb-12">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
              <CurrencyDollarIcon className="h-4 w-4" style={{color: 'var(--accent-primary)'}} />
              Total Acquisition Cost
            </h2>
            <button
              type="button"
              onClick={() => setTotalsExpanded((prev) => !prev)}
              className="rounded-md px-2.5 py-1 text-xs text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-secondary)] sm:hidden"
              aria-expanded={totalsExpanded}
              aria-controls="totals-panel"
            >
              {totalsExpanded ? "Hide" : "Show"}
            </button>
          </div>
          <div
            id="totals-panel"
            className={`${totalsExpanded ? "block" : "hidden"} sm:block transition-all duration-200`}
          >
            {viewMode === "local" ? (
              /* Local Mode - Show only home country total */
              <>
                <div className="rounded-2xl border p-6 max-w-md" style={{borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)'}}>
                  <p className="text-xs uppercase tracking-wide font-medium mb-3" style={{color: 'var(--text-secondary)'}}>
                    Total in {COUNTRY_LABELS[preferredCountry]}
                  </p>
                  <p className="text-4xl font-bold" style={{color: 'var(--accent-primary)'}}>
                    {totalsByCountry.find(t => t.code === preferredCountry)?.total ?? 0 > 0
                      ? formatCurrency(totalsByCountry.find(t => t.code === preferredCountry)!.total, preferredCurrency)
                      : formatCurrency(0, preferredCurrency)}
                  </p>
                  <p className="text-xs mt-2" style={{color: 'var(--text-tertiary)'}}>
                    Cost for {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'}
                  </p>
                </div>
              </>
            ) : (
              /* Global Mode - Show all countries */
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {totalsByCountry.map(({ code, label, total }) => (
                    <div
                      key={code}
                      className="rounded-xl border px-3 py-3 min-h-[100px] flex flex-col justify-between"
                      style={{borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)'}}
                    >
                      <div className="min-w-0">
                        <span
                          className="mb-1 block h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: ITEM_CHART_COLORS[code] }}
                          aria-hidden
                        />
                        <p className="text-[10px] font-medium uppercase tracking-wider truncate" style={{color: 'var(--text-tertiary)'}}>
                          {label}
                        </p>
                      </div>
                      <p className="mt-2 text-base font-semibold tabular-nums break-words" style={{color: 'var(--text-primary)'}}>
                        {total > 0
                          ? formatCurrency(total, preferredCurrency)
                          : "—"}
                      </p>
                    </div>
                  ))}
                </div>
                {bestTotal > 0 && (
                  <p className="mt-4 text-sm text-[var(--text-secondary)]">
                    💰 Cost to Satisfy:{" "}
                    <span className="font-medium" style={{color: 'var(--accent-primary)'}}>
                      {formatCurrency(bestTotal, preferredCurrency)}
                    </span>
                  </p>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {showPromptModal && (
        <PromptInfoModal
          prompt={lastPrompt}
          onClose={() => setShowPromptModal(false)}
        />
      )}

      <SignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        onUserChange={setUser}
      />
    </main>
  );
}
